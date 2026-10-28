import { phrasingProfiles, type RhythmCell } from "./phrasing-profiles";
import { chordTonesForQuality } from "./chord-tones";
import { pitchClasses, type Artist, type Mode, type SectionType } from "./harmonic-engine";

export type FretNote = { midi: number; string: number; fret: number };
export type PerformanceEvent = { time: number; duration: number; notes: FretNote[]; velocity: number };
export type TimeSignature = { label: string; beatsPerBar: number };
export type MeterMap = { meters: TimeSignature[]; starts: number[]; totalBeats: number };
export type HarmonyEvent = PerformanceEvent & { chord: string; bar: number };
export type PerformanceIdea = {
  tempo: number;
  riffStyle: string;
  meter: TimeSignature;
  meterMap: MeterMap;
  /** Sustained chart voicings used by the normal Harmony switch. */
  harmony: HarmonyEvent[];
  /** A separate, profile-shaped chord-stab lane. It never changes the chart. */
  chordRhythm: HarmonyEvent[];
  /** A four-string bass part locked to the chord-stab grid and riff accents. */
  bass: HarmonyEvent[];
  /** General MIDI drum notes shaped by the shared riff/chord-rhythm accents. */
  drums: PerformanceEvent[];
  riff: PerformanceEvent[];
};

type RiffKind = "melodic" | "rock" | "interlock" | "pedal" | "fusion" | "sequence" | "angular";
type HarmonicPhrasing = "downbeat" | "late" | "anticipate" | "split";
type TexturePolicy = { minSingles: number; maxDyads: number; maxTriads: number; triadOnAccentOnly?: boolean };
type PlayingComfort = {
  maxShift: number;
  maxStringTravel: number;
  lineLeap: number;
  preferredMinFret: number;
  preferredMaxFret: number;
  pedalFriendly?: boolean;
};
type PerformanceProfile = { riff: RiffKind; riffLabel: string; tempo: number; position: number; meters: TimeSignature[]; chordFeel: HarmonicPhrasing; gripReach: number; texture: TexturePolicy; comfort: PlayingComfort };
type PhraseMotion = "statement" | "answer" | "development" | "arrival";
type ArtistMotif = { accentTones: number[]; pickup: number; pedalEvery?: number; meterWeights: Record<string, number> };
type RiffBarPlan = RhythmCell & { variation: number; phraseMotion: PhraseMotion; contour: number[] };
type ChordRhythmCell = { id: string; hits: number[]; lengths: number[]; accents: number[]; finalHold?: boolean };
type RiffCursor = { midi: number; gripCenter?: number; anchor?: FretNote; handPosition: number };
type GripContext = { anchor: FretNote; handPosition: number; previousCenter?: number; previousAnchor?: FretNote; allowOpenPedal: boolean; maxSpan: number; maxShift: number; maxStringTravel: number };
type TextureState = { singles: number; dyads: number; triads: number; lastSize: 1 | 2 | 3 };
type PlayableFragment = { notes: FretNote[]; center: number; anchor: FretNote; score: number };
type CompactGrip = { notes: FretNote[]; score: number; center: number };

const guitarTuning = [64, 59, 55, 50, 45, 40];
const bassTuning = [43, 38, 33, 28];
const visibleFrets = 12;
const mod = (value: number, divisor = 12) => ((value % divisor) + divisor) % divisor;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const choose = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

const fourFour: TimeSignature = { label: "4/4", beatsPerBar: 4 };
const sevenEight: TimeSignature = { label: "7/8", beatsPerBar: 3.5 };
const fiveFour: TimeSignature = { label: "5/4", beatsPerBar: 5 };
const nineEight: TimeSignature = { label: "9/8", beatsPerBar: 4.5 };
const sixEight: TimeSignature = { label: "6/8", beatsPerBar: 3 };

const performanceProfiles: Record<Artist, PerformanceProfile> = {
  "Nick Johnston": { riff: "melodic", riffLabel: "melodic color motif", tempo: 102, position: 4, meters: [fourFour, sixEight], chordFeel: "anticipate", gripReach: 4, texture: { minSingles: 3, maxDyads: 1, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 2, lineLeap: 7, preferredMinFret: 2, preferredMaxFret: 10 } },
  "Moray Pringle": { riff: "rock", riffLabel: "wide rock-fusion riff", tempo: 118, position: 5, meters: [fourFour, fiveFour, sevenEight], chordFeel: "late", gripReach: 4, texture: { minSingles: 2, maxDyads: 2, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 5, maxStringTravel: 2, lineLeap: 9, preferredMinFret: 2, preferredMaxFret: 10, pedalFriendly: true } },
  Owane: { riff: "angular", riffLabel: "bright angular interlock", tempo: 126, position: 7, meters: [fourFour, sevenEight, fiveFour, nineEight], chordFeel: "anticipate", gripReach: 5, texture: { minSingles: 3, maxDyads: 2, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 2, lineLeap: 8, preferredMinFret: 3, preferredMaxFret: 11 } },
  Waxamilion: { riff: "pedal", riffLabel: "pedal-axis fragment", tempo: 108, position: 6, meters: [fourFour, fiveFour, sevenEight], chordFeel: "late", gripReach: 4, texture: { minSingles: 2, maxDyads: 2, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 2, lineLeap: 8, preferredMinFret: 1, preferredMaxFret: 10, pedalFriendly: true } },
  CHON: { riff: "interlock", riffLabel: "interlocking bright riff", tempo: 132, position: 5, meters: [fourFour, sevenEight, fiveFour, nineEight], chordFeel: "split", gripReach: 5, texture: { minSingles: 3, maxDyads: 2, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 2, lineLeap: 8, preferredMinFret: 2, preferredMaxFret: 11 } },
  "Marco Sfogli": { riff: "melodic", riffLabel: "anthemic melodic riff", tempo: 112, position: 4, meters: [fourFour, sixEight], chordFeel: "downbeat", gripReach: 4, texture: { minSingles: 3, maxDyads: 1, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 2, lineLeap: 8, preferredMinFret: 2, preferredMaxFret: 10 } },
  "Guthrie Govan": { riff: "fusion", riffLabel: "groove-aware fusion riff", tempo: 116, position: 7, meters: [fourFour, sixEight, sevenEight], chordFeel: "late", gripReach: 4, texture: { minSingles: 3, maxDyads: 2, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 2, lineLeap: 9, preferredMinFret: 3, preferredMaxFret: 11 } },
  "Greg Howe": { riff: "fusion", riffLabel: "punchy linear fusion riff", tempo: 122, position: 6, meters: [fourFour, sevenEight, fiveFour], chordFeel: "anticipate", gripReach: 4, texture: { minSingles: 2, maxDyads: 2, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 1, lineLeap: 8, preferredMinFret: 3, preferredMaxFret: 11 } },
  "Matteo Mancuso": { riff: "fusion", riffLabel: "fluid fingerstyle fusion", tempo: 118, position: 6, meters: [fourFour, sixEight, sevenEight], chordFeel: "anticipate", gripReach: 4, texture: { minSingles: 5, maxDyads: 1, maxTriads: 0, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 3, lineLeap: 10, preferredMinFret: 2, preferredMaxFret: 11 } },
  "Yngwie Malmsteen": { riff: "sequence", riffLabel: "minor-key pedal sequence", tempo: 138, position: 4, meters: [fourFour, sixEight], chordFeel: "downbeat", gripReach: 5, texture: { minSingles: 4, maxDyads: 1, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 5, maxStringTravel: 1, lineLeap: 9, preferredMinFret: 1, preferredMaxFret: 11, pedalFriendly: true } },
};

// These are original high-level playing tendencies, used as constraints rather
// than copied phrases. They give each engine a distinct melodic trajectory,
// harmonic landing preference, pickup behavior, and meter tolerance.
const artistMotifs: Record<Artist, ArtistMotif> = {
  "Nick Johnston": { accentTones: [3, 1, 0, 2], pickup: 0.16, meterWeights: { "4/4": 8, "6/8": 2 } },
  "Moray Pringle": { accentTones: [0, 2, 1, 0], pickup: 0.1, pedalEvery: 4, meterWeights: { "4/4": 7, "5/4": 2, "7/8": 1 } },
  Owane: { accentTones: [3, 1, 2, 0], pickup: 0.24, meterWeights: { "4/4": 7, "7/8": 2, "5/4": 1, "9/8": 1 } },
  Waxamilion: { accentTones: [0, 3, 0, 2], pickup: 0.2, pedalEvery: 3, meterWeights: { "4/4": 7, "5/4": 2, "7/8": 1 } },
  CHON: { accentTones: [3, 1, 2, 0], pickup: 0.25, meterWeights: { "4/4": 6, "7/8": 2, "5/4": 1, "9/8": 1 } },
  "Marco Sfogli": { accentTones: [0, 2, 1, 0], pickup: 0.08, meterWeights: { "4/4": 8, "6/8": 2 } },
  "Guthrie Govan": { accentTones: [1, 3, 2, 0], pickup: 0.2, meterWeights: { "4/4": 7, "6/8": 2, "7/8": 1 } },
  "Greg Howe": { accentTones: [0, 1, 3, 2], pickup: 0.22, meterWeights: { "4/4": 7, "7/8": 2, "5/4": 1 } },
  "Matteo Mancuso": { accentTones: [1, 3, 2, 0], pickup: 0.25, meterWeights: { "4/4": 9, "6/8": 2, "7/8": 1 } },
  "Yngwie Malmsteen": { accentTones: [0, 2, 1, 0], pickup: 0.08, pedalEvery: 4, meterWeights: { "4/4": 8, "6/8": 2 } },
};

const rhythmBooks: Record<RiffKind, RhythmCell[]> = {
  melodic: [
    { id: "lyric-space", times: [0, 1.5, 2.75], durations: [1.4, 0.85, 1.15], accents: [0], cadence: true },
    { id: "answer-pickup", times: [0, 0.75, 2, 3.25], durations: [0.68, 1.12, 1.12, 0.65], accents: [0, 2] },
    { id: "suspended-answer", times: [0, 1.25, 1.75, 3], durations: [1.15, 0.46, 1.1, 0.92], accents: [0, 3] },
    { id: "late-lift", times: [0, 0.5, 2.25, 2.75], durations: [0.46, 1.6, 0.46, 1.12], accents: [0, 3] },
    { id: "offbeat-lyric", times: [0, 1, 2.5, 3.5], durations: [0.92, 1.3, 0.85, 0.46], accents: [0, 2] },
  ],
  rock: [
    { id: "chug-answer", times: [0, 0.75, 1.5, 2.5, 3.25], durations: [0.42, 0.32, 0.45, 0.42, 0.52], accents: [0, 2], cadence: true },
    { id: "push-chug", times: [0, 0.5, 1.75, 2.25, 3.5], durations: [0.3, 0.58, 0.34, 0.45, 0.38], accents: [0, 3] },
    { id: "stomp-space", times: [0, 1.25, 2, 2.75], durations: [0.72, 0.38, 0.62, 0.7], accents: [0, 2] },
    { id: "late-chug", times: [0, 0.75, 1, 2.5, 3], durations: [0.46, 0.24, 0.52, 0.38, 0.62], accents: [0, 4] },
    { id: "double-time-answer", times: [0, 0.5, 1.25, 2.25, 2.75, 3.5], durations: [0.3, 0.3, 0.38, 0.3, 0.38, 0.35], accents: [0, 3] },
  ],
  interlock: [
    { id: "interlock-a", times: [0, 0.5, 1.25, 1.75, 2.5, 3.25], durations: [0.42, 0.28, 0.34, 0.42, 0.34, 0.4], accents: [0, 3], cadence: true },
    { id: "interlock-b", times: [0, 0.75, 1, 2, 2.5, 3.5], durations: [0.34, 0.22, 0.5, 0.34, 0.28, 0.34], accents: [0, 3] },
    { id: "interlock-c", times: [0, 0.25, 1.5, 2.25, 2.75, 3.25], durations: [0.2, 0.48, 0.38, 0.32, 0.32, 0.48], accents: [0, 2, 5] },
    { id: "interlock-d", times: [0, 0.5, 1.75, 2, 2.75, 3.75], durations: [0.28, 0.46, 0.2, 0.46, 0.34, 0.2], accents: [0, 3] },
    { id: "interlock-e", times: [0, 0.75, 1.25, 2.5, 3, 3.5], durations: [0.4, 0.3, 0.35, 0.3, 0.34, 0.34], accents: [0, 4] },
  ],
  pedal: [
    { id: "pedal-breath", times: [0, 0.5, 1.5, 2, 3.25], durations: [0.46, 0.34, 0.64, 0.38, 0.62], accents: [0, 3], cadence: true },
    { id: "pedal-push", times: [0, 0.75, 1.25, 2.5, 3], durations: [0.34, 0.32, 0.52, 0.42, 0.62], accents: [0, 2] },
    { id: "pedal-late", times: [0, 1, 1.75, 2.25, 3.5], durations: [0.72, 0.32, 0.34, 0.5, 0.3], accents: [0, 3] },
    { id: "pedal-echo", times: [0, 0.5, 1.25, 2.75, 3.25], durations: [0.32, 0.5, 0.34, 0.36, 0.68], accents: [0, 4] },
    { id: "pedal-rattle", times: [0, 0.25, 1.5, 2, 2.5, 3.5], durations: [0.18, 0.48, 0.52, 0.3, 0.36, 0.32], accents: [0, 2] },
  ],
  fusion: [
    { id: "fusion-groove", times: [0, 0.5, 1.5, 2.25, 3, 3.5], durations: [0.3, 0.42, 0.34, 0.36, 0.3, 0.4], accents: [0, 3], cadence: true },
    { id: "fusion-pickup", times: [0, 0.75, 1.25, 1.75, 2.75, 3.25], durations: [0.38, 0.28, 0.3, 0.48, 0.34, 0.4], accents: [0, 3] },
    { id: "fusion-lilt", times: [0, 0.25, 1, 2, 2.5, 3.5], durations: [0.2, 0.46, 0.38, 0.36, 0.3, 0.36], accents: [0, 3] },
    { id: "fusion-space", times: [0, 1, 1.5, 2.75, 3.25], durations: [0.64, 0.28, 0.4, 0.32, 0.52], accents: [0, 3] },
    { id: "fusion-turn", times: [0, 0.5, 1.25, 2.25, 2.5, 3.75], durations: [0.32, 0.32, 0.48, 0.24, 0.42, 0.18], accents: [0, 4] },
  ],
  sequence: [
    { id: "sequence-run", times: [0, 0.5, 1, 1.5, 2.25, 3, 3.5], durations: [0.26, 0.26, 0.28, 0.38, 0.32, 0.28, 0.44], accents: [0, 4], cadence: true },
    { id: "sequence-skip", times: [0, 0.5, 1.25, 1.75, 2.5, 3, 3.5], durations: [0.28, 0.34, 0.26, 0.34, 0.3, 0.28, 0.36], accents: [0, 4] },
    { id: "sequence-climb", times: [0, 0.25, 1, 1.5, 2, 2.75, 3.25], durations: [0.18, 0.38, 0.28, 0.32, 0.34, 0.26, 0.5], accents: [0, 3, 6] },
    { id: "sequence-answer", times: [0, 0.75, 1.25, 2.25, 2.75, 3.5], durations: [0.42, 0.24, 0.42, 0.28, 0.34, 0.4], accents: [0, 3] },
    { id: "sequence-pedal", times: [0, 0.5, 1, 2, 2.5, 3, 3.75], durations: [0.3, 0.26, 0.52, 0.28, 0.28, 0.35, 0.18], accents: [0, 3] },
  ],
  angular: [
    { id: "angular-displace", times: [0, 0.75, 1.25, 2.25, 2.75, 3.5], durations: [0.38, 0.28, 0.46, 0.34, 0.3, 0.42], accents: [0, 3], cadence: true },
    { id: "angular-stutter", times: [0, 0.25, 1.5, 2, 2.75, 3.25], durations: [0.18, 0.5, 0.36, 0.36, 0.3, 0.5], accents: [0, 2, 5] },
    { id: "angular-gap", times: [0, 0.5, 1.75, 2.5, 3, 3.75], durations: [0.32, 0.46, 0.32, 0.38, 0.3, 0.18], accents: [0, 3] },
    { id: "angular-lift", times: [0, 0.75, 1, 2.25, 2.5, 3.5], durations: [0.34, 0.2, 0.5, 0.34, 0.26, 0.42], accents: [0, 3] },
    { id: "angular-weave", times: [0, 0.5, 1.25, 2, 3, 3.25], durations: [0.28, 0.4, 0.36, 0.62, 0.2, 0.52], accents: [0, 3, 5] },
  ],
};

// The chord lane is intentionally independent from the melodic rhythm book.
// These are compact accompaniment gestures: the profile determines the kind of
// pocket, while the generated chart still determines every harmony choice.
const chordRhythmBooks: Record<RiffKind, ChordRhythmCell[]> = {
  melodic: [
    { id: "lyric-pulse", hits: [0, .58], lengths: [.28, .36], accents: [0] },
    { id: "late-answer", hits: [0, .42, .78], lengths: [.22, .18, .3], accents: [0, 2] },
    { id: "wide-breath", hits: [0, .7], lengths: [.42, .24], accents: [0], finalHold: true },
  ],
  rock: [
    { id: "rock-stomp", hits: [0, .26, .5, .76], lengths: [.22, .14, .22, .18], accents: [0, 2] },
    { id: "rock-push", hits: [0, .18, .56, .74], lengths: [.18, .2, .2, .18], accents: [0, 3] },
    { id: "rock-space", hits: [0, .38, .7], lengths: [.32, .16, .28], accents: [0], finalHold: true },
  ],
  interlock: [
    { id: "interlock-grid", hits: [0, .12, .33, .5, .7, .86], lengths: [.13, .13, .16, .12, .15, .12], accents: [0, 3] },
    { id: "interlock-skip", hits: [0, .2, .29, .58, .75], lengths: [.16, .11, .15, .14, .18], accents: [0, 3] },
    { id: "interlock-clave", hits: [0, .16, .46, .63, .88], lengths: [.12, .16, .18, .13, .1], accents: [0, 2] },
  ],
  pedal: [
    { id: "pedal-chop", hits: [0, .14, .5, .66, .82], lengths: [.14, .12, .24, .12, .15], accents: [0, 2] },
    { id: "pedal-late", hits: [0, .24, .55, .72], lengths: [.18, .15, .22, .18], accents: [0, 2] },
    { id: "pedal-breathe", hits: [0, .38, .8], lengths: [.3, .17, .16], accents: [0], finalHold: true },
  ],
  fusion: [
    { id: "fusion-pocket", hits: [0, .18, .42, .62, .83], lengths: [.16, .13, .18, .14, .13], accents: [0, 2] },
    { id: "fusion-anticipate", hits: [0, .3, .48, .74], lengths: [.16, .15, .18, .18], accents: [0, 2] },
    { id: "fusion-space", hits: [0, .22, .58, .9], lengths: [.22, .1, .24, .08], accents: [0, 2] },
  ],
  sequence: [
    { id: "sequence-march", hits: [0, .25, .5, .75], lengths: [.16, .15, .16, .18], accents: [0, 2] },
    { id: "sequence-gallop", hits: [0, .12, .31, .5, .62, .81], lengths: [.1, .1, .14, .1, .1, .15], accents: [0, 3] },
    { id: "sequence-hold", hits: [0, .24, .5], lengths: [.18, .13, .38], accents: [0, 2], finalHold: true },
  ],
  angular: [
    { id: "angular-stab", hits: [0, .17, .4, .66, .78], lengths: [.15, .1, .17, .12, .16], accents: [0, 2] },
    { id: "angular-gap", hits: [0, .28, .35, .68, .9], lengths: [.18, .1, .14, .15, .08], accents: [0, 3] },
    { id: "angular-lunge", hits: [0, .13, .52, .73], lengths: [.12, .15, .26, .16], accents: [0, 2] },
  ],
};

function parseChord(chord: string) {
  const match = chord.match(/^([A-G])([#b]?)(.*)/);
  if (!match) return { root: 0, quality: "" };
  return { root: pitchClasses[`${match[1]}${match[2]}`], quality: match[3] };
}

function chordPcs(chord: string) {
  const { root, quality } = parseChord(chord);
  const tones = chordTonesForQuality(root, quality);
  return tones.length === 3 ? [...tones, tones[0]] : tones;
}

function candidatesForPc(string: number, pc: number, nearFret: number) {
  return Array.from({ length: visibleFrets + 1 }, (_, fret) => ({ midi: guitarTuning[string] + fret, string, fret }))
    .filter((candidate) => mod(candidate.midi) === pc)
    .sort((a, b) => Math.abs(a.fret - nearFret) - Math.abs(b.fret - nearFret));
}

const defaultComfort: PlayingComfort = { maxShift: 4, maxStringTravel: 2, lineLeap: 8, preferredMinFret: 2, preferredMaxFret: 10 };

function leadCandidatesForPc(pc: number, nearMidi: number, position: number, comfort: PlayingComfort = defaultComfort, previous?: FretNote) {
  const score = (candidate: FretNote) => {
    const fretShift = previous ? Math.abs(candidate.fret - previous.fret) : Math.abs(candidate.fret - position);
    const stringTravel = previous ? Math.abs(candidate.string - previous.string) : Math.abs(candidate.string - 1);
    const outOfZone = candidate.fret < comfort.preferredMinFret ? comfort.preferredMinFret - candidate.fret : candidate.fret > comfort.preferredMaxFret ? candidate.fret - comfort.preferredMaxFret : 0;
    const hardShift = Math.max(0, fretShift - comfort.maxShift);
    const hardStringTravel = Math.max(0, stringTravel - comfort.maxStringTravel);
    return Math.abs(candidate.midi - nearMidi) * 0.78 + Math.abs(candidate.fret - position) * 0.34 + fretShift * 0.42 + stringTravel * 0.34 + hardShift * 4.8 + hardStringTravel * 3.2 + outOfZone * 0.7;
  };
  return guitarTuning.flatMap((open, string) => Array.from({ length: visibleFrets + 1 }, (_, fret) => ({ midi: open + fret, string, fret })))
    .filter((candidate) => mod(candidate.midi) === pc && candidate.midi >= 52 && candidate.midi <= 82)
    .sort((a, b) => score(a) - score(b));
}

function locateLeadPc(pc: number, nearMidi: number, position: number, comfort: PlayingComfort = defaultComfort, previous?: FretNote) {
  const candidates = leadCandidatesForPc(pc, nearMidi, position, comfort, previous);
  return candidates[0] ?? { midi: guitarTuning[0], string: 0, fret: 0 };
}

function solveCompactGrip(pcsHighToLow: number[], context: GripContext): CompactGrip | null {
  let best: CompactGrip | null = null;
  const gripSize = pcsHighToLow.length;
  for (let firstString = 0; firstString <= guitarTuning.length - gripSize; firstString += 1) {
    const strings = Array.from({ length: gripSize }, (_, index) => firstString + index);
    const choices = strings.map((string, index) => candidatesForPc(string, pcsHighToLow[index], index === 0 ? context.anchor.fret : context.handPosition).slice(0, 5));
    if (choices.some((options) => !options.length)) continue;
    const evaluate = (notes: FretNote[]) => {
      const frets = notes.map((note) => note.fret); const span = Math.max(...frets) - Math.min(...frets);
      const maxSpan = context.maxSpan + (context.allowOpenPedal && frets.includes(0) ? 1 : 0);
      if (span > maxSpan || notes.some((note, index) => index > 0 && note.midi >= notes[index - 1].midi)) return;
      const center = frets.reduce((sum, fret) => sum + fret, 0) / frets.length;
      const handShift = context.previousCenter === undefined ? Math.abs(center - context.handPosition) : Math.abs(center - context.previousCenter);
      const stringTravel = context.previousAnchor === undefined ? Math.abs(firstString - context.anchor.string) : Math.abs(firstString - context.previousAnchor.string);
      const excessShift = Math.max(0, handShift - context.maxShift);
      const excessStrings = Math.max(0, stringTravel - context.maxStringTravel);
      const score = span * 10 + Math.abs(center - context.handPosition) * 1.35 + Math.abs(firstString - context.anchor.string) * 0.9 + Math.abs(notes[0].midi - context.anchor.midi) * 0.48 + handShift * 1.1 + excessShift * 7 + excessStrings * 5;
      if (!best || score < best.score) best = { notes: [...notes].sort((a, b) => a.midi - b.midi), score, center };
    };
    const visit = (index: number, notes: FretNote[]) => {
      if (index === choices.length) { evaluate(notes); return; }
      choices[index].forEach((candidate) => visit(index + 1, [...notes, candidate]));
    };
    visit(0, []);
  }
  return best;
}

function compactFragment(anchor: FretNote, lowerVoicings: number[][], desiredSize: 2 | 3, context: Omit<GripContext, "anchor">) {
  let best: ReturnType<typeof solveCompactGrip> = null;
  const consider = (voices: number[]) => {
    const grip = solveCompactGrip([mod(anchor.midi), ...voices].slice(0, desiredSize), { ...context, anchor });
    if (grip && (!best || grip.score < best.score)) best = grip;
  };
  lowerVoicings.forEach(consider);
  if (best) return best;
  if (desiredSize === 3) {
    lowerVoicings.forEach((voices) => voices.forEach((voice) => {
      const grip = solveCompactGrip([mod(anchor.midi), voice], { ...context, anchor });
      if (grip && (!best || grip.score < best.score)) best = grip;
    }));
  }
  return best ?? { notes: [anchor], center: anchor.fret };
}

function playableFragmentFor(profile: PerformanceProfile, targetPc: number, nearMidi: number, requestedSize: 1 | 2 | 3, lowerVoicings: number[][], cursor: RiffCursor) {
  const anchors = leadCandidatesForPc(targetPc, nearMidi, cursor.handPosition, profile.comfort, cursor.anchor)
    .filter((anchor) => requestedSize === 1 || anchor.string <= guitarTuning.length - requestedSize)
    .slice(0, requestedSize === 1 ? 5 : 9);
  let best: PlayableFragment | null = null;
  for (const anchor of anchors) {
    const context = { handPosition: cursor.handPosition, previousCenter: cursor.gripCenter, previousAnchor: cursor.anchor, allowOpenPedal: Boolean(profile.comfort.pedalFriendly && profile.riff === "pedal"), maxSpan: profile.gripReach, maxShift: profile.comfort.maxShift, maxStringTravel: profile.comfort.maxStringTravel };
    const fragment = requestedSize === 1 ? { notes: [anchor], center: anchor.fret } : compactFragment(anchor, lowerVoicings, requestedSize as 2 | 3, context);
    const notes = fragment.notes;
    const lead = notes.reduce((highest, note) => note.midi > highest.midi ? note : highest, notes[0]);
    const frets = notes.map((note) => note.fret);
    const span = Math.max(...frets) - Math.min(...frets);
    const shift = cursor.gripCenter === undefined ? Math.abs(fragment.center - cursor.handPosition) : Math.abs(fragment.center - cursor.gripCenter);
    const travel = cursor.anchor === undefined ? Math.abs(lead.string - anchor.string) : Math.abs(lead.string - cursor.anchor.string);
    const score = Math.abs(requestedSize - notes.length) * 14 + span * 3 + shift + Math.max(0, shift - profile.comfort.maxShift) * 6 + Math.max(0, travel - profile.comfort.maxStringTravel) * 5 + Math.abs(lead.midi - nearMidi) * 0.18;
    if (!best || score < best.score) best = { notes, center: fragment.center, anchor: lead, score };
  }
  return best ?? { notes: [locateLeadPc(targetPc, nearMidi, cursor.handPosition, profile.comfort, cursor.anchor)], center: cursor.handPosition, anchor: locateLeadPc(targetPc, nearMidi, cursor.handPosition, profile.comfort, cursor.anchor), score: 99 };
}

function scaleFor(center: number, mode: Mode, artist: Artist) {
  const major = [0, 2, 4, 5, 7, 9, 11];
  const minor = [0, 2, 3, 5, 7, 8, 10];
  const scale = mode === "minor" ? minor : major;
  if (artist === "Yngwie Malmsteen") return [0, 2, 3, 5, 7, 8, 11].map((interval) => mod(center + interval));
  if (artist === "Owane" && mode === "major") return [0, 2, 4, 6, 7, 9, 11].map((interval) => mod(center + interval));
  return scale.map((interval) => mod(center + interval));
}

function phraseMotionFor(bar: number, bars: number, section: SectionType): PhraseMotion {
  if (bar === bars - 1) return "arrival";
  if (bar === 0) return "statement";
  if (section === "Chorus" && bar % 2 === 0) return "statement";
  return bar % 2 ? "answer" : "development";
}

function shapeCell(cell: RhythmCell, motion: PhraseMotion, pickup: number, holdBeats: number): RhythmCell {
  const times = [...cell.times]; const durations = [...cell.durations];
  // Displace a whole gesture on the beat grid; independent jitter destroyed its pocket.
  if (motion === "answer" && pickup >= .15) {
    for (let i = 0; i < times.length; i += 1) times[i] += .25;
  }
  // Reserve actual rhythmic room for an arrival, rather than lengthening a
  // final sixteenth note that still has only a sixteenth left before the barline.
  const landing = motion === "arrival" ? 4 - holdBeats : motion === "answer" ? 4 - holdBeats * .8 : 3.85;
  const keep = times.map((_, i) => i).filter((i) => times[i] <= landing);
  const last = keep.at(-1)!;
  if (motion === "arrival" || motion === "answer") durations[last] = Math.max(durations[last], 3.85 - times[last]);
  return { ...cell, times: keep.map((i) => times[i]), durations: keep.map((i) => durations[i]), accents: keep.flatMap((i, n) => cell.accents.includes(i) ? [n] : []) };
}

function makeRiffPlans(profile: PerformanceProfile, artist: Artist, bars: number, section: SectionType, complexity: number) {
  const phrasing = phrasingProfiles[artist];
  const available = [...rhythmBooks[profile.riff], ...(phrasing.cells ?? [])];
  const cells = available.filter((cell) => phrasing.rhythms.includes(cell.id));
  const motif = choose(phrasing.contours); const statement = choose(cells);
  const variation = Math.floor(Math.random() * 8) + complexity;
  const plans: RiffBarPlan[] = [];
  for (let bar = 0; bar < bars; bar += 1) {
    const phraseMotion = phraseMotionFor(bar, bars, section);
    // Recall a recognizable idea every two bars, with a changed ending as it develops.
    const recall = bar % 2 === 0;
    const alternatives = cells.filter((cell) => cell.id !== plans.at(-1)?.id);
    const selected = recall ? statement : choose(alternatives.length ? alternatives : cells);
    const contour = motif.map((degree, i) => {
      if (phraseMotion === "answer" && i > 1) return -Math.round(degree * .65);
      if (phraseMotion === "development" && i > 2) return degree + (bar % 4 === 2 ? 1 : -1);
      return degree;
    });
    const shaped = shapeCell(selected, phraseMotion, artistMotifs[artist].pickup, phrasing.holdBeats);
    plans.push({ ...shaped, variation, phraseMotion, contour });
  }
  return plans;
}

function targetPitchForPc(pc: number, nearMidi: number, comfort: PlayingComfort) {
  const options = Array.from({ length: 4 }, (_, octave) => pc + 12 * (4 + octave)).filter((midi) => midi >= 52 && midi <= 82);
  const score = (midi: number) => {
    const leap = Math.abs(midi - nearMidi);
    return leap + Math.max(0, leap - comfort.lineLeap) * 4.5;
  };
  return options.sort((a, b) => score(a) - score(b))[0] ?? nearMidi;
}

function textureSizeFor(profile: PerformanceProfile, plan: RiffBarPlan, bar: number, phraseIndex: number, remainingHits: number, complexity: number, isAccent: boolean, state: TextureState): 1 | 2 | 3 {
  const policy = profile.texture;
  if (state.singles + remainingHits < policy.minSingles) return 1;
  const canTriad = state.triads < policy.maxTriads && state.lastSize === 1 && (!policy.triadOnAccentOnly || isAccent) && complexity >= 3;
  const canDyad = state.dyads < policy.maxDyads && state.lastSize === 1 && complexity >= 2;
  const seed = mod(plan.variation + bar * 5 + phraseIndex * 3 + complexity, 10);
  const triadWeight = profile.riff === "fusion" ? 3 : profile.riff === "rock" ? 2 : complexity >= 5 ? 2 : 1;
  const dyadWeight = profile.riff === "pedal" || profile.riff === "interlock" || profile.riff === "angular" ? 5 : 4;
  if (canTriad && seed < triadWeight) return 3;
  if (canDyad && seed < triadWeight + dyadWeight) return 2;
  return 1;
}

function voicingsFor(profile: PerformanceProfile, artist: Artist, root: number, third: number, fifth: number, color: number) {
  if (artist === "Nick Johnston" || artist === "Marco Sfogli") return [[color, third], [third, root], [fifth, third], [fifth, root]];
  if (artist === "CHON" || artist === "Owane") return [[third, root], [fifth, third], [color, third], [fifth, root]];
  if (artist === "Guthrie Govan" || artist === "Greg Howe") return [[color, third], [fifth, third], [third, root], [fifth, root]];
  if (artist === "Yngwie Malmsteen") return [[fifth, root], [third, root], [fifth, third], [root, fifth]];
  if (profile.riff === "rock") return [[fifth, root], [third, root], [root, fifth], [color, fifth]];
  if (profile.riff === "interlock" || profile.riff === "angular") return [[third, root], [fifth, third], [third], [fifth], [root]];
  if (profile.riff === "fusion") return [[third, root], [fifth, third], [color, third], [fifth, root]];
  if (profile.riff === "pedal") return [[root, fifth], [fifth, root], [root], [fifth]];
  if (profile.riff === "sequence") return [[fifth, root], [third, root], [color, fifth], [fifth, third]];
  return [[third, root], [fifth, third], [color, third], [third], [fifth]];
}

function recordTexture(state: TextureState, size: number) {
  const actual = Math.min(3, Math.max(1, size)) as 1 | 2 | 3;
  if (actual === 1) state.singles += 1;
  else if (actual === 2) state.dyads += 1;
  else state.triads += 1;
  state.lastSize = actual;
}

function accentToneFor(artist: Artist, tones: number[], bar: number, phraseIndex: number, motion: PhraseMotion) {
  const motif = artistMotifs[artist];
  const index = motion === "arrival" ? motif.accentTones.at(-1) ?? 0 : motif.accentTones[mod(bar + phraseIndex, motif.accentTones.length)];
  return tones[mod(index, tones.length)];
}

function activeChordAt(harmony: HarmonyEvent[], time: number, fallback: string) {
  return harmony.findLast((event) => event.time <= time + 1e-6)?.chord ?? fallback;
}

function nearestPc(tones: number[], near: number) {
  return [...tones].sort((a, b) => Math.min(mod(a - near), mod(near - a)) - Math.min(mod(b - near), mod(near - b)))[0];
}

function scaleForChord(chord: string, regionalScale: number[]) {
  const { root, quality } = parseChord(chord);
  const tones = chordPcs(chord);
  if (tones.every((pc) => regionalScale.includes(pc))) return regionalScale;
  const intervals = quality.includes("alt") ? [0, 1, 3, 4, 6, 8, 10]
    : quality.includes("dim") ? [0, 2, 3, 5, 6, 8, 9, 11]
    : quality.includes("m7b5") ? [0, 1, 3, 5, 6, 8, 10]
    : /^m(?!aj)/.test(quality) ? [0, 2, 3, 5, 7, 9, 10]
    : quality.includes("b9") ? [0, 1, 4, 5, 7, 8, 10]
    : quality.includes("maj") ? [0, 2, 4, quality.includes("#11") ? 6 : 5, 7, 9, 11]
    : /7|9|13/.test(quality) && !quality.includes("add") && !quality.includes("6/9") ? [0, 2, 4, quality.includes("#11") ? 6 : 5, 7, 9, 10]
    : [0, 2, 4, 5, 7, 9, 11];
  return intervals.map((interval) => mod(root + interval));
}

function riffForBar(profile: PerformanceProfile, artist: Artist, section: SectionType, chord: string, center: number, mode: Mode, bar: number, barStart: number, barBeats: number, complexity: number, plan: RiffBarPlan, cursor: RiffCursor, harmony: HarmonyEvent[]) {
  const phrasing = phrasingProfiles[artist];
  const sourceIndexes = (section === "Intro" || section === "Outro") ? plan.times.map((_, index) => index).filter((index) => index % 2 === 0 || index === plan.times.length - 1) : plan.times.map((_, index) => index);
  const hitIndexes = complexity === 1 ? sourceIndexes.filter((_, index) => index % 2 === 0 || index === sourceIndexes.length - 1) : sourceIndexes;
  const texture: TextureState = { singles: 0, dyads: 0, triads: 0, lastSize: 1 };
  const baseScale = scaleFor(center, mode, artist);
  const openingTones = chordPcs(activeChordAt(harmony, barStart + plan.times[hitIndexes[0]] * barBeats / 4, chord));
  const openingPc = accentToneFor(artist, openingTones, bar % 2, 0, plan.phraseMotion);

  // Plan targets before realizing fingerings so approach notes know their destination.
  const targets = hitIndexes.map((sourceIndex, phraseIndex) => {
    const time = barStart + plan.times[sourceIndex] * barBeats / 4;
    const activeChord = activeChordAt(harmony, time, chord);
    const tones = chordPcs(activeChord);
    const last = phraseIndex === hitIndexes.length - 1;
    const nextTime = hitIndexes[phraseIndex + 1] === undefined ? barStart + barBeats : barStart + plan.times[hitIndexes[phraseIndex + 1]] * barBeats / 4;
    const room = nextTime - time;
    const sustain = last && ["answer", "arrival"].includes(plan.phraseMotion);
    const writtenLength = plan.durations[sourceIndex] * barBeats / 4;
    const connected = room <= .55 && phrasing.gate >= .8;
    const duration = Math.max(.06, Math.min(room - .015, sustain ? room * .97 : connected ? room * phrasing.gate : writtenLength * phrasing.gate));
    const accent = plan.accents.includes(sourceIndex) || phraseIndex === 0 || last
      || Math.abs((time - barStart) % 1) < .01 || duration >= .65;
    const degree = plan.contour[phraseIndex % plan.contour.length];
    const scale = scaleForChord(activeChord, baseScale);
    const anchorIndex = scale.indexOf(nearestPc(scale, openingPc));
    const desired = scale[mod(anchorIndex + degree, scale.length)];
    const pedal = artistMotifs[artist].pedalEvery;
    // Long notes prefer structural tones. Explicit extensions remain available
    // in moving lines, but an altered ninth is not treated like a tonic arrival.
    let stableTones = duration >= .65 ? tones.slice(0, 3) : tones;
    for (const change of harmony.filter((event) => event.time > time + 1e-6 && event.time < time + duration)) {
      const common = stableTones.filter((pc) => chordPcs(change.chord).includes(pc));
      if (common.length) stableTones = common;
    }
    let pc = accent ? nearestPc(stableTones, desired) : desired;
    if (pedal && phraseIndex % pedal === 0 && stableTones.includes(tones[0])) pc = tones[0];
    else if (!accent && complexity >= 3 && Math.random() < phrasing.arpeggio) pc = tones[mod(phraseIndex + plan.variation, tones.length)];
    if (last && plan.phraseMotion === "arrival") pc = nearestPc(stableTones, tones[section === "Pre-chorus" ? 1 : 0]);
    return { time, pc, tones, accent, last, sourceIndex, duration };
  });
  if (complexity >= 3) targets.forEach((target, i) => {
    const next = targets[i + 1];
    if (!target.accent && next?.accent && next.time - target.time <= .55 && Math.random() < phrasing.approach) {
      target.pc = mod(next.pc + (plan.variation % 2 ? -1 : 1));
      target.duration = Math.min(target.duration, .24);
    }
  });
  // Weak-beat scale color is a passing gesture only when it has a nearby
  // chord-tone destination. Work backwards so each resolution is already fixed.
  for (let i = targets.length - 1; i >= 0; i -= 1) {
    const target = targets[i]; const next = targets[i + 1];
    if (target.tones.includes(target.pc)) continue;
    const step = next ? Math.min(mod(next.pc - target.pc), mod(target.pc - next.pc)) : 99;
    if (!next || !next.tones.includes(next.pc) || next.time - target.time > .55 || step > 2) target.pc = nearestPc(target.tones, target.pc);
    else target.duration = Math.min(target.duration, .3);
  }
  return targets.map((target, phraseIndex) => {
    const { time, pc, tones, accent, last } = target;
    const targetMidi = targetPitchForPc(pc, cursor.midi, profile.comfort);
    const [root, third, fifth, color] = tones;
    const nextTime = targets[phraseIndex + 1]?.time ?? barStart + barBeats;
    const room = nextTime - time;
    // Fast passages stay monophonic; a grip on every accent interrupts a line.
    const requestedSize = room < .4 || !tones.includes(pc) ? 1 : textureSizeFor(profile, plan, bar, phraseIndex, targets.length - phraseIndex - 1, complexity, accent, texture);
    let fragment = playableFragmentFor(profile, pc, targetMidi, requestedSize, voicingsFor(profile, artist, root, third, fifth, color), cursor);
    if ((fragment.notes.length === 2 && texture.dyads >= profile.texture.maxDyads) || (fragment.notes.length === 3 && texture.triads >= profile.texture.maxTriads)) {
      fragment = playableFragmentFor(profile, pc, targetMidi, 1, [], cursor);
    }
    recordTexture(texture, fragment.notes.length);
    cursor.midi = fragment.anchor.midi; cursor.anchor = fragment.anchor;
    cursor.gripCenter = fragment.center; cursor.handPosition = clamp(Math.round(fragment.center), 1, 10);
    const duration = Math.min(target.duration, harmonicRoom(harmony, time, time + target.duration, fragment.notes.map((note) => mod(note.midi))));
    const arch = Math.sin((phraseIndex + 1) / (targets.length + 1) * Math.PI);
    const velocity = clamp(.56 + complexity * .025 + (accent ? phrasing.dynamicRange : .03) + arch * .055 - (last && plan.phraseMotion === "answer" ? .055 : 0), .45, .95);
    return { time, duration, notes: fragment.notes, velocity };
  });
}

function chordVoicingPlans(artist?: Artist) {
  const originalPlans = [[3, 2, 1, 0], [3, 2, 0], [3, 1, 0], [3, 2, 1]];
  const styledPlans = artist === "CHON" || artist === "Owane" ? [[1, 3, 0], [2, 3, 1], [0, 3, 1]]
    : artist === "Guthrie Govan" || artist === "Greg Howe" ? [[1, 3, 0], [2, 3, 1], [0, 3, 2]]
    : artist === "Yngwie Malmsteen" || artist === "Moray Pringle" ? [[2, 3, 0], [0, 3, 2], [1, 3, 0]]
    : [[1, 3, 0], [2, 3, 1], [0, 3, 1]];
  return [...originalPlans, ...styledPlans];
}

/** Builds a color-preserving voicing from physically playable, contiguous
 * string sets. `variant` changes the grip without changing the chord tones. */
export function createChordPreview(chord: string, position = 5, artist?: Artist, variant = 0, compact = false, previous?: FretNote[]): PerformanceEvent {
  const allTones = chordPcs(chord);
  // In extended voicings the third and seventh define the quality. Drop the
  // fifth before either guide tone; otherwise maj9 and dominant9 sound alike.
  const extended = allTones.length > 4;
  const tones = extended ? [allTones[0], allTones[1], allTones.at(-1)!, allTones[3]] : allTones;
  const candidates = chordVoicingPlans(artist).flatMap((indexes, planIndex) => {
    const pcs = indexes.reduce<number[]>((result, index) => {
      const pc = tones[index];
      if (pc !== undefined && !result.includes(pc)) result.push(pc);
      return result;
    }, []);
    if (compact && pcs.length > 3) return [];
    if (pcs.length < 3) tones.forEach((pc) => { if (pcs.length < 3 && !pcs.includes(pc)) pcs.push(pc); });
    if (pcs.length < 3) return [];
    const anchor = locateLeadPc(pcs[0], 63 + position, position + 1);
    const context = { handPosition: position, previousCenter: undefined, previousAnchor: undefined, allowOpenPedal: false, maxSpan: 4, maxShift: 4, maxStringTravel: 2 };
    const grip = solveCompactGrip(pcs, { ...context, anchor });
    if (!grip) return [];
    const frets = grip.notes.map((note) => note.fret);
    const frettedFingers = new Set(frets.filter((fret) => fret > 0)).size;
    const pitchSpread = Math.max(...grip.notes.map((note) => note.midi)) - Math.min(...grip.notes.map((note) => note.midi));
    if (frettedFingers > 4 || pitchSpread > 20) return [];
    const colorPresent = grip.notes.some((note) => mod(note.midi) === tones[3]);
    const missingGuides = extended ? [tones[1], tones[2]].filter((pc) => !grip.notes.some((note) => mod(note.midi) === pc)).length : 0;
    const movement = previous?.length ? grip.notes.reduce((sum, note) => sum + Math.min(...previous.map((prior) => Math.abs(note.midi - prior.midi))), 0) / grip.notes.length
      + Math.abs(Math.max(...grip.notes.map((note) => note.midi)) - Math.max(...previous.map((note) => note.midi))) * .6 : 0;
    const score = movement * 4 + grip.score + missingGuides * 75 + planIndex * .22 + (colorPresent ? 0 : 40) + (grip.notes.length === 4 ? (compact ? 8 : -.5) : 0);
    return [{ ...grip, score, missingGuides, colorPresent }];
  }).sort((a, b) => a.score - b.score);
  const complete = candidates.filter((candidate) => candidate.missingGuides === 0 && candidate.colorPresent);
  const eligible = complete.length ? complete : candidates;
  const pool = eligible.slice(0, Math.min(5, eligible.length));
  const chosen = previous?.length ? pool[0] : pool[mod(variant + chord.split("").reduce((sum, letter) => sum + letter.charCodeAt(0), 0), Math.max(1, pool.length))];
  if (chosen) return { time: 0, duration: 0.92, notes: chosen.notes, velocity: 0.75 };
  const color = tones[3]; const anchor = locateLeadPc(color, 67, position + 1);
  return { time: 0, duration: 0.92, notes: [anchor], velocity: 0.75 };
}

function weightedMeter(artist: Artist, meters: TimeSignature[]) {
  const weights = artistMotifs[artist].meterWeights;
  const total = meters.reduce((sum, meter) => sum + (weights[meter.label] ?? 1), 0);
  let threshold = Math.random() * total;
  for (const meter of meters) {
    threshold -= weights[meter.label] ?? 1;
    if (threshold <= 0) return meter;
  }
  return meters[0];
}

function meterMapFor(profile: PerformanceProfile, artist: Artist, bars: number, rhythmComplexity: number): MeterMap {
  const startsFor = (meters: TimeSignature[]) => {
    let cursor = 0; const starts = meters.map((meter) => { const start = cursor; cursor += meter.beatsPerBar; return start; });
    return { meters, starts, totalBeats: cursor };
  };
  const basic = Array.from({ length: bars }, () => fourFour);
  if (rhythmComplexity < 4) return startsFor(basic);
  const alternatives = profile.meters.filter((meter) => meter.label !== fourFour.label);
  if (!alternatives.length) return startsFor(basic);
  if (rhythmComplexity === 4) {
    const meter = weightedMeter(artist, alternatives);
    return startsFor(Array.from({ length: bars }, () => meter));
  }
  const meters = [...basic];
  if (bars > 1) meters[1] = weightedMeter(artist, alternatives);
  if (bars > 3) {
    const laterChoices = profile.meters.filter((meter) => meter.label !== meters[1].label);
    meters[bars - 1] = weightedMeter(artist, laterChoices.length ? laterChoices : alternatives);
  }
  return startsFor(meters);
}

function chordFeelFor(profile: PerformanceProfile, rhythmComplexity: number): HarmonicPhrasing {
  if (rhythmComplexity <= 1) return "downbeat";
  if (rhythmComplexity === 2 && profile.chordFeel === "split") return "anticipate";
  return profile.chordFeel;
}

function harmonyForSection(profile: PerformanceProfile, artist: Artist, progression: string[], meterMap: MeterMap, rhythmComplexity: number): HarmonyEvent[] {
  const feel = chordFeelFor(profile, rhythmComplexity);
  let previous: FretNote[] | undefined;
  // One harmonic timeline drives every pitched lane. Offbeat changes are
  // eighth-note pushes/delays; split changes anticipate by one beat.
  const events = progression.map((chord, bar) => {
    const start = meterMap.starts[bar]; const beats = meterMap.meters[bar].beatsPerBar;
    const previousBeats = meterMap.meters[bar - 1]?.beatsPerBar ?? beats;
    const time = bar === 0 ? 0 : feel === "anticipate" ? start - previousBeats / 8
      : feel === "late" ? start + beats / 8 : feel === "split" ? start - previousBeats / 4 : start;
    const voicing = createChordPreview(chord, profile.position, artist, bar, false, previous);
    previous = voicing.notes;
    return { ...voicing, chord, bar, time, duration: 1, velocity: .64 };
  });
  return events.map((event, index) => ({ ...event, duration: (events[index + 1]?.time ?? meterMap.totalBeats) - event.time - .015 }));
}

/** Stop a ringing note at a change unless all its voices belong to both chords. */
function harmonicRoom(harmony: HarmonyEvent[], time: number, end: number, pcs: number[]) {
  const change = harmony.find((event) => event.time > time + 1e-6 && event.time < end
    && !pcs.every((pc) => chordPcs(event.chord).includes(pc)));
  return change ? Math.max(.01, change.time - time - .015) : end - time;
}

function nearestTimeDistance(time: number, events: PerformanceEvent[]) {
  return events.length ? Math.min(...events.map((event) => Math.abs(event.time - time))) : 99;
}

function chordRhythmCellScore(profile: PerformanceProfile, cell: ChordRhythmCell, start: number, barBeats: number, section: SectionType, riff: PerformanceEvent[]) {
  const barRiff = riff.filter((event) => event.time >= start - .01 && event.time < start + barBeats - .01);
  if (!barRiff.length) return cell.finalHold ? 5 : 0;
  const peakVelocity = Math.max(...barRiff.map((event) => event.velocity));
  const riffAccents = barRiff.filter((event) => event.velocity >= Math.max(.72, peakVelocity - .045));
  const alignmentBias = profile.riff === "rock" || profile.riff === "interlock" || profile.riff === "sequence" ? .88
    : profile.riff === "fusion" || profile.riff === "angular" ? .78 : .66;
  const targetDensity: Record<RiffKind, number> = { melodic: 2.3, rock: 3.8, interlock: 5.1, pedal: 3.7, fusion: 4.4, sequence: 4.8, angular: 4.3 };
  const alignmentWindow = Math.max(.1, barBeats / 32);
  const openSpaceWindow = Math.max(.24, barBeats / 14);
  let score = -Math.abs(cell.hits.length - targetDensity[profile.riff]) * 1.4;
  let aligned = 0; let answers = 0; let clutter = 0;

  cell.hits.forEach((fraction, hit) => {
    const time = start + fraction * barBeats;
    const accentDistance = nearestTimeDistance(time, riffAccents);
    const riffDistance = nearestTimeDistance(time, barRiff);
    if (accentDistance <= alignmentWindow) { aligned += 1; score += 3 + alignmentBias * 3; }
    else if (riffDistance >= openSpaceWindow) { answers += 1; score += 1.25 + (1 - alignmentBias) * 1.6; }
    else if (riffDistance <= alignmentWindow) { clutter += 1; score -= 2.8 - alignmentBias * 1.4; }
    else score += .35;
    if (cell.accents.includes(hit) && (accentDistance <= alignmentWindow || riffDistance >= openSpaceWindow)) score += 1.15;
  });

  if (aligned === 0) score -= profile.riff === "melodic" ? 1.5 : 4;
  if (answers === 0 && profile.riff !== "rock" && profile.riff !== "sequence") score -= 2.8;
  if (aligned > 0 && answers > 0) score += 2.1;
  if (clutter > Math.ceil(cell.hits.length / 2)) score -= 5;
  if (section === "Chorus" && cell.hits[0] === 0) score += 1.8;
  return score + Math.random() * .75;
}

function chordRhythmForSection(profile: PerformanceProfile, artist: Artist, progression: string[], meterMap: MeterMap, section: SectionType, riff: PerformanceEvent[], harmony: HarmonyEvent[]): HarmonyEvent[] {
  const cells = chordRhythmBooks[profile.riff];
  let previousCell = "";
  let previousVoicing: FretNote[] | undefined;
  return progression.flatMap((chord, bar) => {
    const meter = meterMap.meters[bar]; const start = meterMap.starts[bar]; const barBeats = meter.beatsPerBar;
    const ranked = cells.map((cell) => ({ cell, score: chordRhythmCellScore(profile, cell, start, barBeats, section, riff) - (cell.id === previousCell ? 2.2 : 0) })).sort((a, b) => b.score - a.score);
    const cell = ranked[0].cell;
    previousCell = cell.id;
    const barRiff = riff.filter((event) => event.time >= start - .01 && event.time < start + barBeats - .01);
    const peakVelocity = barRiff.length ? Math.max(...barRiff.map((event) => event.velocity)) : 0;
    const riffAccents = barRiff.filter((event) => event.velocity >= Math.max(.72, peakVelocity - .045));
    const snapWindow = .36 / barBeats;
    const accentFractions = riffAccents.map((event) => clamp((event.time - start) / barBeats, 0, .98));
    const hitPlan = cell.hits.map((fraction, originalHit) => {
      const nearestAccent = accentFractions.slice().sort((a, b) => Math.abs(a - fraction) - Math.abs(b - fraction))[0];
      const snapped = nearestAccent !== undefined && Math.abs(nearestAccent - fraction) <= snapWindow ? nearestAccent : fraction;
      return { fraction: snapped, originalHit, forcedAccent: nearestAccent === snapped };
    });
    const missingAccent = accentFractions.find((fraction) => fraction > .04 && hitPlan.every((hit) => Math.abs(hit.fraction - fraction) > snapWindow));
    if (missingAccent !== undefined && hitPlan.length < (profile.riff === "melodic" ? 3 : 6)) hitPlan.push({ fraction: missingAccent, originalHit: -1, forcedAccent: true });
    const uniqueHits = Array.from(new Map(hitPlan.sort((a, b) => a.fraction - b.fraction).map((hit) => [Math.round(hit.fraction * 64), hit])).values());
    return uniqueHits.map((planned, hit) => {
      const fraction = planned.fraction;
      const nextFraction = uniqueHits[hit + 1]?.fraction ?? 1;
      const time = start + barBeats * fraction;
      const active = harmony.findLast((event) => event.time <= time + 1e-6);
      const soundingChord = active?.chord ?? chord;
      const voicing = createChordPreview(soundingChord, profile.position, artist, bar * 7, true, previousVoicing);
      previousVoicing = voicing.notes;
      const aligned = nearestTimeDistance(time, riffAccents) <= Math.max(.1, barBeats / 32);
      const inSpace = nearestTimeDistance(time, barRiff) >= Math.max(.24, barBeats / 14);
      let duration = cell.finalHold && hit === uniqueHits.length - 1
        ? Math.max(.26, barBeats * (1 - fraction) * .86)
        : Math.min(barBeats * (cell.lengths[Math.max(0, planned.originalHit)] ?? .16), Math.max(.12, barBeats * (nextFraction - fraction) - .045));
      const nextRiff = barRiff.find((event) => event.time > time + .09);
      if (inSpace && nextRiff) duration = Math.min(duration, Math.max(.12, nextRiff.time - time - .045));
      duration = Math.min(duration, harmonicRoom(harmony, time, time + duration, voicing.notes.map((note) => mod(note.midi))));
      const accented = planned.forcedAccent || cell.accents.includes(planned.originalHit);
      return {
        ...voicing,
        chord: soundingChord,
        bar: active?.bar ?? bar,
        time,
        duration,
        velocity: aligned ? (accented ? .86 : .74) : inSpace ? (accented ? .78 : .66) : (accented ? .7 : .56),
      };
    });
  }).sort((a, b) => a.time - b.time || a.bar - b.bar);
}

function locateBassPc(pc: number, nearMidi: number): FretNote {
  const candidates = bassTuning.flatMap((open, string) => Array.from({ length: visibleFrets + 1 }, (_, fret) => ({ midi: open + fret, string, fret })))
    .filter((note) => mod(note.midi) === pc && note.midi <= 60)
    .sort((a, b) => Math.abs(a.midi - nearMidi) - Math.abs(b.midi - nearMidi) || a.fret - b.fret);
  return candidates[0] ?? { midi: 28, string: 3, fret: 0 };
}

function bassForSection(profile: PerformanceProfile, meterMap: MeterMap, chordRhythm: HarmonyEvent[], riff: PerformanceEvent[], complexity: number, harmony: HarmonyEvent[]): HarmonyEvent[] {
  let previousMidi = 40;
  const events = chordRhythm.map((stab, index) => {
    const { root } = parseChord(stab.chord);
    const chordTones = chordPcs(stab.chord);
    const simultaneous = riff.slice().sort((a, b) => Math.abs(a.time - stab.time) - Math.abs(b.time - stab.time))[0];
    const simultaneousPc = simultaneous && Math.abs(simultaneous.time - stab.time) <= .14 ? mod(highestNote(simultaneous)?.midi ?? root) : undefined;
    const chordHitIndex = chordRhythm.filter((event) => event.bar === stab.bar && event.time <= stab.time + .001).length - 1;
    let targetPc = root;
    if (chordHitIndex > 0 && simultaneousPc !== undefined && chordTones.slice(0, 3).includes(simultaneousPc) && ["melodic", "interlock", "fusion", "angular"].includes(profile.riff)) targetPc = simultaneousPc;
    else if (chordHitIndex > 0 && profile.riff === "fusion") targetPc = chordTones[chordHitIndex % Math.min(3, chordTones.length)] ?? root;
    else if (chordHitIndex > 0 && ["rock", "interlock", "sequence"].includes(profile.riff) && chordHitIndex % 2 === 1) targetPc = chordTones[2] ?? root;
    const next = chordRhythm[index + 1];
    // A chromatic pickup must resolve to the next root within half a beat.
    // Previously any last hit in a bar could become a long, exposed wrong bass.
    const approach = complexity >= 4 && next && next.chord !== stab.chord
      && next.time - stab.time <= .5 && ["fusion", "angular"].includes(profile.riff);
    if (approach) {
      const nextRoot = parseChord(next.chord).root;
      targetPc = mod(nextRoot - 1);
    }
    const preferred = approach ? 40 + mod(parseChord(next.chord).root - 4) - 1
      : targetPc === root && chordHitIndex > 0 && profile.riff === "pedal" ? previousMidi : 40 + mod(targetPc - 4);
    const note = locateBassPc(targetPc, preferred);
    previousMidi = note.midi;
    const room = next ? Math.max(.12, next.time - stab.time - .045) : Math.max(.16, meterMap.totalBeats - stab.time - .04);
    const duration = Math.min(room, approach ? .22 : Math.max(.16, stab.duration * (profile.riff === "melodic" ? 1.35 : .92)), harmonicRoom(harmony, stab.time, stab.time + room, [targetPc]));
    return { chord: stab.chord, bar: stab.bar, time: stab.time, duration, velocity: clamp(stab.velocity + .02, .5, .9), notes: [note] };
  });
  return events.sort((a, b) => a.time - b.time || a.bar - b.bar);
}

function drumTrackForSection(profile: PerformanceProfile, section: SectionType, meterMap: MeterMap, chordRhythm: HarmonyEvent[], riff: PerformanceEvent[], rhythmComplexity: number): PerformanceEvent[] {
  const drums = new Map<string, PerformanceEvent>();
  const add = (midi: number, time: number, duration: number, velocity: number) => {
    const key = `${midi}:${Math.round(time * 32)}`;
    const existing = drums.get(key);
    if (!existing || existing.velocity < velocity) drums.set(key, { time, duration, velocity: clamp(velocity, .2, .98), notes: [{ midi, string: 0, fret: 0 }] });
  };
  const distanceTo = (time: number, times: number[]) => times.length ? Math.min(...times.map((other) => Math.abs(other - time))) : 99;
  meterMap.meters.forEach((meter, bar) => {
    const start = meterMap.starts[bar]; const end = start + meter.beatsPerBar;
    const barRiff = riff.filter((event) => event.time >= start - .01 && event.time < end - .01);
    const peak = barRiff.length ? Math.max(...barRiff.map((event) => event.velocity)) : 0;
    const riffAccents = barRiff.filter((event) => event.velocity >= Math.max(.72, peak - .045)).map((event) => event.time);
    const stabAccents = chordRhythm.filter((event) => event.time >= start && event.time < end && event.velocity >= .72).map((event) => event.time);
    const sharedAccents = Array.from(new Set([start, ...riffAccents, ...stabAccents].map((time) => Math.round(time * 16) / 16))).sort((a, b) => a - b);
    const hatStep = rhythmComplexity >= 4 || ["interlock", "fusion", "sequence", "angular"].includes(profile.riff) ? .25 : .5;
    for (let time = start; time < end - .03; time += hatStep) {
      const shared = distanceTo(time, sharedAccents) <= .08;
      const openHat = (profile.riff === "fusion" || profile.riff === "angular") && time + hatStep >= end - .03;
      add(openHat ? 46 : 42, time, openHat ? .18 : .08, shared ? .78 : (Math.round((time - start) / hatStep) % 2 ? .42 : .58));
    }
    const kicks = sharedAccents.filter((_, index) => profile.riff !== "melodic" || index % 2 === 0);
    if (["rock", "sequence"].includes(profile.riff) && rhythmComplexity >= 2) kicks.push(start + meter.beatsPerBar * .5);
    kicks.forEach((time, index) => add(36, time, .1, index === 0 ? .94 : .72 + (distanceTo(time, riffAccents) <= .08 ? .1 : 0)));
    const backbeats = meter.beatsPerBar >= 3.5 ? [start + meter.beatsPerBar * .25, start + meter.beatsPerBar * .75] : [start + meter.beatsPerBar * .5];
    backbeats.forEach((time) => add(38, time, .11, profile.riff === "melodic" ? .68 : .84));
    if (rhythmComplexity >= 3 && ["fusion", "angular", "interlock"].includes(profile.riff)) {
      const ghost = sharedAccents.find((time) => distanceTo(time, backbeats) > .28 && time > start + .2);
      if (ghost !== undefined) add(38, ghost, .07, .38);
    }
    if (bar === 0 && (section === "Chorus" || section === "Solo" || section === "Intro")) add(49, start, .3, section === "Chorus" ? .92 : .76);
  });
  return Array.from(drums.values()).sort((a, b) => a.time - b.time || a.notes[0].midi - b.notes[0].midi);
}

export function createPerformanceIdea(artist: Artist, section: SectionType, progression: string[], localCenters: number[], mode: Mode, complexity: number, rhythmComplexity = 2): PerformanceIdea {
  const profile = performanceProfiles[artist]; const meterMap = meterMapFor(profile, artist, progression.length, rhythmComplexity); const plans = makeRiffPlans(profile, artist, progression.length, section, complexity); const cursor: RiffCursor = { midi: 59 + complexity, handPosition: profile.position };
  const harmony = harmonyForSection(profile, artist, progression, meterMap, rhythmComplexity);
  const riff = progression.flatMap((chord, bar) => riffForBar(profile, artist, section, chord, localCenters[bar] ?? localCenters[0], mode, bar, meterMap.starts[bar], meterMap.meters[bar].beatsPerBar, complexity, plans[bar], cursor, harmony));
  const chordRhythm = chordRhythmForSection(profile, artist, progression, meterMap, section, riff, harmony);
  const bass = bassForSection(profile, meterMap, chordRhythm, riff, complexity, harmony);
  const drums = drumTrackForSection(profile, section, meterMap, chordRhythm, riff, rhythmComplexity);
  const tempoLift = section === "Solo" ? 8 : section === "Chorus" ? 4 : 0;
  return { tempo: profile.tempo + tempoLift + Math.floor(Math.random() * 7) - 3, riffStyle: profile.riffLabel, meter: meterMap.meters[0], meterMap, harmony, chordRhythm, bass, drums, riff };
}

/** Adds newly introduced accompaniment lanes when an older saved Logic state
 * is reopened, without changing its chart, riff, meter, or tempo. */
export function completePerformanceIdea(artist: Artist, section: SectionType, progression: string[], complexity: number, rhythmComplexity: number, source: PerformanceIdea): PerformanceIdea {
  const profile = performanceProfiles[artist];
  const legacy = source as PerformanceIdea & { bass?: HarmonyEvent[]; drums?: PerformanceEvent[]; chordRhythm?: HarmonyEvent[] };
  const hasVoicing = (event: HarmonyEvent) => event.notes?.length && event.notes.every((note) => chordPcs(event.chord).includes(mod(note.midi)) && note.midi === guitarTuning[note.string] + note.fret && note.fret >= 0 && note.fret <= visibleFrets);
  const harmony = source.harmony.map((event, index) => hasVoicing(event) ? event : { ...event, notes: createChordPreview(event.chord, profile.position + (event.bar % 2), artist, index).notes });
  const savedChordRhythm = legacy.chordRhythm?.length ? legacy.chordRhythm : chordRhythmForSection(profile, artist, progression, source.meterMap, section, source.riff, harmony);
  const restoredVoicings = new Map<string, FretNote[]>();
  const chordRhythm = savedChordRhythm.map((event) => {
    if (hasVoicing(event)) return event;
    const key = `${event.bar}:${event.chord}`;
    let notes = restoredVoicings.get(key);
    if (!notes) {
      notes = createChordPreview(event.chord, profile.position + (event.bar % 3) - 1, artist, event.bar * 7, true).notes;
      restoredVoicings.set(key, notes);
    }
    return { ...event, notes };
  });
  const bass = legacy.bass?.length ? legacy.bass : bassForSection(profile, source.meterMap, chordRhythm, source.riff, complexity, harmony);
  const drums = legacy.drums?.length ? legacy.drums : drumTrackForSection(profile, section, source.meterMap, chordRhythm, source.riff, rhythmComplexity);
  return { ...source, harmony, chordRhythm, bass, drums };
}

/** Makes a fresh lead idea while preserving the exact chart, meter map,
 * sustained harmony, chord-stab lane, and tempo of the source idea. */
export function regenerateRiffIdea(artist: Artist, section: SectionType, progression: string[], localCenters: number[], mode: Mode, complexity: number, source: PerformanceIdea): PerformanceIdea {
  const profile = performanceProfiles[artist]; const plans = makeRiffPlans(profile, artist, progression.length, section, complexity);
  const cursor: RiffCursor = { midi: 59 + complexity, handPosition: profile.position };
  const riff = progression.flatMap((chord, bar) => riffForBar(profile, artist, section, chord, localCenters[bar] ?? localCenters[0], mode, bar, source.meterMap.starts[bar], source.meterMap.meters[bar].beatsPerBar, complexity, plans[bar], cursor, source.harmony));
  return { ...source, riffStyle: profile.riffLabel, riff };
}

function shapeSignature(event: PerformanceEvent) {
  return event.notes.slice().sort((a, b) => a.string - b.string).map((note) => `${note.string}:${note.fret}`).join("|");
}

function rhythmSignature(events: PerformanceEvent[], start: number, end: number) {
  return events.filter((event) => event.time >= start - 0.01 && event.time < end - 0.01)
    .map((event) => `${Math.round((event.time - start) * 8)}:${Math.round(event.duration * 8)}`).join("|");
}

function isGuitaristicEvent(event: PerformanceEvent, profile: PerformanceProfile) {
  if (!event.notes.length || event.notes.length > 3 || event.notes.some((note) => note.fret < 0 || note.fret > visibleFrets)) return false;
  if (event.notes.length === 1) return true;
  const strings = event.notes.map((note) => note.string).sort((a, b) => a - b);
  const frets = event.notes.map((note) => note.fret);
  const contiguous = strings.every((string, index) => index === 0 || string === strings[index - 1] + 1);
  const uniqueStrings = new Set(strings).size === strings.length;
  const span = Math.max(...frets) - Math.min(...frets);
  return contiguous && uniqueStrings && span <= profile.gripReach + (profile.comfort.pedalFriendly && frets.includes(0) ? 1 : 0);
}

function highestNote(event: PerformanceEvent | undefined) {
  if (!event?.notes.length) return undefined;
  return event.notes.reduce((highest, note) => note.midi > highest.midi ? note : highest, event.notes[0]);
}

/** Scores an already-generated performance without making it deterministic.
 * It gives whole-section selection a preference for playable, profile-shaped
 * ideas rather than simply choosing the densest or newest random candidate. */
export function scorePerformanceIdea(artist: Artist, section: SectionType, idea: PerformanceIdea, previous?: PerformanceIdea) {
  const profile = performanceProfiles[artist];
  const events = idea.riff.slice().sort((a, b) => a.time - b.time);
  if (!events.length) return -1000;
  let score = 0;
  const barCount = Math.max(1, idea.meterMap.meters.length);
  let singles = 0; let dyads = 0; let triads = 0;
  let awkwardMoves = 0;
  let lastLead: FretNote | undefined;
  let lastCenter: number | undefined;
  const shapes = new Set<string>();

  events.forEach((event) => {
    if (isGuitaristicEvent(event, profile)) score += 5;
    else score -= 32;
    if (event.notes.length === 1) singles += 1;
    else if (event.notes.length === 2) dyads += 1;
    else triads += 1;
    const lead = highestNote(event)!;
    const center = event.notes.reduce((sum, note) => sum + note.fret, 0) / event.notes.length;
    if (lastLead && lastCenter !== undefined) {
      const fretShift = Math.abs(center - lastCenter); const stringTravel = Math.abs(lead.string - lastLead.string); const pitchLeap = Math.abs(lead.midi - lastLead.midi);
      if (fretShift > profile.comfort.maxShift + 1 || stringTravel > profile.comfort.maxStringTravel + 1 || pitchLeap > profile.comfort.lineLeap + 5) awkwardMoves += 1;
      else score += 0.45;
    }
    if (event.notes.length > 1) {
      const signature = shapeSignature(event);
      if (shapes.has(signature)) score -= 1.7;
      else { shapes.add(signature); score += 0.8; }
    }
    lastLead = lead; lastCenter = center;
  });

  score = score / events.length * 4;
  score -= awkwardMoves / Math.max(1, events.length - 1) * 35;
  singles /= barCount; dyads /= barCount; triads /= barCount;
  score += singles >= profile.texture.minSingles ? 5 : -8;
  score += Math.min(dyads, profile.texture.maxDyads) * 1.35 + Math.min(triads, profile.texture.maxTriads) * 1.65;
  score -= Math.max(0, dyads - profile.texture.maxDyads) * 4 + Math.max(0, triads - profile.texture.maxTriads) * 5;
  if (["interlock", "angular", "pedal"].includes(profile.riff) && dyads + triads === 0) score -= 5.5;

  const barRhythms = idea.meterMap.meters.map((meter, bar) => rhythmSignature(events, idea.meterMap.starts[bar], idea.meterMap.starts[bar] + meter.beatsPerBar));
  const uniqueRhythms = new Set(barRhythms).size;
  const targetRhythms = profile.riff === "sequence" ? 2 : profile.riff === "pedal" || profile.riff === "interlock" ? 3 : 3;
  score += uniqueRhythms >= targetRhythms ? 6 : uniqueRhythms * 1.2;
  if (barRhythms.length > 2 && barRhythms[0] === barRhythms[2]) score += 2.5;
  if (barRhythms.length > 1 && barRhythms.every((signature) => signature === barRhythms[0])) score -= 10;

  const allowedMeters = new Set(profile.meters.map((meter) => meter.label));
  idea.meterMap.meters.forEach((meter) => { score += allowedMeters.has(meter.label) ? 1 : -8; });
  const finalHarmony = idea.harmony.at(-1);
  const finalLead = highestNote(events.at(-1));
  if (finalHarmony && finalLead && chordPcs(finalHarmony.chord).includes(mod(finalLead.midi))) score += section === "Pre-chorus" ? 1.5 : 4;

  if (previous?.riff.length) {
    const priorLead = highestNote(previous.riff.at(-1));
    const firstLead = highestNote(events[0])!;
    if (priorLead) {
      const handoff = Math.abs(firstLead.midi - priorLead.midi);
      score += handoff <= 7 ? 4.5 : handoff <= 12 ? 1.5 : -4;
    }
    const previousRhythm = rhythmSignature(previous.riff, 0, previous.meterMap.meters[0]?.beatsPerBar ?? 4);
    if (previousRhythm === barRhythms[0]) score -= 2.5;
  }

  const stabs = idea.chordRhythm ?? [];
  const stabBars = new Set(stabs.map((event) => event.bar));
  score += stabBars.size === idea.meterMap.meters.length ? 5 : -8;
  score += Math.min(12, stabs.length) * .45;
  if (stabs.some((event) => !event.notes.length || event.duration < .08)) score -= 20;
  const stabSignatures = idea.meterMap.meters.map((meter, bar) => rhythmSignature(stabs, idea.meterMap.starts[bar], idea.meterMap.starts[bar] + meter.beatsPerBar));
  score += new Set(stabSignatures).size > 1 || stabSignatures.length === 1 ? 3 : -2;
  let accentLocks = 0; let gapAnswers = 0; let ordinaryCollisions = 0;
  stabs.forEach((stab) => {
    const bar = Math.max(0, idea.meterMap.starts.findLastIndex((start) => start <= stab.time));
    const start = idea.meterMap.starts[bar] ?? 0;
    const beats = idea.meterMap.meters[bar]?.beatsPerBar ?? 4;
    const barRiff = events.filter((event) => event.time >= start - .01 && event.time < start + beats - .01);
    if (!barRiff.length) return;
    const peak = Math.max(...barRiff.map((event) => event.velocity));
    const accents = barRiff.filter((event) => event.velocity >= Math.max(.72, peak - .045));
    const accentDistance = nearestTimeDistance(stab.time, accents);
    const riffDistance = nearestTimeDistance(stab.time, barRiff);
    if (accentDistance <= Math.max(.1, beats / 32)) accentLocks += 1;
    else if (riffDistance >= Math.max(.24, beats / 14)) gapAnswers += 1;
    else if (riffDistance <= Math.max(.1, beats / 32)) ordinaryCollisions += 1;
  });
  score += Math.min(accentLocks, idea.meterMap.meters.length * 2) * 1.8;
  score += Math.min(gapAnswers, idea.meterMap.meters.length * 2) * (profile.riff === "melodic" ? 1.1 : .65);
  score -= ordinaryCollisions * (profile.riff === "rock" || profile.riff === "sequence" ? .55 : 1.25);
  if (accentLocks === 0) score -= 5;
  if (gapAnswers === 0 && !["rock", "sequence"].includes(profile.riff)) score -= 3;
  if (accentLocks > 0 && gapAnswers > 0) score += 4;

  const bass = idea.bass ?? [];
  const stabTimes = stabs.map((event) => event.time);
  const lockedBass = bass.filter((event) => nearestTimeDistance(event.time, stabs) <= .04).length;
  score += bass.length && lockedBass === bass.length ? 6 : lockedBass * .45 - Math.max(0, bass.length - lockedBass) * 1.8;
  bass.forEach((event) => {
    const chord = stabs.find((stab) => stab.bar === event.bar)?.chord;
    if (chord && event.notes.every((note) => chordPcs(chord).includes(mod(note.midi)) || event.time >= (idea.meterMap.starts[event.bar + 1] ?? idea.meterMap.totalBeats) - .4)) score += .35;
    if (nearestTimeDistance(event.time, events) <= .14) score += .32;
  });

  const drums = idea.drums ?? [];
  const kickTimes = drums.filter((event) => event.notes.some((note) => note.midi === 36)).map((event) => event.time);
  const sharedAccentTimes = [...stabs.filter((event) => event.velocity >= .72).map((event) => event.time), ...events.filter((event) => event.velocity >= .74).map((event) => event.time)];
  const coveredAccents = sharedAccentTimes.filter((time) => nearestTimeDistance(time, drums) <= .09 || kickTimes.some((kick) => Math.abs(kick - time) <= .09)).length;
  score += Math.min(10, coveredAccents) * .42;
  if (!drums.length || !bass.length || !stabTimes.length) score -= 12;
  return score + scorePhraseIntelligence(artist, section, idea);
}

/** Bounded musical features: adding more notes cannot buy a better score. */
export function scorePhraseIntelligence(artist: Artist, section: SectionType, idea: PerformanceIdea) {
  const style = phrasingProfiles[artist];
  const events = [...idea.riff].sort((a, b) => a.time - b.time);
  if (!events.length || events.some((event) => !event.notes.length)) return -100;
  const bars = idea.meterMap.meters.map((meter, bar) => events.filter((event) => event.time >= idea.meterMap.starts[bar] && event.time < idea.meterMap.starts[bar] + meter.beatsPerBar));
  let harmonic = 0; let unresolved = 0; let repeated = 0; let overlaps = 0;
  let exposedBeats = 0; let soundingBeats = 0;
  events.forEach((event, i) => {
    const lead = highestNote(event)!; const next = events[i + 1];
    const chord = activeChordAt(idea.harmony, event.time, idea.harmony[0]?.chord ?? "C");
    const tones = chordPcs(chord); const stable = tones.includes(mod(lead.midi));
    // Judge every voice over its whole sounding interval, including chord
    // changes under a held note. Onset-only scoring missed sustained clashes.
    const end = event.time + event.duration;
    const boundaries = [event.time, ...idea.harmony.filter((change) => change.time > event.time && change.time < end).map((change) => change.time), end];
    for (let segment = 0; segment < boundaries.length - 1; segment += 1) {
      const length = boundaries[segment + 1] - boundaries[segment];
      const sounding = chordPcs(activeChordAt(idea.harmony, boundaries[segment], chord));
      const outside = event.notes.filter((note) => !sounding.includes(mod(note.midi))).length / event.notes.length;
      soundingBeats += length;
      if (event.duration > .35 || segment > 0) exposedBeats += length * outside;
    }
    const nextLead = highestNote(next);
    const resolves = nextLead && Math.abs(nextLead.midi - lead.midi) <= 2 && chordPcs(activeChordAt(idea.harmony, next.time, chord)).includes(mod(nextLead.midi));
    if (stable) harmonic += 1;
    else if (resolves && next.time - event.time <= .6) harmonic += .7;
    else if (event.duration > .65) unresolved += 1;
    if (i >= 3 && events.slice(i - 3, i).every((prior) => highestNote(prior)?.midi === lead.midi)) repeated += 1;
    if (next && event.time + event.duration > next.time + .01) overlaps += 1;
  });
  let score = harmonic / events.length * 16 - unresolved / events.length * 28 - overlaps / events.length * 30;
  score -= exposedBeats / Math.max(.01, soundingBeats) * 40;
  score -= repeated / events.length * (artist === "Waxamilion" ? 8 : 30);
  let densityFit = 0; let breathing = 0; let endings = 0;
  bars.forEach((barEvents, bar) => {
    if (!barEvents.length) { densityFit -= 8; return; }
    const beats = idea.meterMap.meters[bar].beatsPerBar;
    const density = barEvents.length / beats;
    const sparseSection = section === "Intro" || section === "Outro";
    const low = style.density[0] * (sparseSection ? .5 : .65);
    const high = style.density[1] * (sparseSection ? .8 : 1);
    densityFit += density >= low && density <= high ? 6 : -Math.min(12, Math.abs(density - (density < low ? low : high)) * 10);
    const occupied = barEvents.reduce((sum, event) => sum + event.duration, 0) / beats;
    breathing += occupied < .96 && occupied > .2 ? 2 : -3;
    const last = barEvents.at(-1)!;
    const chord = activeChordAt(idea.harmony, last.time, idea.harmony.at(-1)?.chord ?? "C");
    if (chordPcs(chord).includes(mod(highestNote(last)!.midi))) endings += 3;
  });
  score += (densityFit + breathing + endings) / Math.max(1, bars.length);
  const heldArrivals = bars.filter((barEvents, bar) => {
    if (bar % 2 !== 1 && bar !== bars.length - 1) return false;
    const last = barEvents.at(-1);
    return last && last.duration >= style.holdBeats * idea.meterMap.meters[bar].beatsPerBar / 4 * .7;
  }).length;
  score += heldArrivals / Math.max(1, Math.ceil(bars.length / 2)) * 7;
  // Reward a remembered contour with variation, not identical bars throughout.
  const contour = (line: PerformanceEvent[]) => line.slice(1, 4).map((event, i) => Math.sign(highestNote(event)!.midi - highestNote(line[i])!.midi));
  let recall = 0; let comparisons = 0;
  for (let bar = 2; bar < bars.length; bar += 2) {
    const a = contour(bars[0]); const b = contour(bars[bar]);
    const count = Math.min(a.length, b.length);
    if (count) { recall += a.slice(0, count).filter((direction, i) => direction === b[i]).length / count; comparisons += 1; }
  }
  if (comparisons) score += recall / comparisons * 6;
  const velocities = events.map((event) => event.velocity);
  score += Math.max(...velocities) - Math.min(...velocities) >= style.dynamicRange * .6 ? 3 : -3;
  return score;
}
