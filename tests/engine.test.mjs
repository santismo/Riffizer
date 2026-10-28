import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
const output = mkdtempSync(join(tmpdir(), "riffizer-engine-"));
execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "app/harmonic-engine.ts", "app/performance-engine.ts", "app/midi-export.ts", "app/sample-audition-engine.ts", "--target", "es2023", "--module", "commonjs", "--strict", "--skipLibCheck", "--outDir", output]);
after(() => rmSync(output, { recursive: true, force: true }));
const { artists, createProgression, scoreProgressionCandidate } = require(join(output, "harmonic-engine.js"));
const { createChordPreview, createPerformanceIdea, regenerateRiffIdea, completePerformanceIdea, scorePerformanceIdea, scorePhraseIntelligence } = require(join(output, "performance-engine.js"));
const { artistBehaviors } = require(join(output, "artist-behavior.js"));
const { applyGuitarExpression, pitchGesturePoints } = require(join(output, "guitar-expression.js"));
const { createMidiBytes, MIDI_TICKS_PER_BEAT } = require(join(output, "midi-export.js"));
const { SampleAuditionEngine } = require(join(output, "sample-audition-engine.js"));
const { chordTonesForQuality } = require(join(output, "chord-tones.js"));

function seeded(seed, run) {
  const original = Math.random;
  Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  try { return run(); } finally { Math.random = original; }
}

test("artist decisions produce distinct phrasing and harmony on a seeded corpus", () => {
  const signatures = new Set(); const holds = {};
  for (const artist of artists) {
    const lines = []; holds[artist] = 0;
    for (let seed = 1; seed <= 24; seed++) seeded(seed, () => {
      const h = createProgression(artist, 8, "Verse", 3, 0);
      holds[artist] += h.progression.filter((chord, i) => i && chord === h.progression[i - 1]).length;
      const idea = createPerformanceIdea(artist, "Verse", ["Cmaj9", "Am7", "Fmaj7", "G7"], [0, 0, 0, 0], "major", 3, 0);
      verify(idea, `${artist} corpus ${seed}`);
      lines.push(idea.riff.map((e) => [e.time, e.notes.at(0).midi, e.velocity, e.expression]));
      const topNotes = idea.riff.map((e) => Math.max(...e.notes.map((n) => n.midi)));
      const [low, high] = artistBehaviors[artist].register;
      assert.ok(topNotes.filter((n) => n >= low && n <= high).length / topNotes.length > .9, artist);
    });
    signatures.add(JSON.stringify(lines));
  }
  assert.equal(signatures.size, 10);
  assert.ok(holds["Nick Johnston"] > holds["Greg Howe"], JSON.stringify(holds));
  assert.ok(holds.Waxamilion > holds["Yngwie Malmsteen"], JSON.stringify(holds));
});

test("expression biases differ while connections, sustained endings, and polyphony remain safe", () => {
  const meter = { starts: [0], meters: [{ label: "4/4", beatsPerBar: 4 }], totalBeats: 4 };
  const harmony = [{ time: 0, chord: "Cmaj7" }];
  const make = (time, duration, midi, string, fret) => ({ time, duration, velocity: .8, notes: [{ midi, string, fret }] });
  const fixtures = [
    [make(0, 2, 67, 0, 3)],
    [make(0, .49, 64, 2, 9), make(.5, .49, 65, 2, 10)],
    [make(0, .49, 64, 2, 9), make(.5, .49, 67, 2, 12)],
    [make(0, .5, 60, 3, 10), make(3, 1, 64, 2, 9)],
  ];
  const counts = {};
  for (const artist of artists) {
    const count = counts[artist] = { bend: 0, slide: 0, legato: 0, "palm-mute": 0, vibrato: 0 };
    for (let seed = 1; seed <= 200; seed++) seeded(seed * 719, () => {
      for (const source of fixtures) {
        const before = JSON.stringify(source);
        const result = applyGuitarExpression(artist, source, harmony, meter);
        assert.equal(JSON.stringify(source), before, "does not mutate a saved line");
        result.forEach((event) => {
          if (event.expression?.technique in count) count[event.expression.technique]++;
          if (event.expression?.vibrato) count.vibrato++;
        });
        assert.notEqual(result.at(-1).expression?.technique, "palm-mute", "preserves ending");
      }
    });
  }
  assert.ok(counts["Marco Sfogli"].bend > counts.CHON.bend * 5);
  assert.ok(counts["Greg Howe"].legato > counts["Yngwie Malmsteen"].legato * 1.5);
  assert.ok(counts.Waxamilion["palm-mute"] > counts["Matteo Mancuso"]["palm-mute"] * 3);
  assert.ok(counts["Yngwie Malmsteen"].vibrato > counts.CHON.vibrato * 3);
  const poly = { ...make(0, 2, 67, 0, 3), notes: [{ midi: 67, string: 0, fret: 3 }, { midi: 64, string: 1, fret: 5 }] };
  assert.equal(applyGuitarExpression("Marco Sfogli", [poly], harmony, meter)[0].expression, undefined);
});

test("pitch gestures settle on target, delay vibrato, and stay within bounds", () => {
  const expression = { technique: "bend", fromMidi: 65, vibrato: { depthCents: 32, rateHz: 5.4, delayBeats: .65 } };
  const points = pitchGesturePoints(67, 1.4, .5, expression);
  assert.equal(points[0].cents, -200);
  assert.equal(points.at(-1).cents, 0);
  assert.ok(points.every((p, i) => Number.isFinite(p.cents) && Math.abs(p.cents) <= 200 && (!i || p.time > points[i - 1].time)));
  assert.ok(points.filter((p) => p.time >= .16 && p.time < .325).every((p) => p.cents === 0));
  assert.ok(points.some((p) => p.time > .5 && p.cents > 10));
  assert.ok(points.some((p) => p.time > .5 && p.cents < -10));
  assert.deepEqual(pitchGesturePoints(67, 1, .5, { technique: "legato" }), []);
  assert.deepEqual(pitchGesturePoints(67, 1, .5), []);
});

function parseMidi(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "MThd");
  assert.equal(view.getUint16(12), MIDI_TICKS_PER_BEAT);
  let offset = 14;
  const readVlq = () => { let value = 0, byte; do { byte = bytes[offset++]; value = value * 128 + (byte & 127); } while (byte & 128); return value; };
  return Array.from({ length: view.getUint16(10) }, () => {
    assert.equal(new TextDecoder().decode(bytes.slice(offset, offset + 4)), "MTrk");
    const end = offset + 8 + view.getUint32(offset + 4); offset += 8;
    const events = []; let tick = 0;
    while (offset < end) {
      tick += readVlq(); const status = bytes[offset++];
      if (status === 255) {
        const type = bytes[offset++], length = readVlq();
        events.push({ tick, status, type, data: Array.from(bytes.slice(offset, offset + length)) }); offset += length;
      } else events.push({ tick, status, data: [bytes[offset++], bytes[offset++]] });
    }
    assert.equal(offset, end);
    return events;
  });
}

test("MIDI preserves notes and meters, isolates pitch, and resets before adjacent gestures", () => seeded(51, () => {
  const idea = createPerformanceIdea("Marco Sfogli", "Verse", ["Cmaj7", "Am7", "Fmaj7", "G7"], [0, 0, 0, 0], "major", 3, 4);
  idea.riff = [
    { time: 0, duration: 1, velocity: .8, notes: [{ midi: 67, string: 0, fret: 3 }], expression: { technique: "bend", fromMidi: 65 } },
    { time: 1, duration: 1, velocity: .8, notes: [{ midi: 69, string: 0, fret: 5 }], expression: { technique: "slide", fromMidi: 67 } },
  ];
  const title = "Long UTF-8 title · ".repeat(15);
  const tracks = parseMidi(createMidiBytes(idea, title, "Cmaj7"));
  assert.equal(tracks.length, 5);
  const channels = [0, 1, 2, 3, 9];
  const lanes = [idea.riff, idea.harmony, idea.chordRhythm, idea.bass, idea.drums];
  tracks.forEach((track, i) => {
    assert.ok(new TextDecoder().decode(Uint8Array.from(track[0].data)).startsWith(title));
    const notes = track.filter((e) => (e.status & 240) === 144);
    assert.equal(notes.length, lanes[i].reduce((sum, e) => sum + e.notes.length, 0));
    assert.ok(track.filter((e) => e.status !== 255).every((e) => (e.status & 15) === channels[i]));
    if (i) assert.equal(track.filter((e) => (e.status & 240) === 224).length, 0);
    const balance = new Map();
    track.filter((e) => [128, 144].includes(e.status & 240)).forEach((e) => balance.set(e.data[0], (balance.get(e.data[0]) ?? 0) + ((e.status & 240) === 144 ? 1 : -1)));
    assert.ok([...balance.values()].every((n) => n === 0));
    assert.equal(track.filter((e) => e.type === 88).length, idea.meterMap.meters.length);
    assert.equal(track.at(-1).type, 47);
    assert.ok(track.at(-1).tick >= Math.round(idea.meterMap.totalBeats * MIDI_TICKS_PER_BEAT));
  });
  const lead = tracks[0];
  assert.deepEqual(lead.filter((e) => e.status === 176).map((e) => e.data), [[101, 0], [100, 0], [6, 12], [38, 0], [101, 127], [100, 127]]);
  const boundary = lead.filter((e) => e.tick === MIDI_TICKS_PER_BEAT && e.status !== 255);
  assert.deepEqual(boundary.map((e) => e.status), [128, 224, 224, 144]);
  assert.deepEqual(boundary[1].data, [0, 64]);
  assert.ok(boundary[2].data[1] < 64);
  const expected = pitchGesturePoints(67, 60 / idea.tempo, 60 / idea.tempo, idea.riff[0].expression);
  expected.slice(0, -1).forEach((point) => {
    const tick = Math.round(point.time * idea.tempo / 60 * MIDI_TICKS_PER_BEAT);
    const event = lead.findLast((e) => e.tick === tick && e.status === 224);
    assert.equal(event.data[0] + event.data[1] * 128, Math.round(8192 + point.cents / 1200 * 8192));
  });
  idea.riff[1].time = .5;
  assert.equal(parseMidi(createMidiBytes(idea, "Overlap", "C"))[0].filter((e) => e.status === 224).length, 0);
}));

test("sample preview schedules expression and cleanup with a silent AudioContext mock", async () => {
  const nodes = [];
  const param = () => ({ value: 0, calls: [], setValueAtTime(...args) { this.calls.push(["set", ...args]); }, linearRampToValueAtTime(...args) { this.calls.push(["linear", ...args]); }, exponentialRampToValueAtTime(...args) { this.calls.push(["exponential", ...args]); } });
  const node = (kind) => { const n = { kind, gain: param(), detune: param(), playbackRate: param(), frequency: param(), Q: param(), connect(to) { return to; }, disconnect() { this.disconnected = true; }, start(...args) { this.started = args; }, stop(...args) { this.stopped = args; } }; nodes.push(n); return n; };
  const context = { currentTime: 2, destination: {}, createGain: () => node("gain"), createBufferSource: () => node("source"), createBiquadFilter: () => node("filter"), decodeAudioData: async () => ({ duration: 3 }) };
  const originalFetch = globalThis.fetch, originalDocument = globalThis.document;
  globalThis.document = { baseURI: "https://example.test/Riffizer/" };
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
  try {
    const engine = new SampleAuditionEngine(context);
    await engine.load(["electric"]);
    engine.playPitched("electric", 67, 3, 1, .8, .2, { technique: "bend", fromMidi: 65 }, .5);
    const bent = nodes.find((n) => n.kind === "source");
    assert.deepEqual(bent.detune.calls[0], ["set", -200, 3]);
    assert.deepEqual(bent.detune.calls.at(-1), ["linear", 0, 4]);
    assert.deepEqual(bent.started, [3, 0]);
    bent.onended(); assert.ok(bent.disconnected);
    engine.playPitched("electric", 65, 4, .25, .8, .2, { technique: "legato" }, .5);
    assert.deepEqual(nodes.findLast((n) => n.kind === "source").started, [4, .025]);
    engine.playPitched("electric", 60, 5, .1, .8, .2, { technique: "palm-mute" }, .5);
    const filter = nodes.find((n) => n.kind === "filter"), muted = nodes.findLast((n) => n.kind === "source");
    assert.equal(filter.type, "lowpass"); assert.deepEqual(filter.frequency.calls[0], ["set", 1050, 5]);
    assert.equal(muted.detune.calls.length, 0);
    engine.stopAll(); assert.deepEqual(muted.stopped, []);
    muted.onended(); assert.ok(filter.disconnected);
    engine.dispose(); assert.ok(nodes[0].disconnected);
  } finally { globalThis.fetch = originalFetch; if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument; }
});
const pc = (midi) => ((midi % 12) + 12) % 12;
const pitchClasses = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function tones(chord) {
  const [, letter, accidental, quality] = chord.match(/^([A-G])([#b]?)(.*)$/);
  return chordTonesForQuality(pc(pitchClasses[letter] + (accidental === "#" ? 1 : accidental === "b" ? -1 : 0)), quality);
}
function verify(idea, context) {
  const tuning = [64, 59, 55, 50, 45, 40];
  for (const lane of [idea.riff, idea.harmony, idea.chordRhythm, idea.bass, idea.drums]) {
    assert.ok(lane.length, context);
    for (const event of lane) {
      assert.ok(Number.isFinite(event.time) && event.time >= 0 && event.time < idea.meterMap.totalBeats, context);
      assert.ok(Number.isFinite(event.duration) && event.duration > 0, context);
      assert.ok(event.velocity > 0 && event.velocity <= 1, context);
      assert.ok(event.notes.length && event.notes.every((n) => Number.isInteger(n.midi) && n.midi >= 0 && n.midi <= 127), context);
    }
  }
  idea.riff.forEach((event, i) => {
    assert.ok(event.time + event.duration <= (idea.riff[i + 1]?.time ?? idea.meterMap.totalBeats) + .00001, `overlap: ${context}`);
    if (event.expression) {
      assert.equal(event.notes.length, 1, context);
      const note = event.notes[0], previous = idea.riff[i - 1];
      if (["slide", "legato"].includes(event.expression.technique)) {
        assert.equal(previous.notes.length, 1, context);
        assert.equal(previous.notes[0].string, note.string, context);
        assert.ok(previous.notes[0].fret > 0 && note.fret > 0, context);
        assert.ok(event.time - previous.time - previous.duration <= .12001, context);
        assert.ok(Math.abs(note.midi - previous.notes[0].midi) <= (event.expression.technique === "slide" ? 5 : 4), context);
      }
      if (event.expression.technique === "bend") {
        assert.ok(note.string <= 2 && event.expression.fromMidi >= tuning[note.string] + 1, context);
        assert.ok([1, 2].includes(note.midi - event.expression.fromMidi), context);
      }
      if (event.expression.vibrato || event.expression.technique === "bend") {
        assert.ok(tones(idea.harmony.findLast((h) => h.time <= event.time + 1e-6).chord).includes(pc(note.midi)), context);
      }
    }
    const strings = event.notes.map((n) => n.string).sort((a, b) => a - b);
    assert.ok(strings.every((s, j) => !j || s === strings[j - 1] + 1), `strings: ${context}`);
    for (const note of event.notes) {
      assert.ok(note.fret >= 0 && note.fret <= 12, context);
      assert.equal(note.midi, tuning[note.string] + note.fret, context);
    }
  });
  for (let bar = 0; bar < idea.meterMap.meters.length; bar++) {
    const start = idea.meterMap.starts[bar], end = start + idea.meterMap.meters[bar].beatsPerBar;
    const last = idea.riff.filter((e) => e.time >= start && e.time < end).at(-1);
    assert.ok(last, context);
    const active = idea.harmony.findLast((e) => e.time <= last.time + 1e-6);
    assert.ok(tones(active.chord).includes(pc(Math.max(...last.notes.map((n) => n.midi)))), `landing: ${context}`);
  }
}

test("chord qualities retain the written harmony, including extensions and suspensions", () => {
  for (const [quality, expected] of Object.entries({ maj9: [0, 4, 7, 11, 2], m6: [0, 3, 7, 9], "6/9": [0, 4, 7, 9, 2], sus2: [0, 2, 7], sus4: [0, 5, 7], "7sus4": [0, 5, 7, 10], "maj7#11": [0, 4, 7, 11, 6], "7b9": [0, 4, 7, 10, 1], "m(add9)": [0, 3, 7, 2], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9] })) {
    for (let root = 0; root < 12; root++) assert.deepEqual(new Set(chordTonesForQuality(root, quality)), new Set(expected.map((i) => pc(root + i))), quality);
  }
});

test("all ten profiles produce playable, resolved phrases across formats and settings", () => seeded(7129, () => {
  assert.equal(artists.length, 10);
  for (const artist of artists) for (const bars of [4, 8, 12]) for (const [complexity, rhythm, section, modulation] of [[1, 0, "Intro", 0], [3, 3, "Chorus", 50], [5, 5, "Solo", 100]]) {
    const h = createProgression(artist, bars, section, complexity, modulation);
    const idea = createPerformanceIdea(artist, section, h.progression, h.localCenters, h.mode, complexity, rhythm);
    assert.equal(h.progression.length, bars);
    if (modulation === 0) assert.equal(new Set(h.localCenters).size, 1);
    verify(idea, `${artist}/${bars}/${complexity}/${section}`);
    assert.ok(Number.isFinite(scorePerformanceIdea(artist, section, idea)));
    assert.ok(Number.isFinite(scoreProgressionCandidate(artist, section, h)));
  }
}));

test("regenerate changes only the riff and preserves saved accompaniment, tempo, and meter", () => seeded(18, () => {
  for (const artist of artists) {
    const h = createProgression(artist, 4, "Verse", 4, 0);
    const source = createPerformanceIdea(artist, "Verse", h.progression, h.localCenters, h.mode, 4, 4);
    const updated = regenerateRiffIdea(artist, "Verse", h.progression, h.localCenters, h.mode, 4, source);
    for (const field of ["harmony", "chordRhythm", "bass", "drums", "meterMap", "tempo"]) assert.deepEqual(updated[field], source[field], field);
    assert.notDeepEqual(updated.riff, source.riff);
    verify(updated, `regenerated ${artist}`);
    const restored = completePerformanceIdea(artist, "Verse", h.progression, 4, 4, updated);
    assert.deepEqual(restored, updated);
  }
}));

test("musical scoring rejects note spam, unresolved long tones, and flat dynamics", () => seeded(316, () => {
  const artist = "Nick Johnston";
  const idea = createPerformanceIdea(artist, "Verse", ["Cmaj7", "Am7", "Fmaj7", "G7"], [0, 0, 0, 0], "major", 3, 0);
  const score = scorePhraseIntelligence(artist, "Verse", idea);
  const spam = { ...idea, riff: idea.riff.flatMap((e) => [e, { ...e, time: e.time + .03 }]).sort((a, b) => a.time - b.time) };
  const unresolved = { ...idea, riff: idea.riff.map((e) => ({ ...e, duration: .8, notes: [{ midi: 66, string: 0, fret: 2 }] })) };
  const flat = { ...idea, riff: idea.riff.map((e) => ({ ...e, velocity: .75 })) };
  assert.ok(score > scorePhraseIntelligence(artist, "Verse", spam));
  assert.ok(score > scorePhraseIntelligence(artist, "Verse", unresolved));
  assert.ok(score > scorePhraseIntelligence(artist, "Verse", flat));
  assert.ok(scorePerformanceIdea(artist, "Verse", idea) > scorePerformanceIdea(artist, "Verse", spam));
}));

test("Silk Current differs from other fusion profiles on the same chord chart", () => {
  const chart = ["Am9", "D13", "Gmaj9", "E7b9"];
  const generate = (artist) => seeded(432, () => createPerformanceIdea(artist, "Solo", chart, [7, 7, 7, 7], "major", 5, 0));
  const silk = generate("Matteo Mancuso");
  for (const artist of ["Greg Howe", "Guthrie Govan"]) {
    const other = generate(artist);
    assert.notDeepEqual(silk.riff.map((e) => e.time), other.riff.map((e) => e.time));
    assert.notDeepEqual(silk.riff.map((e) => e.notes.map((n) => n.midi)), other.riff.map((e) => e.notes.map((n) => n.midi)));
  }
  assert.ok(silk.riff.filter((e) => e.notes.length === 1).length / silk.riff.length > .8);
});


test("extended chord voicings preserve their distinguishing guide tones", () => {
  for (const artist of artists) for (const compact of [false, true]) {
    for (const [chord, guides] of [["Cmaj9", [4, 11, 2]], ["C9", [4, 10, 2]], ["Cm9", [3, 10, 2]]]) {
      const voice = createChordPreview(chord, 5, artist, 0, compact);
      const pcs = voice.notes.map((note) => pc(note.midi));
      for (const guide of guides) assert.ok(pcs.includes(guide), `${artist} ${chord} compact=${compact}: ${pcs}`);
    }
  }
});

function activeHarmony(idea, time) {
  return idea.harmony.findLast((event) => event.time <= time + 1e-6);
}

test("all pitched lanes share early, late, split, and mixed-meter chord changes", () => seeded(8401, () => {
  const chart = ["Cmaj7", "Dbmaj7", "Dm9", "G7"];
  for (const artist of artists) for (const rhythm of [0, 2, 3, 4, 5]) {
    const idea = createPerformanceIdea(artist, "Verse", chart, [0, 0, 0, 0], "major", 5, rhythm);
    const context = `${artist}/${rhythm}`;
    assert.deepEqual(idea.harmony.map((e) => e.chord), chart, `no backwards re-attacks: ${context}`);
    idea.harmony.forEach((event, index) => {
      assert.ok(event.time + event.duration <= (idea.harmony[index + 1]?.time ?? idea.meterMap.totalBeats), context);
    });
    for (const lane of [idea.chordRhythm, idea.bass]) for (const event of lane) {
      const active = activeHarmony(idea, event.time);
      assert.equal(event.chord, active.chord, `lane disagreement: ${context}`);
      if (event.duration > .3) assert.ok(event.notes.every((note) => tones(active.chord).includes(pc(note.midi))), `held bass tension: ${context}`);
    }
    for (const lane of [idea.riff, idea.chordRhythm, idea.bass]) for (const event of lane) {
      if (event.duration >= .65) assert.ok(event.notes.every((note) => tones(activeHarmony(idea, event.time).chord).includes(pc(note.midi))), `long non-chord tone: ${context}`);
      for (const change of idea.harmony.filter((h) => h.time > event.time + 1e-6 && h.time < event.time + event.duration - 1e-6)) {
        assert.ok(event.notes.every((note) => tones(change.chord).includes(pc(note.midi))), `held across incompatible change: ${context}`);
      }
    }
  }
}));

test("each profile reserves held arrivals while keeping contrasting short gestures", () => seeded(291, () => {
  for (const artist of artists) for (const rhythm of [0, 4, 5]) {
    const idea = createPerformanceIdea(artist, "Solo", ["Cmaj7", "Am7", "Fmaj7", "G7"], [0, 0, 0, 0], "major", 4, rhythm);
    const last = idea.riff.at(-1);
    const beats = idea.meterMap.meters.at(-1).beatsPerBar;
    assert.ok(last.duration >= .9 * beats / 4, `missing held arrival: ${artist}/${rhythm}`);
    assert.ok(idea.riff.some((e) => e.duration < .5), `lost short gestures: ${artist}/${rhythm}`);
    const clipped = { ...idea, riff: idea.riff.map((e) => ({ ...e, duration: Math.min(.18, e.duration) })) };
    assert.ok(scorePhraseIntelligence(artist, "Solo", idea) > scorePhraseIntelligence(artist, "Solo", clipped), `scorer favors clipped phrasing: ${artist}`);
  }
}));

test("the scorer hears a chord change underneath a held note", () => seeded(31, () => {
  const idea = createPerformanceIdea("Nick Johnston", "Verse", ["Cmaj", "Dbmaj", "Dm", "G7"], [0, 0, 0, 0], "major", 3, 0);
  const phrase = { time: 3, duration: 2, notes: [{ midi: 64, string: 0, fret: 0 }], velocity: .8 };
  const unsafe = { ...idea, riff: [phrase] };
  const released = { ...unsafe, riff: [{ ...phrase, duration: .98 }] };
  assert.ok(scorePhraseIntelligence("Nick Johnston", "Verse", released) > scorePhraseIntelligence("Nick Johnston", "Verse", unsafe));
}));

test("harmonic grammar rewards coherent gestures over reordered chord vocabulary", () => {
  const generation = { center: 0, mode: "major", useFlats: false, endingPc: 7, localCenters: [0, 0, 0, 0], progression: ["Cmaj7", "Am7", "Dm7", "G7"] };
  const scrambled = { ...generation, progression: ["Dm7", "Am7", "Cmaj7", "G7"] };
  assert.ok(scoreProgressionCandidate("Matteo Mancuso", "Verse", generation) > scoreProgressionCandidate("Matteo Mancuso", "Verse", scrambled));
});
