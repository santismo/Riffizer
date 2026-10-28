import assert from "node:assert/strict";
import test, { after } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
const output = mkdtempSync(join(tmpdir(), "riffizer-engine-"));
execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"), "app/harmonic-engine.ts", "app/performance-engine.ts", "--target", "es2023", "--module", "commonjs", "--strict", "--skipLibCheck", "--outDir", output]);
after(() => rmSync(output, { recursive: true, force: true }));
const { artists, createProgression, scoreProgressionCandidate } = require(join(output, "harmonic-engine.js"));
const { createChordPreview, createPerformanceIdea, regenerateRiffIdea, completePerformanceIdea, scorePerformanceIdea, scorePhraseIntelligence } = require(join(output, "performance-engine.js"));
const { chordTonesForQuality } = require(join(output, "chord-tones.js"));

function seeded(seed, run) {
  const original = Math.random;
  Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  try { return run(); } finally { Math.random = original; }
}
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
