"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { artists, createProgression, flatNames, keyLabel, profiles, scoreProgressionCandidate, sharpNames, type Artist, type HarmonicState, type SectionType } from "./harmonic-engine";
import { completePerformanceIdea, createChordPreview, createPerformanceIdea, regenerateRiffIdea, scorePerformanceIdea, type PerformanceEvent, type PerformanceIdea } from "./performance-engine";
import { prefetchSampleAssets, SampleAuditionEngine, type GuitarSampleTone, type SampleInstrument } from "./sample-audition-engine";

type Part = HarmonicState & { id: number; artist: Artist; section: SectionType; bars: number; progression: string[]; localCenters: number[]; idea: PerformanceIdea };
type ActiveStep = { key: string; index: number };
type SelectedChord = { key: string; bar: number; event: PerformanceEvent };
type FretboardTrack = "riff" | "chordRhythm" | "bass";
type RestoredPluginState = {
  part?: Part;
  settings?: { harmonyEnabled?: boolean; chordRhythmEnabled?: boolean; riffEnabled?: boolean; bassEnabled?: boolean; drumsEnabled?: boolean; fretboardTrack?: FretboardTrack };
  appState?: { parts?: Part[]; draft?: Part | null; artist?: Artist; section?: SectionType; bars?: number; complexity?: number; rhythmComplexity?: number; modulation?: number };
};

const sectionTypes: SectionType[] = ["Intro", "Verse", "Pre-chorus", "Chorus", "Bridge", "Solo", "Outro"];
const profileStyles: Record<Artist, { label: string; description: string }> = {
  "Nick Johnston": { label: "Melodic Prog Rock", description: "Melody-led modern progressive rock: spacious harmony, lyrical lead shapes, and controlled chromatic color. Inspired by the high-level compositional approach associated with Nick Johnston." },
  "Moray Pringle": { label: "Groove Fusion Rock", description: "Energetic rock-fusion with bluesy lift, direct hooks, and confident arrivals. Inspired by the high-level playing and writing tendencies associated with Moray Pringle." },
  Owane: { label: "Modern Jazz-Prog Fusion", description: "Bright extended harmony, pedal-aware motion, and composed rhythmic detail. Inspired by the high-level composer-first fusion approach associated with Owane." },
  Waxamilion: { label: "Glitch Fusion / Math Groove", description: "Asymmetric groove, pedal anchors, colorful planing, and deliberate space. Inspired by the high-level electronic-leaning fusion language associated with Waxamilion." },
  CHON: { label: "Clean Math Rock", description: "Interlocking clean-guitar rhythm, bright diatonic color, and compact common-tone voicings. Inspired by the high-level math-rock approach associated with CHON." },
  "Marco Sfogli": { label: "Cinematic Prog Metal", description: "Lyrical progressive-metal phrasing with clear hooks, dramatic lift, and decisive returns. Inspired by the high-level melodic approach associated with Marco Sfogli." },
  "Guthrie Govan": { label: "Virtuosic Fusion", description: "Elastic blues-fusion vocabulary, melodic landings, and earned chromatic turns. Inspired by the high-level improvisational approach associated with Guthrie Govan." },
  "Greg Howe": { label: "Funk Shred Fusion", description: "Rhythmic fusion with compact legato, targeted chord tones, and a strong pocket. Inspired by the high-level approach associated with Greg Howe." },
  "Yngwie Malmsteen": { label: "Neoclassical Shred Metal", description: "Harmonic-minor color, pedal tones, dramatic sequences, and strong minor-key cadences. Inspired by the high-level neoclassical-metal language associated with Yngwie Malmsteen." },
};
const choose = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

function guitarToneForArtist(artist: Artist): GuitarSampleTone {
  if (artist === "CHON") return "acoustic";
  if (artist === "Nick Johnston" || artist === "Owane") return "nylon";
  return "electric";
}

type JuceListenerToken = [string, number];
type JuceBridge = { backend?: {
  emitEvent?: (eventId: string, payload: unknown) => void;
  addEventListener?: (eventId: string, listener: (payload: unknown) => void) => JuceListenerToken;
  removeEventListener?: (token: JuceListenerToken) => void;
} };
function juceBackend() {
  if (typeof window === "undefined") return undefined;
  return (window as typeof window & { __JUCE__?: JuceBridge }).__JUCE__?.backend;
}
function emitJuceEvent(eventId: string, payload: unknown) { juceBackend()?.emitEvent?.(eventId, payload); }

function harmonicPath(part: Part) {
  const centers = part.localCenters.filter((center, index) => index === 0 || center !== part.localCenters[index - 1]);
  return centers.map((center) => (part.useFlats ? flatNames : sharpNames)[center]).join(" → ");
}

function chordFingeringFor(part: Part, bar: number, chordRhythmEnabled = false): PerformanceEvent {
  const chord = part.progression[bar];
  const lane = chordRhythmEnabled ? part.idea.chordRhythm : part.idea.harmony;
  return lane.find((event) => event.bar === bar && event.chord === chord) ?? createChordPreview(chord);
}

function fretboardEvents(part: Part, track: FretboardTrack) {
  if (track === "chordRhythm") return part.idea.chordRhythm ?? [];
  if (track === "bass") return part.idea.bass ?? [];
  return part.idea.riff;
}

function pillSliderStyle(value: number, min: number, max: number, accent: string) {
  return { "--range-fill": `${((value - min) / (max - min)) * 100}%`, "--range-accent": accent } as CSSProperties;
}

function vlq(value: number) { const bytes = [value & 0x7f]; while ((value >>= 7)) bytes.unshift((value & 0x7f) | 0x80); return bytes; }
function u32(value: number) { return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]; }

function midiTrack(events: PerformanceEvent[], name: string, tempo: number, meterMap: PerformanceIdea["meterMap"], channel = 1) {
  const ticksPerBeat = 96; const text = Array.from(new TextEncoder().encode(name)); const micros = Math.round(60000000 / tempo);
  const noteOn = 0x90 | (channel - 1); const noteOff = 0x80 | (channel - 1);
  const messages: { tick: number; order: number; bytes: number[] }[] = [
    { tick: 0, order: 0, bytes: [0xff, 0x03, text.length, ...text] },
    { tick: 0, order: 1, bytes: [0xff, 0x51, 0x03, (micros >>> 16) & 255, (micros >>> 8) & 255, micros & 255] },
    ...meterMap.meters.map((meter, bar) => {
      const [numerator, denominator] = meter.label.split("/").map(Number); const denominatorPower = denominator === 8 ? 3 : 2;
      return { tick: Math.round(meterMap.starts[bar] * ticksPerBeat), order: 2, bytes: [0xff, 0x58, 0x04, numerator, denominatorPower, 24, 8] };
    }),
    ...events.flatMap((event) => event.notes.flatMap((note) => [
      { tick: Math.round(event.time * ticksPerBeat), order: 4, bytes: [noteOn, note.midi, Math.round(event.velocity * 96)] },
      { tick: Math.round((event.time + event.duration) * ticksPerBeat), order: 3, bytes: [noteOff, note.midi, 0] },
    ])),
  ].sort((a, b) => a.tick - b.tick || a.order - b.order);
  const track: number[] = []; let previous = 0;
  messages.forEach((message) => { track.push(...vlq(message.tick - previous), ...message.bytes); previous = message.tick; });
  track.push(0, 0xff, 0x2f, 0);
  return [...Array.from(new TextEncoder().encode("MTrk")), ...u32(track.length), ...track];
}

function downloadMidi(part: Part) {
  const style = profileStyles[part.artist].label;
  const chords = part.progression.join(", ");
  const header = [...Array.from(new TextEncoder().encode("MThd")), 0, 0, 0, 6, 0, 1, 0, 5, 0, 96];
  const bytes = new Uint8Array([
    ...header,
    ...midiTrack(part.idea.riff, `${style} · riff · ${chords}`, part.idea.tempo, part.idea.meterMap),
    ...midiTrack(part.idea.harmony, `${style} · chords · ${chords}`, part.idea.tempo, part.idea.meterMap),
    ...midiTrack(part.idea.chordRhythm, `${style} · chord rhythm · ${chords}`, part.idea.tempo, part.idea.meterMap),
    ...midiTrack(part.idea.bass ?? [], `${style} · bass · ${chords}`, part.idea.tempo, part.idea.meterMap),
    ...midiTrack(part.idea.drums ?? [], `${style} · drums · ${chords}`, part.idea.tempo, part.idea.meterMap, 10),
  ]);
  const url = URL.createObjectURL(new Blob([bytes], { type: "audio/midi" })); const link = document.createElement("a");
  link.href = url; link.download = `${style.replaceAll(" ", "-").toLowerCase()}-${part.progression.join("-").replaceAll("/", "-")}.mid`; link.click(); URL.revokeObjectURL(url);
}

export default function RiffizerClient() {
  const [artist, setArtist] = useState<Artist>("Nick Johnston");
  const [section, setSection] = useState<SectionType>("Verse");
  const [bars, setBars] = useState(4);
  const [complexity, setComplexity] = useState(3);
  const [rhythmComplexity, setRhythmComplexity] = useState(2);
  const [modulation, setModulation] = useState(30);
  const [parts, setParts] = useState<Part[]>([]);
  const [draft, setDraft] = useState<Part | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [auditionErrorKey, setAuditionErrorKey] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const [activeTime, setActiveTime] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState<ActiveStep | null>(null);
  const [selectedChord, setSelectedChord] = useState<SelectedChord | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [profileInfoOpen, setProfileInfoOpen] = useState(false);
  const [harmonyEnabled, setHarmonyEnabled] = useState(true);
  const [chordRhythmEnabled, setChordRhythmEnabled] = useState(false);
  const [riffEnabled, setRiffEnabled] = useState(true);
  const [bassEnabled, setBassEnabled] = useState(false);
  const [drumsEnabled, setDrumsEnabled] = useState(false);
  const [fretboardTrack, setFretboardTrack] = useState<FretboardTrack>("riff");
  const audioContext = useRef<AudioContext | null>(null);
  const sampleEngine = useRef<SampleAuditionEngine | null>(null);
  const timers = useRef(new Set<number>());
  const transportVersion = useRef(0);
  const playingKeyRef = useRef<string | null>(null);
  const tempoOverrides = useRef(new Map<string, number>());
  const nextIdeaId = useRef(1);

  useEffect(() => { void prefetchSampleAssets([guitarToneForArtist(artist), "bass", "drums"]); }, [artist]);

  useEffect(() => {
    const current = draft ?? parts.at(-1);
    if (current) emitJuceEvent("riffizerIdea", {
      part: current,
      style: profileStyles[current.artist].label,
      settings: { harmonyEnabled, chordRhythmEnabled, riffEnabled, bassEnabled, drumsEnabled, fretboardTrack },
      appState: { parts, draft, artist, section, bars, complexity, rhythmComplexity, modulation },
    });
  }, [draft, parts, artist, section, bars, complexity, rhythmComplexity, modulation, harmonyEnabled, chordRhythmEnabled, riffEnabled, bassEnabled, drumsEnabled, fretboardTrack]);

  useEffect(() => {
    const backend = juceBackend();
    if (!backend?.addEventListener) return;
    const token = backend.addEventListener("riffizerRestoreIdea", (payload) => {
      const restored = payload as RestoredPluginState;
      if (!restored?.part?.idea) return;
      const app = restored.appState;
      const restoredComplexity = typeof app?.complexity === "number" ? app.complexity : 3;
      const restoredRhythmComplexity = typeof app?.rhythmComplexity === "number" ? app.rhythmComplexity : 2;
      const completePart = (part: Part) => ({ ...part, idea: completePerformanceIdea(part.artist, part.section, part.progression, restoredComplexity, restoredRhythmComplexity, part.idea) });
      const restoredParts = (Array.isArray(app?.parts) ? app.parts : []).map(completePart);
      const fallbackPart = completePart(restored.part);
      const restoredDraft = app?.draft === null ? null : app?.draft?.idea ? completePart(app.draft) : restoredParts.length ? null : fallbackPart;
      setParts(restoredParts);
      setDraft(restoredDraft ?? null);
      const current = restoredDraft ?? restoredParts.at(-1) ?? restored.part;
      setArtist(app?.artist ?? current.artist);
      setSection(app?.section ?? current.section);
      setBars(app?.bars ?? current.bars);
      if (typeof app?.complexity === "number") setComplexity(app.complexity);
      if (typeof app?.rhythmComplexity === "number") setRhythmComplexity(app.rhythmComplexity);
      if (typeof app?.modulation === "number") setModulation(app.modulation);
      if (typeof restored.settings?.harmonyEnabled === "boolean") setHarmonyEnabled(restored.settings.harmonyEnabled);
      if (typeof restored.settings?.chordRhythmEnabled === "boolean") setChordRhythmEnabled(restored.settings.chordRhythmEnabled);
      if (typeof restored.settings?.riffEnabled === "boolean") setRiffEnabled(restored.settings.riffEnabled);
      if (typeof restored.settings?.bassEnabled === "boolean") setBassEnabled(restored.settings.bassEnabled);
      if (typeof restored.settings?.drumsEnabled === "boolean") setDrumsEnabled(restored.settings.drumsEnabled);
      if (["riff", "chordRhythm", "bass"].includes(restored.settings?.fretboardTrack ?? "")) setFretboardTrack(restored.settings!.fretboardTrack!);
      nextIdeaId.current = Math.max(1, ...restoredParts.map((part) => part.id + 1), restoredDraft ? restoredDraft.id + 1 : 1);
    });
    emitJuceEvent("riffizerRestoreReady", null);
    return () => backend.removeEventListener?.(token);
  }, []);

  useEffect(() => {
    const backend = juceBackend();
    if (!backend?.addEventListener) return;
    const token = backend.addEventListener("riffizerHostTempo", (payload) => {
      const value = typeof payload === "number" ? payload : Number(payload);
      if (!Number.isFinite(value) || value < 20 || value > 400) return;
      const tempo = Math.round(value);
      tempoOverrides.current.clear();
      setDraft((current) => current && current.idea.tempo !== tempo ? { ...current, idea: { ...current.idea, tempo } } : current);
      setParts((current) => {
        let changed = false;
        const next = current.map((part) => {
          if (part.idea.tempo === tempo) return part;
          changed = true;
          return { ...part, idea: { ...part.idea, tempo } };
        });
        return changed ? next : current;
      });
    });
    return () => backend.removeEventListener?.(token);
  }, []);

  useEffect(() => () => {
    transportVersion.current += 1;
    timers.current.forEach((timer) => window.clearTimeout(timer)); timers.current.clear();
    sampleEngine.current?.dispose(); sampleEngine.current = null;
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
    sampleEngine.current?.stopAll();
    playingKeyRef.current = null;
    setPlayingKey(null); setLoadingKey(null); if (clearVisual) clearVisualState(); return version;
  }

  function generate() {
    stopPlayback();
    const previous = parts.at(-1);
    const candidateCount = complexity >= 4 ? 12 : 10;
    let selected: { harmony: ReturnType<typeof createProgression>; idea: PerformanceIdea; score: number } | null = null;
    for (let attempt = 0; attempt < candidateCount; attempt += 1) {
      const harmony = createProgression(artist, bars, section, complexity, modulation, previous);
      const idea = createPerformanceIdea(artist, section, harmony.progression, harmony.localCenters, harmony.mode, complexity, rhythmComplexity);
      const score = scoreProgressionCandidate(artist, section, harmony, previous) + scorePerformanceIdea(artist, section, idea, previous?.idea);
      if (!selected || score > selected.score) selected = { harmony, idea, score };
    }
    if (!selected) return;
    tempoOverrides.current.delete("draft");
    setDraft({ id: nextIdeaId.current++, artist, section, bars, ...selected.harmony, idea: selected.idea });
  }

  function regenerateRiff() {
    if (!draft) return;
    stopPlayback();
    const candidateCount = complexity >= 4 ? 12 : 10;
    let selected: PerformanceIdea | null = null;
    let highestScore = -Infinity;
    for (let attempt = 0; attempt < candidateCount; attempt += 1) {
      const idea = regenerateRiffIdea(draft.artist, draft.section, draft.progression, draft.localCenters, draft.mode, complexity, draft.idea);
      const score = scorePerformanceIdea(draft.artist, draft.section, idea, parts.at(-1)?.idea);
      if (score > highestScore) { highestScore = score; selected = idea; }
    }
    if (selected) setDraft((current) => current ? { ...current, idea: selected } : current);
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

  function sampleEngineFor(context: AudioContext) {
    if (!sampleEngine.current || sampleEngine.current.context !== context) {
      sampleEngine.current?.dispose();
      sampleEngine.current = new SampleAuditionEngine(context);
    }
    return sampleEngine.current;
  }

  function playEvent(engine: SampleAuditionEngine, tone: GuitarSampleTone, event: PerformanceEvent, startTime: number, secondsPerBeat: number, strum = 0, level = .2) {
    event.notes.forEach((note, index) => engine.playPitched(tone, note.midi, startTime + index * strum, Math.max(.1, event.duration * secondsPerBeat * .9), event.velocity, level));
  }

  function playBassEvent(engine: SampleAuditionEngine, event: PerformanceEvent, startTime: number, secondsPerBeat: number) {
    event.notes.forEach((note) => engine.playPitched("bass", note.midi, startTime, Math.max(.12, event.duration * secondsPerBeat * .94), event.velocity, .27));
  }

  function playDrumEvent(engine: SampleAuditionEngine, event: PerformanceEvent, startTime: number) {
    event.notes.forEach((note) => engine.playDrum(note.midi, startTime, event.velocity));
  }

  async function playIdea(part: Part, key: string) {
    if (playingKeyRef.current === key) { stopPlayback(); return; }
    const version = stopPlayback(false);
    playingKeyRef.current = key; setPlayingKey(key); setLoadingKey(key); setAuditionErrorKey(null); setFocusKey(key); setActiveStep(null); setActiveTime(null); setActiveBar(null); setSelectedChord(null);
    const context = await audioContextForPlay();
    if (!context || version !== transportVersion.current) { if (version === transportVersion.current) { stopPlayback(); setAuditionErrorKey(key); } return; }
    const leadEvents = riffEnabled ? part.idea.riff : [];
    const accompaniment = chordRhythmEnabled ? part.idea.chordRhythm : part.idea.harmony;
    const bassEvents = bassEnabled ? part.idea.bass ?? [] : [];
    const drumEvents = drumsEnabled ? part.idea.drums ?? [] : [];
    const events = [...leadEvents, ...(harmonyEnabled ? accompaniment : []), ...bassEvents, ...drumEvents]; const endBeat = part.idea.meterMap.totalBeats;
    if (!events.length) { stopPlayback(); return; }
    const tone = guitarToneForArtist(part.artist); const engine = sampleEngineFor(context);
    const instruments: SampleInstrument[] = [tone];
    if (bassEvents.length) instruments.push("bass");
    if (drumEvents.length) instruments.push("drums");
    try {
      await engine.load(instruments);
      if (context.state !== "running") await context.resume();
      if (context.state !== "running") throw new Error("Audio context did not resume");
    } catch {
      if (version === transportVersion.current) { stopPlayback(); setAuditionErrorKey(key); }
      return;
    }
    if (version !== transportVersion.current) return;
    setLoadingKey(null);
    const cursorEvents = events;
    const cursorTimes = Array.from(new Set([0, ...cursorEvents.flatMap((event) => [event.time, Math.min(endBeat, event.time + event.duration)]), endBeat])).sort((a, b) => a - b);
    const barForTime = (time: number) => part.idea.meterMap.starts.reduce((bar, startAt, index) => time >= startAt ? index : bar, 0);
    const moveCursor = (time: number) => { if (version !== transportVersion.current) return; const latestHarmony = part.idea.harmony.filter((event) => event.time <= time + 0.001).at(-1); setActiveTime(time); setActiveBar(time >= endBeat ? null : latestHarmony?.bar ?? barForTime(time)); };
    const scheduleCycle = (cycleStart: number) => {
      if (version !== transportVersion.current) return;
      if (context.state !== "running") { stopPlayback(); return; }
      const secondsPerBeat = 60 / (tempoOverrides.current.get(key) ?? part.idea.tempo); const loopSeconds = endBeat * secondsPerBeat;
      leadEvents.forEach((event) => playEvent(engine, tone, event, cycleStart + event.time * secondsPerBeat, secondsPerBeat, 0, .21));
      if (harmonyEnabled) accompaniment.forEach((event) => playEvent(engine, tone, event, cycleStart + event.time * secondsPerBeat, secondsPerBeat, chordRhythmEnabled ? 0.009 : 0.012, chordRhythmEnabled ? .13 : .1));
      bassEvents.forEach((event) => playBassEvent(engine, event, cycleStart + event.time * secondsPerBeat, secondsPerBeat));
      drumEvents.forEach((event) => playDrumEvent(engine, event, cycleStart + event.time * secondsPerBeat));
      cursorTimes.filter((time) => time < endBeat).forEach((time) => scheduleTimer(() => moveCursor(time), (cycleStart + time * secondsPerBeat - context.currentTime) * 1000));
      const nextStart = cycleStart + loopSeconds;
      scheduleTimer(() => scheduleCycle(nextStart), (nextStart - context.currentTime - 0.28) * 1000);
    };
    scheduleCycle(context.currentTime + 0.05);
  }

  async function stepIdea(part: Part, key: string, direction: number) {
    const events = fretboardEvents(part, fretboardTrack); if (!events.length) return;
    const version = stopPlayback(false); setSelectedChord(null); const current = activeStep?.key === key ? activeStep.index : direction > 0 ? -1 : 0; const index = mod(current + direction, events.length); const event = events[index];
    const context = await audioContextForPlay(); if (!context || version !== transportVersion.current) return;
    const engine = sampleEngineFor(context); const instrument: SampleInstrument = fretboardTrack === "bass" ? "bass" : guitarToneForArtist(part.artist);
    try { await engine.load([instrument]); if (context.state !== "running") await context.resume(); } catch { return; }
    if (version !== transportVersion.current) return;
    if (fretboardTrack === "bass") playBassEvent(engine, event, context.currentTime + .03, 60 / part.idea.tempo);
    else playEvent(engine, guitarToneForArtist(part.artist), event, context.currentTime + 0.03, 60 / part.idea.tempo);
    const bar = part.idea.meterMap.starts.reduce((found, startAt, barIndex) => event.time >= startAt ? barIndex : found, 0);
    setFocusKey(key); setActiveBar(bar); setActiveTime(null); setActiveStep({ key, index });
  }

  async function auditionChord(part: Part, key: string, bar: number) {
    const event = chordFingeringFor(part, bar, chordRhythmEnabled); const version = stopPlayback(); setFretboardTrack("chordRhythm"); setSelectedChord({ key, bar, event }); setFocusKey(key); setActiveBar(bar); setActiveStep(null); setActiveTime(null);
    const context = await audioContextForPlay(); if (!context || version !== transportVersion.current) return;
    const tone = guitarToneForArtist(part.artist); const engine = sampleEngineFor(context);
    try { await engine.load([tone]); if (context.state !== "running") await context.resume(); } catch { return; }
    if (version !== transportVersion.current) return;
    playEvent(engine, tone, event, context.currentTime + 0.02, 60 / part.idea.tempo, 0.012);
  }

  function toggleHarmony() { stopPlayback(); setHarmonyEnabled((enabled) => !enabled); }
  function toggleChordRhythm() {
    stopPlayback();
    setChordRhythmEnabled((enabled) => {
      const next = !enabled;
      if (next && harmonyEnabled) setRiffEnabled(false);
      return next;
    });
  }
  function toggleRiff() { stopPlayback(); setRiffEnabled((enabled) => !enabled); }
  function toggleBass() { stopPlayback(); setBassEnabled((enabled) => !enabled); }
  function toggleDrums() { stopPlayback(); setDrumsEnabled((enabled) => !enabled); }
  async function copyChordNames(part: Part, key: string) {
    const text = part.progression.join(", ");
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const area = document.createElement("textarea"); area.value = text; area.style.position = "fixed"; area.style.opacity = "0";
        document.body.append(area); area.select(); document.execCommand("copy"); area.remove();
      }
      setCopiedKey(key); window.setTimeout(() => setCopiedKey((current) => current === key ? null : current), 1600);
    } catch { /* Clipboard access can be denied outside a user gesture. */ }
  }

  return <main className="app-shell">
    <header className="topbar"><button className="brand" onClick={() => setProfileInfoOpen((open) => !open)} aria-expanded={profileInfoOpen} aria-controls="profile-info"><span className="brand-mark">⌁</span>Riffizer</button>{profileInfoOpen && <div className="profile-popover" id="profile-info" role="status"><p className="eyebrow">Selected profile</p><strong>{profileStyles[artist].label}</strong><p>{profileStyles[artist].description}</p></div>}<span className="topbar-label">chord chart + guitar riff generator</span><button className="new-song" onClick={() => { stopPlayback(); tempoOverrides.current.clear(); setParts([]); setDraft(null); emitJuceEvent("riffizerClearIdea", null); }}>＋ New song</button></header>
    <div className="layout" id="top"><aside className="sidebar" aria-label="Idea controls"><p className="eyebrow">New idea</p><div className="field-stack"><label htmlFor="artist">Style profile</label><select id="artist" value={artist} onChange={(event) => setArtist(event.target.value as Artist)}>{artists.map((name) => <option key={name} value={name}>{profileStyles[name].label}</option>)}</select></div><div className="field-stack"><label htmlFor="section">Part</label><select id="section" value={section} onChange={(event) => setSection(event.target.value as SectionType)}>{sectionTypes.map((type) => <option key={type}>{type}</option>)}</select></div><div className="field-stack"><label htmlFor="format">Format</label><select id="format" value={bars} onChange={(event) => setBars(Number(event.target.value))}>{[4, 8, 12].map((count) => <option key={count} value={count}>{count} bars · chart + riff</option>)}</select></div><div className="field-stack complexity"><label htmlFor="complexity">Complexity <output>{complexity}</output></label><input className="pill-slider" id="complexity" type="range" min="1" max="5" value={complexity} style={pillSliderStyle(complexity, 1, 5, "#e6e6df")} onChange={(event) => setComplexity(Number(event.target.value))} /><div className="complexity-scale"><span>direct</span><span>colorful</span></div></div><div className="field-stack rhythm-complexity"><label htmlFor="rhythm-complexity">Chord timing &amp; meter <output>{["0 · basic", "1 · bars", "2 · offbeat", "3 · split", "4 · meter", "5 · mixed"][rhythmComplexity]}</output></label><input className="pill-slider" id="rhythm-complexity" type="range" min="0" max="5" value={rhythmComplexity} style={pillSliderStyle(rhythmComplexity, 0, 5, "#78baff")} onChange={(event) => setRhythmComplexity(Number(event.target.value))} /><div className="complexity-scale"><span>bar starts</span><span>mixed meters</span></div></div><div className="field-stack modulation"><label htmlFor="modulation">Inside-part modulation <output>{modulation}%</output></label><input className="pill-slider" id="modulation" type="range" min="0" max="100" step="5" value={modulation} style={pillSliderStyle(modulation, 0, 100, "#b1a2ff")} onChange={(event) => setModulation(Number(event.target.value))} /><div className="complexity-scale"><span>stable</span><span>adventurous</span></div></div><div className="generate-row"><button className="generate" onClick={generate}><span>✦</span> Riffize</button><button className="random-settings" onClick={randomizeSettings} aria-label="Randomize settings">⚄</button></div><p className="profile-note"><span style={{ background: profiles[artist].color }} />{profiles[artist].note}</p></aside>
      <section className="workspace" aria-label="Song arrangement"><div className="conversation">
        {parts.map((part) => { const key = `part-${part.id}`; return <IdeaCard key={key} part={part} isPlaying={playingKey === key} isLoading={loadingKey === key} auditionError={auditionErrorKey === key} active={focusKey === key ? activeBar : null} activeTime={playingKey === key ? activeTime : null} activeStep={activeStep?.key === key ? activeStep : null} selectedChord={selectedChord?.key === key ? selectedChord : null} harmonyEnabled={harmonyEnabled} chordRhythmEnabled={chordRhythmEnabled} riffEnabled={riffEnabled} bassEnabled={bassEnabled} drumsEnabled={drumsEnabled} fretboardTrack={fretboardTrack} onToggleHarmony={toggleHarmony} onToggleChordRhythm={toggleChordRhythm} onToggleRiff={toggleRiff} onToggleBass={toggleBass} onToggleDrums={toggleDrums} onFretboardTrackChange={(track) => { stopPlayback(); clearVisualState(); setFretboardTrack(track); }} onPlay={() => { void playIdea(part, key); }} onStep={(direction) => { void stepIdea(part, key, direction); }} onAuditionChord={(bar) => { void auditionChord(part, key, bar); }} onTempoChange={(tempo) => changeTempo(part, key, tempo)} onCopy={() => { void copyChordNames(part, key); }} copied={copiedKey === key} onRemove={() => removePart(part.id)} />; })}
        {draft && <article className="draft-card"><div className="draft-body"><IdeaCard part={draft} isPlaying={playingKey === "draft"} isLoading={loadingKey === "draft"} auditionError={auditionErrorKey === "draft"} active={focusKey === "draft" ? activeBar : null} activeTime={playingKey === "draft" ? activeTime : null} activeStep={activeStep?.key === "draft" ? activeStep : null} selectedChord={selectedChord?.key === "draft" ? selectedChord : null} harmonyEnabled={harmonyEnabled} chordRhythmEnabled={chordRhythmEnabled} riffEnabled={riffEnabled} bassEnabled={bassEnabled} drumsEnabled={drumsEnabled} fretboardTrack={fretboardTrack} onToggleHarmony={toggleHarmony} onToggleChordRhythm={toggleChordRhythm} onToggleRiff={toggleRiff} onToggleBass={toggleBass} onToggleDrums={toggleDrums} onFretboardTrackChange={(track) => { stopPlayback(); clearVisualState(); setFretboardTrack(track); }} onPlay={() => { void playIdea(draft, "draft"); }} onStep={(direction) => { void stepIdea(draft, "draft", direction); }} onAuditionChord={(bar) => { void auditionChord(draft, "draft", bar); }} onTempoChange={(tempo) => changeTempo(draft, "draft", tempo)} onCopy={() => { void copyChordNames(draft, "draft"); }} copied={copiedKey === "draft"} /><div className="draft-actions"><button className="quiet-button" onClick={regenerateRiff}>↻ Regenerate riff</button><button className="add-button" onClick={addDraft}>Add to song →</button></div></div></article>}
      </div></section>
    </div>
  </main>;
}

type IdeaCardProps = {
  part: Part; isPlaying: boolean; isLoading: boolean; auditionError: boolean; active: number | null; activeTime: number | null; activeStep: ActiveStep | null; selectedChord: SelectedChord | null;
  harmonyEnabled: boolean; chordRhythmEnabled: boolean; riffEnabled: boolean; bassEnabled: boolean; drumsEnabled: boolean; fretboardTrack: FretboardTrack;
  onToggleHarmony: () => void; onToggleChordRhythm: () => void; onToggleRiff: () => void; onToggleBass: () => void; onToggleDrums: () => void;
  onFretboardTrackChange: (track: FretboardTrack) => void; onPlay: () => void; onStep: (direction: number) => void; onRemove?: () => void;
  onAuditionChord: (bar: number) => void; onTempoChange: (tempo: number) => void; onCopy: () => void; copied: boolean;
};

function IdeaCard({ part, isPlaying, isLoading, auditionError, active, activeTime, activeStep, selectedChord, harmonyEnabled, chordRhythmEnabled, riffEnabled, bassEnabled, drumsEnabled, fretboardTrack, onToggleHarmony, onToggleChordRhythm, onToggleRiff, onToggleBass, onToggleDrums, onFretboardTrackChange, onPlay, onStep, onRemove, onAuditionChord, onTempoChange, onCopy, copied }: IdeaCardProps) {
  const path = harmonicPath(part);
  const pluginHost = Boolean(juceBackend());
  const [exportOptions, setExportOptions] = useState({ multipleTracks: true, stringChannels: false, invertedChannels: false });
  useEffect(() => {
    if (pluginHost) emitJuceEvent("riffizerDragSettings", { part, style: profileStyles[part.artist].label, ...exportOptions, settings: { harmonyEnabled, chordRhythmEnabled, riffEnabled, bassEnabled, drumsEnabled, fretboardTrack } });
  }, [pluginHost, part, exportOptions, harmonyEnabled, chordRhythmEnabled, riffEnabled, bassEnabled, drumsEnabled, fretboardTrack]);
  const events = fretboardEvents(part, fretboardTrack);
  const modeLabel = fretboardTrack === "chordRhythm" ? "Chord rhythm" : fretboardTrack === "bass" ? "Bass" : "Riff";
  const meterLabel = Array.from(new Set(part.idea.meterMap.meters.map((meter) => meter.label))).join(" / ");
  const liveIndex = isPlaying && activeTime !== null ? events.findIndex((event) => activeTime >= event.time - 0.001 && activeTime < event.time + event.duration - 0.001) : -1;
  const activeIndex = activeStep ? activeStep.index : liveIndex >= 0 ? liveIndex : null;
  return <article className="idea-card"><div className="part-body idea-body">
    <div className="part-topline"><div><div className="part-meta"><span className="active-dot" style={{ background: profiles[part.artist].color }} />{profileStyles[part.artist].label} <span>·</span> {part.section}</div><p className="harmony-center">{part.bars}-bar · {meterLabel} · {keyLabel(part)}{path.includes("→") ? ` → ${path.split(" → ").at(-1)}` : ""}</p></div>{onRemove && <button className="remove" onClick={onRemove} aria-label={`Remove ${part.section}`}>×</button>}</div>
    <div className="chord-chart" aria-label={`Chord chart in ${meterLabel}`}>{part.progression.map((chord, bar) => <button className={active === bar ? "chart-chord active" : "chart-chord"} key={`${chord}-${bar}`} onClick={() => onAuditionChord(bar)} aria-label={`Play ${chord} and show its guitar shape`} aria-pressed={selectedChord?.bar === bar}>{chord}</button>)}</div>
    <div className="idea-controls">
      <div className="transport-controls">
        <button className={`play-idea ${isPlaying ? "is-playing" : ""} ${isLoading ? "is-loading" : ""}`} onClick={onPlay} aria-label={isLoading ? "Loading audition samples" : isPlaying ? "Stop loop" : "Loop generated idea"}><span className={`transport-icon ${isLoading ? "loading" : isPlaying ? "stop" : "play"}`} aria-hidden="true" /></button>
        <button className={`harmony-toggle ${harmonyEnabled ? "is-on" : ""}`} onClick={onToggleHarmony} aria-pressed={harmonyEnabled}>{harmonyEnabled ? "♬ Harmony on" : "♬ Harmony muted"}</button>
        <button className={`chord-rhythm-toggle ${chordRhythmEnabled ? "is-on" : ""}`} onClick={onToggleChordRhythm} aria-pressed={chordRhythmEnabled}>{chordRhythmEnabled ? "Chord rhythm on" : "Chord rhythm off"}</button>
        <button className={`riff-toggle ${riffEnabled ? "is-on" : ""}`} onClick={onToggleRiff} aria-pressed={riffEnabled}>{riffEnabled ? "Riff on" : "Riff muted"}</button>
        <button className={`bass-toggle ${bassEnabled ? "is-on" : ""}`} onClick={onToggleBass} aria-pressed={bassEnabled}>{bassEnabled ? "Bass on" : "Bass muted"}</button>
        <button className={`drums-toggle ${drumsEnabled ? "is-on" : ""}`} onClick={onToggleDrums} aria-pressed={drumsEnabled}>{drumsEnabled ? "Drums on" : "Drums muted"}</button>
        {!pluginHost && <div className="export-controls"><button className={`midi-button chord-copy ${copied ? "is-copied" : ""}`} onClick={onCopy} aria-label="Copy chord names as comma-separated text">{copied ? "Copied" : "Copy"}</button><button className="midi-button" onClick={() => downloadMidi(part)} aria-label="Download five-track MIDI">MIDI</button></div>}
      </div>
      <div className="track-view-row"><label className="track-view-selector"><span>Fretboard track</span><select value={fretboardTrack} onChange={(event) => onFretboardTrackChange(event.target.value as FretboardTrack)} aria-label="Choose the track shown on the fretboard"><option value="riff">Riff / melody</option><option value="chordRhythm">Chord rhythm</option><option value="bass">Bass line</option></select></label></div>
      {pluginHost && <div className="plugin-export-options" aria-label="Logic MIDI export options"><button className="midi-button" onClick={() => setExportOptions((current) => ({ ...current, multipleTracks: !current.multipleTracks }))}>{exportOptions.multipleTracks ? "5 tracks" : "Single track"}</button><button className={`midi-button ${exportOptions.stringChannels ? "is-selected" : ""}`} onClick={() => setExportOptions((current) => ({ ...current, stringChannels: !current.stringChannels }))}>Strings → channels</button><button className={`midi-button ${exportOptions.invertedChannels ? "is-selected" : ""}`} onClick={() => setExportOptions((current) => ({ ...current, invertedChannels: !current.invertedChannels }))}>Ch invert</button></div>}
      <p className={`idea-mode-note ${auditionError ? "audition-error" : ""}`}>{isLoading ? "Loading audition samples… " : auditionError ? "Samples did not load; press Play to retry. " : pluginHost ? "The play button auditions every enabled lane with built-in samples. Logic transport sends the selected guitar parts only; Drag MIDI still exports riff, chords, chord rhythm, bass, and drums. " : "Sample playback follows the lane switches; MIDI exports five separate tracks. "}Fretboard: {modeLabel}</p>
      <label className="tempo-control"><span>{pluginHost ? "Project tempo" : "Tempo"}</span><input className="pill-slider" type="range" min="70" max="190" value={part.idea.tempo} style={pillSliderStyle(part.idea.tempo, 70, 190, "#e6e6df")} onChange={(event) => onTempoChange(Number(event.target.value))} aria-label={`${part.section} tempo`} disabled={pluginHost} /><output>{part.idea.tempo}</output></label>
    </div>
    <div className="riff-navigator" aria-label={`${modeLabel} note navigator`}><button className="fret-nav previous" onClick={() => onStep(-1)} aria-label={`Previous ${modeLabel.toLowerCase()} event`}>‹</button><div className="riff-fret-stage"><RiffTimeline events={events} activeBar={active} activeIndex={activeIndex} meterMap={part.idea.meterMap} /><Fretboard events={events} activeTime={activeTime} activeStep={activeStep} chordPreview={fretboardTrack === "chordRhythm" ? selectedChord?.event : undefined} isPlaying={isPlaying} label={modeLabel} instrument={fretboardTrack === "bass" ? "bass" : "guitar"} /></div><button className="fret-nav next" onClick={() => onStep(1)} aria-label={`Next ${modeLabel.toLowerCase()} event`}>›</button></div>
  </div></article>;
}

function RiffTimeline({ events, activeBar, activeIndex, meterMap }: { events: PerformanceEvent[]; activeBar: number | null; activeIndex: number | null; meterMap: PerformanceIdea["meterMap"] }) {
  const activeTick = activeIndex === null ? -1 : Math.round((events[activeIndex]?.time ?? -1) * 4);
  const totalTicks = Math.round(meterMap.totalBeats * 4); const barStarts = meterMap.starts.map((start) => Math.round(start * 4));
  const activeStart = activeBar === null ? -1 : barStarts[activeBar]; const activeEnd = activeBar === null ? -1 : activeBar === meterMap.meters.length - 1 ? totalTicks : barStarts[activeBar + 1];
  return <div className="riff-timeline" style={{ gridTemplateColumns: `repeat(${totalTicks}, minmax(0, 1fr))` }} aria-label="16th-note riff timeline">{Array.from({ length: totalTicks }, (_, tick) => <span key={tick} className={`${barStarts.includes(tick) ? "bar-start" : ""} ${activeBar !== null && tick >= activeStart && tick < activeEnd ? "bar-active" : ""} ${events.some((event) => Math.round(event.time * 4) === tick) ? "note" : ""} ${activeTick === tick ? "active-step" : ""}`}></span>)}</div>;
}

function Fretboard({ events, activeTime, activeStep, chordPreview, isPlaying, label, instrument }: { events: PerformanceEvent[]; activeTime: number | null; activeStep: ActiveStep | null; chordPreview?: PerformanceEvent; isPlaying: boolean; label: string; instrument: "guitar" | "bass" }) {
  const selectedEvent = activeStep ? events[activeStep.index] : undefined;
  const playingEvents = isPlaying && activeTime !== null ? events.filter((event) => activeTime >= event.time - 0.001 && activeTime < event.time + event.duration - 0.001) : [];
  const displayEvents = selectedEvent ? [selectedEvent] : playingEvents.length ? playingEvents : chordPreview ? [chordPreview] : [];
  const notes = Array.from(new Map(displayEvents.flatMap((event) => event.notes).map((note) => [`${note.string}-${note.fret}`, note])).values());
  const strings = instrument === "bass" ? ["G", "D", "A", "E"] : ["e", "B", "G", "D", "A", "E"];
  return <section className={`fretboard-panel keyer-board riff ${notes.length ? "has-active-note" : "is-idle"}`} aria-label={`${label} fretboard`}><div className="fret-numbers"><span></span>{Array.from({ length: 13 }, (_, fret) => <span key={fret}>{[0, 3, 5, 7, 9, 12].includes(fret) ? fret : ""}</span>)}</div><div className="fretboard">{strings.map((name, string) => <div className="fret-string" key={name}><span className="string-name">{name}</span>{Array.from({ length: 13 }, (_, fret) => <span key={fret} className={`fret ${notes.some((note) => note.string === string && note.fret === fret) ? "active" : ""}`}></span>)}</div>)}</div></section>;
}
