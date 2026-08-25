"use client";

import { useEffect, useRef, useState } from "react";
import { artists, createProgression, flatNames, keyLabel, profiles, scoreProgressionCandidate, sharpNames, type Artist, type HarmonicState, type SectionType } from "./harmonic-engine";
import { createChordPreview, createPerformanceIdea, scorePerformanceIdea, type PerformanceEvent, type PerformanceIdea } from "./performance-engine";

type Part = HarmonicState & { id: number; artist: Artist; section: SectionType; bars: 4; progression: string[]; localCenters: number[]; idea: PerformanceIdea };
type ActiveStep = { key: string; index: number };
type SelectedChord = { key: string; bar: number; event: PerformanceEvent };

const sectionTypes: SectionType[] = ["Intro", "Verse", "Pre-chorus", "Chorus", "Bridge", "Solo", "Outro"];
const choose = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

function harmonicPath(part: Part) {
  const centers = part.localCenters.filter((center, index) => index === 0 || center !== part.localCenters[index - 1]);
  return centers.map((center) => (part.useFlats ? flatNames : sharpNames)[center]).join(" → ");
}

function chordFingeringFor(part: Part, bar: number): PerformanceEvent {
  const chord = part.progression[bar];
  return part.idea.harmony.find((event) => event.bar === bar && event.chord === chord) ?? createChordPreview(chord);
}

function vlq(value: number) { const bytes = [value & 0x7f]; while ((value >>= 7)) bytes.unshift((value & 0x7f) | 0x80); return bytes; }
function u32(value: number) { return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]; }

function midiTrack(events: PerformanceEvent[], name: string, tempo: number, meterMap: PerformanceIdea["meterMap"]) {
  const ticksPerBeat = 96; const text = Array.from(new TextEncoder().encode(name)); const micros = Math.round(60000000 / tempo);
  const messages: { tick: number; order: number; bytes: number[] }[] = [
    { tick: 0, order: 0, bytes: [0xff, 0x03, text.length, ...text] },
    { tick: 0, order: 1, bytes: [0xff, 0x51, 0x03, (micros >>> 16) & 255, (micros >>> 8) & 255, micros & 255] },
    ...meterMap.meters.map((meter, bar) => {
      const [numerator, denominator] = meter.label.split("/").map(Number); const denominatorPower = denominator === 8 ? 3 : 2;
      return { tick: Math.round(meterMap.starts[bar] * ticksPerBeat), order: 2, bytes: [0xff, 0x58, 0x04, numerator, denominatorPower, 24, 8] };
    }),
    ...events.flatMap((event) => event.notes.flatMap((note) => [
      { tick: Math.round(event.time * ticksPerBeat), order: 4, bytes: [0x90, note.midi, Math.round(event.velocity * 96)] },
      { tick: Math.round((event.time + event.duration) * ticksPerBeat), order: 3, bytes: [0x80, note.midi, 0] },
    ])),
  ].sort((a, b) => a.tick - b.tick || a.order - b.order);
  const track: number[] = []; let previous = 0;
  messages.forEach((message) => { track.push(...vlq(message.tick - previous), ...message.bytes); previous = message.tick; });
  track.push(0, 0xff, 0x2f, 0);
  return [...Array.from(new TextEncoder().encode("MTrk")), ...u32(track.length), ...track];
}

function downloadMidi(part: Part) {
  const header = [...Array.from(new TextEncoder().encode("MThd")), 0, 0, 0, 6, 0, 1, 0, 2, 0, 96];
  const bytes = new Uint8Array([...header, ...midiTrack(part.idea.riff, "Riffizer riff", part.idea.tempo, part.idea.meterMap), ...midiTrack(part.idea.harmony, "Riffizer harmony", part.idea.tempo, part.idea.meterMap)]);
  const url = URL.createObjectURL(new Blob([bytes], { type: "audio/midi" })); const link = document.createElement("a");
  link.href = url; link.download = `${part.artist.replaceAll(" ", "-").toLowerCase()}-${part.section.toLowerCase()}-riff.mid`; link.click(); URL.revokeObjectURL(url);
}

export default function RiffizerClient() {
  const [artist, setArtist] = useState<Artist>("Nick Johnston");
  const [section, setSection] = useState<SectionType>("Verse");
  const [complexity, setComplexity] = useState(3);
  const [rhythmComplexity, setRhythmComplexity] = useState(2);
  const [modulation, setModulation] = useState(30);
  const [parts, setParts] = useState<Part[]>([]);
  const [draft, setDraft] = useState<Part | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const [activeTime, setActiveTime] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState<ActiveStep | null>(null);
  const [selectedChord, setSelectedChord] = useState<SelectedChord | null>(null);
  const [harmonyEnabled, setHarmonyEnabled] = useState(true);
  const audioContext = useRef<AudioContext | null>(null);
  const activeNodes = useRef(new Set<OscillatorNode>());
  const timers = useRef(new Set<number>());
  const transportVersion = useRef(0);
  const playingKeyRef = useRef<string | null>(null);
  const tempoOverrides = useRef(new Map<string, number>());
  const nextIdeaId = useRef(1);

  useEffect(() => () => {
    transportVersion.current += 1;
    timers.current.forEach((timer) => window.clearTimeout(timer)); timers.current.clear();
    activeNodes.current.forEach((node) => { try { node.stop(); } catch { /* already stopped */ } }); activeNodes.current.clear();
    playingKeyRef.current = null;
  }, []);

  function clearVisualState() { setFocusKey(null); setActiveBar(null); setActiveTime(null); setActiveStep(null); setSelectedChord(null); }
  function scheduleTimer(callback: () => void, delay: number) {
    let timer = 0;
    timer = window.setTimeout(() => { timers.current.delete(timer); callback(); }, Math.max(0, delay));
    timers.current.add(timer);
    return timer;
  }
  function stopPlayback(clearVisual = true) {
    const version = ++transportVersion.current;
    timers.current.forEach((timer) => window.clearTimeout(timer)); timers.current.clear();
    activeNodes.current.forEach((node) => { try { node.stop(); } catch { /* already stopped */ } }); activeNodes.current.clear();
    playingKeyRef.current = null;
    setPlayingKey(null); if (clearVisual) clearVisualState(); return version;
  }

  function generate() {
    stopPlayback();
    const previous = parts.at(-1);
    const candidateCount = complexity >= 4 ? 12 : 10;
    let selected: { harmony: ReturnType<typeof createProgression>; idea: PerformanceIdea; score: number } | null = null;
    for (let attempt = 0; attempt < candidateCount; attempt += 1) {
      const harmony = createProgression(artist, 4, section, complexity, modulation, previous);
      const idea = createPerformanceIdea(artist, section, harmony.progression, harmony.localCenters, harmony.mode, complexity, rhythmComplexity);
      const score = scoreProgressionCandidate(artist, section, harmony, previous) + scorePerformanceIdea(artist, section, idea, previous?.idea);
      if (!selected || score > selected.score) selected = { harmony, idea, score };
    }
    if (!selected) return;
    tempoOverrides.current.delete("draft");
    setDraft({ id: nextIdeaId.current++, artist, section, bars: 4, ...selected.harmony, idea: selected.idea });
  }

  function randomizeSettings() { setArtist(choose(artists)); setSection(choose(sectionTypes)); setComplexity(1 + Math.floor(Math.random() * 5)); setRhythmComplexity(Math.floor(Math.random() * 6)); setModulation(Math.round(Math.random() * 20) * 5); }
  function addDraft() { if (draft) { stopPlayback(); tempoOverrides.current.delete("draft"); setParts((current) => [...current, draft]); setDraft(null); } }
  function removePart(id: number) { const key = `part-${id}`; if (playingKeyRef.current === key || focusKey === key) stopPlayback(); tempoOverrides.current.delete(key); setParts((current) => current.filter((part) => part.id !== id)); }
  function changeTempo(part: Part, key: string, tempo: number) {
    tempoOverrides.current.set(key, tempo);
    if (key === "draft") { setDraft((current) => current ? { ...current, idea: { ...current.idea, tempo } } : current); return; }
    setParts((current) => current.map((current) => current.id === part.id ? { ...current, idea: { ...current.idea, tempo } } : current));
  }

  async function audioContextForPlay(): Promise<AudioContext | null> {
    const AudioContextConstructor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    let context = audioContext.current;
    if (!context || context.state === "closed") { context = new AudioContextConstructor(); audioContext.current = context; }
    try { if (context.state !== "running") await context.resume(); } catch { return null; }
    return context.state === "running" ? context : null;
  }

  function playEvent(context: AudioContext, event: PerformanceEvent, startTime: number, secondsPerBeat: number, strum = 0) {
    event.notes.forEach((note, index) => {
      const oscillator = context.createOscillator(); const octave = context.createOscillator(); const octaveGain = context.createGain(); const gain = context.createGain(); const filter = context.createBiquadFilter();
      const at = startTime + index * strum; const frequency = 440 * Math.pow(2, (note.midi - 69) / 12); const release = at + Math.max(0.12, event.duration * secondsPerBeat * 0.82);
      oscillator.type = "triangle"; oscillator.frequency.value = frequency; octave.type = "sine"; octave.frequency.value = frequency / 2; octaveGain.gain.value = 0.17;
      filter.type = "lowpass"; filter.frequency.value = 2550; const level = 0.057 * event.velocity;
      gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(level, at + 0.008); gain.gain.exponentialRampToValueAtTime(level * 0.35, at + 0.09); gain.gain.exponentialRampToValueAtTime(0.0001, release);
      oscillator.connect(filter); octave.connect(octaveGain).connect(filter); filter.connect(gain).connect(context.destination);
      oscillator.onended = () => activeNodes.current.delete(oscillator); octave.onended = () => activeNodes.current.delete(octave);
      activeNodes.current.add(oscillator); activeNodes.current.add(octave);
      oscillator.start(at); octave.start(at); oscillator.stop(release + 0.02); octave.stop(release + 0.02);
    });
  }

  async function playIdea(part: Part, key: string) {
    if (playingKeyRef.current === key) { stopPlayback(); return; }
    const version = stopPlayback(false); const context = await audioContextForPlay(); if (!context || version !== transportVersion.current) { if (version === transportVersion.current) clearVisualState(); return; }
    const events = part.idea.riff; const endBeat = part.idea.meterMap.totalBeats;
    const cursorEvents = [...events, ...part.idea.harmony];
    const cursorTimes = Array.from(new Set([0, ...cursorEvents.flatMap((event) => [event.time, Math.min(endBeat, event.time + event.duration)]), endBeat])).sort((a, b) => a - b);
    const barForTime = (time: number) => part.idea.meterMap.starts.reduce((bar, startAt, index) => time >= startAt ? index : bar, 0);
    const moveCursor = (time: number) => { if (version !== transportVersion.current) return; const latestHarmony = part.idea.harmony.filter((event) => event.time <= time + 0.001).at(-1); setActiveTime(time); setActiveBar(time >= endBeat ? null : latestHarmony?.bar ?? barForTime(time)); };
    const scheduleCycle = (cycleStart: number) => {
      if (version !== transportVersion.current) return;
      if (context.state !== "running") { stopPlayback(); return; }
      const secondsPerBeat = 60 / (tempoOverrides.current.get(key) ?? part.idea.tempo); const loopSeconds = endBeat * secondsPerBeat;
      events.forEach((event) => playEvent(context, event, cycleStart + event.time * secondsPerBeat, secondsPerBeat));
      if (harmonyEnabled) part.idea.harmony.forEach((event) => playEvent(context, event, cycleStart + event.time * secondsPerBeat, secondsPerBeat, 0.012));
      cursorTimes.filter((time) => time < endBeat).forEach((time) => scheduleTimer(() => moveCursor(time), (cycleStart + time * secondsPerBeat - context.currentTime) * 1000));
      const nextStart = cycleStart + loopSeconds;
      scheduleTimer(() => scheduleCycle(nextStart), (nextStart - context.currentTime - 0.28) * 1000);
    };
    playingKeyRef.current = key; setPlayingKey(key); setFocusKey(key); setActiveStep(null); setActiveTime(null); setActiveBar(null); setSelectedChord(null);
    scheduleCycle(context.currentTime + 0.05);
  }

  async function stepIdea(part: Part, key: string, direction: number) {
    const events = part.idea.riff; if (!events.length) return;
    const version = stopPlayback(false); setSelectedChord(null); const current = activeStep?.key === key ? activeStep.index : direction > 0 ? -1 : 0; const index = mod(current + direction, events.length); const event = events[index];
    const context = await audioContextForPlay(); if (!context || version !== transportVersion.current) return;
    playEvent(context, event, context.currentTime + 0.03, 60 / part.idea.tempo);
    const bar = part.idea.meterMap.starts.reduce((found, startAt, barIndex) => event.time >= startAt ? barIndex : found, 0);
    setFocusKey(key); setActiveBar(bar); setActiveTime(null); setActiveStep({ key, index });
  }

  async function auditionChord(part: Part, key: string, bar: number) {
    const event = chordFingeringFor(part, bar); const version = stopPlayback(); setSelectedChord({ key, bar, event }); setFocusKey(key); setActiveBar(bar); setActiveStep(null); setActiveTime(null);
    const context = await audioContextForPlay(); if (!context || version !== transportVersion.current) return;
    playEvent(context, event, context.currentTime + 0.02, 60 / part.idea.tempo, 0.012);
  }

  function toggleHarmony() { stopPlayback(); setHarmonyEnabled((enabled) => !enabled); }

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#top" aria-label="Riffizer home"><span className="brand-mark">⌁</span>Riffizer</a><span className="topbar-label">chord chart + guitar riff generator</span><button className="new-song" onClick={() => { stopPlayback(); tempoOverrides.current.clear(); setParts([]); setDraft(null); }}>＋ New song</button></header>
    <div className="layout" id="top"><aside className="sidebar" aria-label="Idea controls"><p className="eyebrow">New idea</p><div className="field-stack"><label htmlFor="artist">Artist</label><select id="artist" value={artist} onChange={(event) => setArtist(event.target.value as Artist)}>{artists.map((name) => <option key={name}>{name}</option>)}</select></div><div className="field-stack"><label htmlFor="section">Part</label><select id="section" value={section} onChange={(event) => setSection(event.target.value as SectionType)}>{sectionTypes.map((type) => <option key={type}>{type}</option>)}</select></div><div className="field-stack"><label>Format</label><div className="idea-format">4 bars <span>·</span> chart + riff</div></div><div className="field-stack complexity"><label htmlFor="complexity">Complexity <output>{complexity}</output></label><input id="complexity" type="range" min="1" max="5" value={complexity} onChange={(event) => setComplexity(Number(event.target.value))} /><div className="complexity-scale"><span>direct</span><span>colorful</span></div></div><div className="field-stack rhythm-complexity"><label htmlFor="rhythm-complexity">Chord timing &amp; meter <output>{["0 · basic", "1 · bars", "2 · offbeat", "3 · split", "4 · meter", "5 · mixed"][rhythmComplexity]}</output></label><input id="rhythm-complexity" type="range" min="0" max="5" value={rhythmComplexity} onChange={(event) => setRhythmComplexity(Number(event.target.value))} /><div className="complexity-scale"><span>bar starts</span><span>mixed meters</span></div></div><div className="field-stack modulation"><label htmlFor="modulation">Inside-part modulation <output>{modulation}%</output></label><input id="modulation" type="range" min="0" max="100" step="5" value={modulation} onChange={(event) => setModulation(Number(event.target.value))} /><div className="complexity-scale"><span>stable</span><span>adventurous</span></div></div><div className="generate-row"><button className="generate" onClick={generate}><span>✦</span> Generate idea</button><button className="random-settings" onClick={randomizeSettings} aria-label="Randomize settings">⚄</button></div><p className="profile-note"><span style={{ background: profiles[artist].color }} />{profiles[artist].note}</p></aside>
      <section className="workspace" aria-label="Song arrangement"><div className="conversation-header"><div><p className="eyebrow">Your song</p><h1>{parts.length ? `${parts.length} idea${parts.length === 1 ? "" : "s"} arranged` : "Generate a guitar idea"}</h1></div></div><div className="conversation">{!parts.length && !draft && <div className="empty-state"><div className="empty-orb">⌁</div><h2>Chart first. Riffizer second.</h2><p>Every idea keeps its four-chord chart, then turns that harmony into an original, profile-aware guitar riff.</p></div>}{parts.map((part, index) => { const key = `part-${part.id}`; return <IdeaCard key={part.id} part={part} number={index + 1} isPlaying={playingKey === key} active={focusKey === key ? activeBar : null} activeTime={playingKey === key ? activeTime : null} activeStep={activeStep?.key === key ? activeStep : null} selectedChord={selectedChord?.key === key ? selectedChord : null} harmonyEnabled={harmonyEnabled} onToggleHarmony={toggleHarmony} onPlay={() => { void playIdea(part, key); }} onStep={(direction) => { void stepIdea(part, key, direction); }} onAuditionChord={(bar) => { void auditionChord(part, key, bar); }} onTempoChange={(tempo) => changeTempo(part, key, tempo)} onRemove={() => removePart(part.id)} />; })}{draft && <article className="draft-card"><div className="message-avatar assistant">⌁</div><div className="draft-body"><IdeaCard part={draft} active={focusKey === "draft" ? activeBar : null} activeTime={playingKey === "draft" ? activeTime : null} activeStep={activeStep?.key === "draft" ? activeStep : null} selectedChord={selectedChord?.key === "draft" ? selectedChord : null} isPlaying={playingKey === "draft"} harmonyEnabled={harmonyEnabled} onToggleHarmony={toggleHarmony} onPlay={() => { void playIdea(draft, "draft"); }} onStep={(direction) => { void stepIdea(draft, "draft", direction); }} onAuditionChord={(bar) => { void auditionChord(draft, "draft", bar); }} onTempoChange={(tempo) => changeTempo(draft, "draft", tempo)} /><div className="draft-actions"><button className="quiet-button" onClick={generate}>↻ Regenerate</button><button className="add-button" onClick={addDraft}>Add to song →</button></div></div></article>}</div></section>
    </div>
  </main>;
}

function IdeaCard({ part, number, isPlaying, active, activeTime, activeStep, selectedChord, harmonyEnabled, onToggleHarmony, onPlay, onStep, onRemove, onAuditionChord, onTempoChange }: { part: Part; number?: number; isPlaying: boolean; active: number | null; activeTime: number | null; activeStep: ActiveStep | null; selectedChord: SelectedChord | null; harmonyEnabled: boolean; onToggleHarmony: () => void; onPlay: () => void; onStep: (direction: number) => void; onRemove?: () => void; onAuditionChord: (bar: number) => void; onTempoChange: (tempo: number) => void }) {
  const path = harmonicPath(part); const events = part.idea.riff; const meterLabel = Array.from(new Set(part.idea.meterMap.meters.map((meter) => meter.label))).join(" / ");
  const liveIndex = isPlaying && activeTime !== null ? events.findIndex((event) => activeTime >= event.time - 0.001 && activeTime < event.time + event.duration - 0.001) : -1;
  const activeIndex = activeStep ? activeStep.index : liveIndex >= 0 ? liveIndex : null;
  return <article className={number ? "song-part" : "idea-card"}>{number && <div className="message-avatar user">{String(number).padStart(2, "0")}</div>}<div className="part-body idea-body"><div className="part-topline"><div><div className="part-meta"><span className="active-dot" style={{ background: profiles[part.artist].color }} />{part.artist} <span>·</span> {part.section}</div><p className="harmony-center">4-bar · {meterLabel} · {keyLabel(part)}{path.includes("→") ? ` → ${path.split(" → ").at(-1)}` : ""}</p></div>{onRemove && <button className="remove" onClick={onRemove} aria-label={`Remove ${part.section}`}>×</button>}</div><div className="chord-chart" aria-label={`Chord chart in ${meterLabel}`}>{part.progression.map((chord, bar) => <button className={active === bar ? "chart-chord active" : "chart-chord"} key={`${chord}-${bar}`} onClick={() => onAuditionChord(bar)} aria-label={`Play ${chord} and show its guitar shape`} aria-pressed={selectedChord?.bar === bar}>{chord}</button>)}</div><div className="idea-controls"><button className={`play-idea ${isPlaying ? "is-playing" : ""}`} onClick={onPlay}>{isPlaying ? "■ Stop" : "▶ Loop riff"}</button><button className={`harmony-toggle ${harmonyEnabled ? "is-on" : ""}`} onClick={onToggleHarmony} aria-pressed={harmonyEnabled}>{harmonyEnabled ? "♬ Harmony on" : "♬ Harmony muted"}</button><div className="export-controls"><button className="midi-button" onClick={() => downloadMidi(part)}>↓ MIDI</button><label className="tempo-control"><span>Tempo</span><input type="range" min="70" max="190" value={part.idea.tempo} onChange={(event) => onTempoChange(Number(event.target.value))} aria-label={`${part.section} tempo`} /><output>{part.idea.tempo}</output></label></div></div><div className="riff-navigator" aria-label="Riff note navigator"><button className="fret-nav previous" onClick={() => onStep(-1)} aria-label="Previous riff event">‹</button><div className="riff-fret-stage"><RiffTimeline events={events} activeBar={active} activeIndex={activeIndex} meterMap={part.idea.meterMap} /><Fretboard events={events} activeTime={activeTime} activeStep={activeStep} chordPreview={selectedChord?.event} isPlaying={isPlaying} /></div><button className="fret-nav next" onClick={() => onStep(1)} aria-label="Next riff event">›</button></div></div></article>;
}

function RiffTimeline({ events, activeBar, activeIndex, meterMap }: { events: PerformanceEvent[]; activeBar: number | null; activeIndex: number | null; meterMap: PerformanceIdea["meterMap"] }) {
  const activeTick = activeIndex === null ? -1 : Math.round((events[activeIndex]?.time ?? -1) * 4);
  const totalTicks = Math.round(meterMap.totalBeats * 4); const barStarts = meterMap.starts.map((start) => Math.round(start * 4));
  const activeStart = activeBar === null ? -1 : barStarts[activeBar]; const activeEnd = activeBar === null ? -1 : activeBar === meterMap.meters.length - 1 ? totalTicks : barStarts[activeBar + 1];
  return <div className="riff-timeline" style={{ gridTemplateColumns: `repeat(${totalTicks}, minmax(0, 1fr))` }} aria-label="16th-note riff timeline">{Array.from({ length: totalTicks }, (_, tick) => <span key={tick} className={`${barStarts.includes(tick) ? "bar-start" : ""} ${activeBar !== null && tick >= activeStart && tick < activeEnd ? "bar-active" : ""} ${events.some((event) => Math.round(event.time * 4) === tick) ? "note" : ""} ${activeTick === tick ? "active-step" : ""}`}></span>)}</div>;
}

function Fretboard({ events, activeTime, activeStep, chordPreview, isPlaying }: { events: PerformanceEvent[]; activeTime: number | null; activeStep: ActiveStep | null; chordPreview?: PerformanceEvent; isPlaying: boolean }) {
  const selectedEvent = activeStep ? events[activeStep.index] : undefined;
  const playingEvents = isPlaying && activeTime !== null ? events.filter((event) => activeTime >= event.time - 0.001 && activeTime < event.time + event.duration - 0.001) : [];
  const displayEvents = selectedEvent ? [selectedEvent] : playingEvents.length ? playingEvents : chordPreview ? [chordPreview] : [];
  const notes = Array.from(new Map(displayEvents.flatMap((event) => event.notes).map((note) => [`${note.string}-${note.fret}`, note])).values());
  const strings = ["e", "B", "G", "D", "A", "E"];
  return <section className={`fretboard-panel keyer-board riff ${notes.length ? "has-active-note" : "is-idle"}`} aria-label="Riff fretboard"><div className="fret-numbers"><span></span>{Array.from({ length: 13 }, (_, fret) => <span key={fret}>{[0, 3, 5, 7, 9, 12].includes(fret) ? fret : ""}</span>)}</div><div className="fretboard">{strings.map((name, string) => <div className="fret-string" key={name}><span className="string-name">{name}</span>{Array.from({ length: 13 }, (_, fret) => <span key={fret} className={`fret ${notes.some((note) => note.string === string && note.fret === fret) ? "active" : ""}`}></span>)}</div>)}</div></section>;
}
