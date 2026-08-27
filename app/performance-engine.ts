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
  riff: PerformanceEvent[];
};

type RiffKind = "melodic" | "rock" | "interlock" | "pedal" | "fusion" | "sequence" | "angular";
type RhythmCell = { id: string; times: number[]; durations: number[]; accents: number[]; cadence?: boolean };
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
type PerformanceProfile = { riff: RiffKind; riffLabel: string; tempo: number; position: number; steps: number[]; meters: TimeSignature[]; chordFeel: HarmonicPhrasing; gripReach: number; texture: TexturePolicy; comfort: PlayingComfort };
type PhraseMotion = "statement" | "answer" | "development" | "arrival";
type ArtistMotif = { contour: number[]; accentTones: number[]; pickup: number; pedalEvery?: number; meterWeights: Record<string, number> };
type RiffBarPlan = RhythmCell & { variation: number; phraseMotion: PhraseMotion };
type ChordRhythmCell = { id: string; hits: number[]; lengths: number[]; accents: number[]; finalHold?: boolean };
type RiffCursor = { midi: number; gripCenter?: number; anchor?: FretNote; handPosition: number };
type GripContext = { anchor: FretNote; handPosition: number; previousCenter?: number; previousAnchor?: FretNote; allowOpenPedal: boolean; maxSpan: number; maxShift: number; maxStringTravel: number };
type TextureState = { singles: number; dyads: number; triads: number; lastSize: 1 | 2 | 3 };
type PlayableFragment = { notes: FretNote[]; center: number; anchor: FretNote; score: number };

const guitarTuning = [64, 59, 55, 50, 45, 40];
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
  "Nick Johnston": { riff: "melodic", riffLabel: "melodic color motif", tempo: 102, position: 4, steps: [2, 3, -1, 2, -2], meters: [fourFour, sixEight], chordFeel: "anticipate", gripReach: 4, texture: { minSingles: 3, maxDyads: 1, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 2, lineLeap: 7, preferredMinFret: 2, preferredMaxFret: 10 } },
  "Moray Pringle": { riff: "rock", riffLabel: "wide rock-fusion riff", tempo: 118, position: 5, steps: [2, -2, 3, 2, -1], meters: [fourFour, fiveFour, sevenEight], chordFeel: "late", gripReach: 4, texture: { minSingles: 2, maxDyads: 2, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 5, maxStringTravel: 2, lineLeap: 9, preferredMinFret: 2, preferredMaxFret: 10, pedalFriendly: true } },
  Owane: { riff: "angular", riffLabel: "bright angular interlock", tempo: 126, position: 7, steps: [2, 2, -1, 3, -2], meters: [fourFour, sevenEight, fiveFour, nineEight], chordFeel: "anticipate", gripReach: 5, texture: { minSingles: 3, maxDyads: 2, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 2, lineLeap: 8, preferredMinFret: 3, preferredMaxFret: 11 } },
  Waxamilion: { riff: "pedal", riffLabel: "pedal-axis fragment", tempo: 108, position: 6, steps: [3, -1, 2, -3, 2], meters: [fourFour, fiveFour, sevenEight], chordFeel: "late", gripReach: 4, texture: { minSingles: 2, maxDyads: 2, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 2, lineLeap: 8, preferredMinFret: 1, preferredMaxFret: 10, pedalFriendly: true } },
  CHON: { riff: "interlock", riffLabel: "interlocking bright riff", tempo: 132, position: 5, steps: [2, 2, -2, 3, -1], meters: [fourFour, sevenEight, fiveFour, nineEight], chordFeel: "split", gripReach: 5, texture: { minSingles: 3, maxDyads: 2, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 2, lineLeap: 8, preferredMinFret: 2, preferredMaxFret: 11 } },
  "Marco Sfogli": { riff: "melodic", riffLabel: "anthemic melodic riff", tempo: 112, position: 4, steps: [2, 2, -1, 3, -2], meters: [fourFour, sixEight], chordFeel: "downbeat", gripReach: 4, texture: { minSingles: 3, maxDyads: 1, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 2, lineLeap: 8, preferredMinFret: 2, preferredMaxFret: 10 } },
  "Guthrie Govan": { riff: "fusion", riffLabel: "groove-aware fusion riff", tempo: 116, position: 7, steps: [2, -1, 3, -2, 2], meters: [fourFour, sixEight, sevenEight], chordFeel: "late", gripReach: 4, texture: { minSingles: 3, maxDyads: 2, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 2, lineLeap: 9, preferredMinFret: 3, preferredMaxFret: 11 } },
  "Greg Howe": { riff: "fusion", riffLabel: "punchy linear fusion riff", tempo: 122, position: 6, steps: [2, 2, -1, -2, 3], meters: [fourFour, sevenEight, fiveFour], chordFeel: "anticipate", gripReach: 4, texture: { minSingles: 2, maxDyads: 2, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 4, maxStringTravel: 1, lineLeap: 8, preferredMinFret: 3, preferredMaxFret: 11 } },
  "Yngwie Malmsteen": { riff: "sequence", riffLabel: "minor-key pedal sequence", tempo: 138, position: 4, steps: [2, 1, 2, -1, -2], meters: [fourFour, sixEight], chordFeel: "downbeat", gripReach: 5, texture: { minSingles: 4, maxDyads: 1, maxTriads: 1, triadOnAccentOnly: true }, comfort: { maxShift: 5, maxStringTravel: 1, lineLeap: 9, preferredMinFret: 1, preferredMaxFret: 11, pedalFriendly: true } },
};

// These are original high-level playing tendencies, used as constraints rather
// than copied phrases. They give each engine a distinct melodic trajectory,
// harmonic landing preference, pickup behavior, and meter tolerance.
const artistMotifs: Record<Artist, ArtistMotif> = {
  "Nick Johnston": { contour: [2, 1, -2, 3, -1], accentTones: [3, 1, 0, 2], pickup: 0.16, meterWeights: { "4/4": 8, "6/8": 2 } },
  "Moray Pringle": { contour: [0, -2, 3, -1, 2], accentTones: [0, 2, 1, 0], pickup: 0.1, pedalEvery: 4, meterWeights: { "4/4": 7, "5/4": 2, "7/8": 1 } },
  Owane: { contour: [2, -1, 3, 1, -2, 2], accentTones: [3, 1, 2, 0], pickup: 0.24, meterWeights: { "4/4": 7, "7/8": 2, "5/4": 1, "9/8": 1 } },
  Waxamilion: { contour: [0, 3, -2, 1, -3], accentTones: [0, 3, 0, 2], pickup: 0.2, pedalEvery: 3, meterWeights: { "4/4": 7, "5/4": 2, "7/8": 1 } },
  CHON: { contour: [2, 2, -1, 3, -2, 1], accentTones: [3, 1, 2, 0], pickup: 0.25, meterWeights: { "4/4": 6, "7/8": 2, "5/4": 1, "9/8": 1 } },
  "Marco Sfogli": { contour: [2, 1, -1, 3, -2], accentTones: [0, 2, 1, 0], pickup: 0.08, meterWeights: { "4/4": 8, "6/8": 2 } },
  "Guthrie Govan": { contour: [1, -2, 3, -1, 2, -3], accentTones: [1, 3, 2, 0], pickup: 0.2, meterWeights: { "4/4": 7, "6/8": 2, "7/8": 1 } },
  "Greg Howe": { contour: [2, -1, 2, 3, -2], accentTones: [0, 1, 3, 2], pickup: 0.22, meterWeights: { "4/4": 7, "7/8": 2, "5/4": 1 } },
  "Yngwie Malmsteen": { contour: [1, 2, -1, 2, -2, -1], accentTones: [0, 2, 1, 0], pickup: 0.08, pedalEvery: 4, meterWeights: { "4/4": 8, "6/8": 2 } },
};

const rhythmBooks: Record<RiffKind, RhythmCell[]> = {
  melodic: [
    { id: "lyric-space", times: [0, 1.5, 2.75], durations: [0.72, 0.5, 0.82], accents: [0], cadence: true },
    { id: "answer-pickup", times: [0, 0.75, 2, 3.25], durations: [0.44, 0.38, 0.58, 0.48], accents: [0, 2] },
    { id: "suspended-answer", times: [0, 1.25, 1.75, 3], durations: [0.72, 0.32, 0.38, 0.72], accents: [0, 3] },
    { id: "late-lift", times: [0, 0.5, 2.25, 2.75], durations: [0.38, 0.58, 0.38, 0.78], accents: [0, 3] },
    { id: "offbeat-lyric", times: [0, 1, 2.5, 3.5], durations: [0.56, 0.42, 0.48, 0.4], accents: [0, 2] },
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
  if (quality.includes("dim")) return [root, mod(root + 3), mod(root + 6), mod(root + 9)];
  if (quality.includes("m7b5")) return [root, mod(root + 3), mod(root + 6), mod(root + 10)];
  if (quality.includes("sus")) return [root, mod(root + 5), mod(root + 7), mod(root + 10)];
  if (quality.includes("m") && !quality.includes("maj")) return [root, mod(root + 3), mod(root + 7), mod(root + (quality.includes("7") || quality.includes("9") || quality.includes("11") ? 10 : 12))];
  if (quality.includes("7") && !quality.includes("maj")) return [root, mod(root + 4), mod(root + 7), mod(root + 10)];
  if (quality.includes("maj7")) return [root, mod(root + 4), mod(root + 7), mod(root + 11)];
  return [root, mod(root + 4), mod(root + 7), mod(root + 2)];
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

function solveCompactGrip(pcsHighToLow: number[], context: GripContext) {
  let best: { notes: FretNote[]; score: number; center: number } | null = null;
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
  if (artist === "Owane" || artist === "CHON") return scale.map((interval) => mod(center + interval)).concat([mod(center + 6)]);
  return scale.map((interval) => mod(center + interval));
}

function phraseMotionFor(bar: number, bars: number, section: SectionType): PhraseMotion {
  if (bar === bars - 1) return "arrival";
  if (bar === 0) return "statement";
  if (section === "Chorus" && bar % 2 === 0) return "statement";
  return bar % 2 ? "answer" : "development";
}

function shapeCell(cell: RhythmCell, motion: PhraseMotion, pickup: number) {
  if (motion === "statement" || motion === "arrival") return cell;
  const amount = motion === "answer" ? pickup : pickup * 1.45;
  const times = cell.times.map((time, index) => index === 0 ? time : Math.min(3.82, Math.max(0.08, time + (index % 2 ? amount : -amount * 0.45))));
  return { ...cell, times };
}

function makeRiffPlans(profile: PerformanceProfile, artist: Artist, bars: number, section: SectionType, complexity: number) {
  const cells = rhythmBooks[profile.riff]; const used = new Set<string>(); const plans: RiffBarPlan[] = [];
  for (let bar = 0; bar < bars; bar += 1) {
    const phraseMotion = phraseMotionFor(bar, bars, section);
    let choices = cells.filter((cell) => cell.id !== plans.at(-1)?.id);
    if (complexity === 5) {
      const reserveCadence = bar < bars - 1 ? cells.find((cell) => cell.cadence)?.id : undefined;
      const unique = choices.filter((cell) => !used.has(cell.id) && cell.id !== reserveCadence);
      if (unique.length) choices = unique;
    }
    if (phraseMotion === "arrival" && section !== "Intro") {
      const arrivals = choices.filter((cell) => cell.cadence && (complexity < 5 || !used.has(cell.id)));
      if (arrivals.length) choices = arrivals;
    }
    const unused = cells.filter((cell) => !used.has(cell.id));
    const shouldRecall = bar === 2 && complexity < 5 && ["pedal", "interlock", "angular", "sequence"].includes(profile.riff);
    const recalled = shouldRecall ? cells.find((cell) => cell.id === plans[0]?.id) : undefined;
    const selected = recalled ?? choose(choices.length ? choices : unused.length ? unused : cells);
    const shaped = shapeCell(selected, phraseMotion, artistMotifs[artist].pickup);
    used.add(selected.id); plans.push({ ...shaped, variation: Math.floor(Math.random() * 8) + bar * 3 + complexity, phraseMotion });
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

function riffForBar(profile: PerformanceProfile, artist: Artist, section: SectionType, chord: string, center: number, mode: Mode, bar: number, barStart: number, barBeats: number, complexity: number, plan: RiffBarPlan, cursor: RiffCursor) {
  const sourceIndexes = (section === "Intro" || section === "Outro") ? plan.times.map((_, index) => index).filter((index) => index % 2 === 0 || index === plan.times.length - 1) : plan.times.map((_, index) => index);
  const hitIndexes = complexity === 1 ? sourceIndexes.filter((_, index) => index % 2 === 0 || index === sourceIndexes.length - 1) : sourceIndexes;
  const tones = chordPcs(chord); const scale = scaleFor(center, mode, artist);
  const texture: TextureState = { singles: 0, dyads: 0, triads: 0, lastSize: 1 };
  return hitIndexes.map((sourceIndex, phraseIndex) => {
    const localTime = plan.times[sourceIndex] * (barBeats / 4); const isAccent = plan.accents.includes(sourceIndex) || phraseIndex === 0 || phraseIndex === hitIndexes.length - 1;
    const lastPc = mod(cursor.midi); const scaleIndex = scale.indexOf(lastPc);
    const motif = artistMotifs[artist]; const contour = motif.contour[mod(plan.variation + phraseIndex + bar, motif.contour.length)];
    const step = profile.steps[mod(plan.variation + phraseIndex + bar, profile.steps.length)] + contour;
    const pedalHit = motif.pedalEvery !== undefined && phraseIndex % motif.pedalEvery === 0;
    const targetPc = isAccent || pedalHit ? accentToneFor(artist, tones, bar, phraseIndex, plan.phraseMotion) : scale[mod((scaleIndex < 0 ? plan.variation : scaleIndex) + step, scale.length)];
    const targetMidi = targetPitchForPc(targetPc, cursor.midi + (isAccent ? 0 : (plan.variation % 3) - 1), profile.comfort);
    const [root, third, fifth, color] = tones;
    const requestedSize = textureSizeFor(profile, plan, bar, phraseIndex, hitIndexes.length - phraseIndex - 1, complexity, isAccent, texture);
    let fragment = playableFragmentFor(profile, targetPc, targetMidi, requestedSize, voicingsFor(profile, artist, root, third, fifth, color), cursor);
    if (requestedSize > 1) {
      const actualSize = fragment.notes.length;
      const exceedsTexture = (actualSize === 2 && texture.dyads >= profile.texture.maxDyads) || (actualSize === 3 && texture.triads >= profile.texture.maxTriads);
      if (exceedsTexture) fragment = playableFragmentFor(profile, targetPc, targetMidi, 1, [], cursor);
    }
    recordTexture(texture, fragment.notes.length);
    cursor.midi = fragment.anchor.midi;
    cursor.anchor = fragment.anchor;
    cursor.gripCenter = fragment.center;
    cursor.handPosition = clamp(Math.round(fragment.center), 1, 10);
    const duration = Math.min((plan.durations[sourceIndex] ?? 0.4) * (barBeats / 4), Math.max(0.14, barBeats - localTime - 0.04));
    return { time: barStart + localTime, duration, notes: fragment.notes, velocity: 0.5 + Math.min(complexity, 4) * 0.07 + (isAccent ? 0.08 : 0) };
  });
}

export function createChordPreview(chord: string, position = 5): PerformanceEvent {
  const [root, third, fifth, color] = chordPcs(chord); const anchor = locateLeadPc(color, 67, position + 2);
  const context = { handPosition: position, previousCenter: undefined, previousAnchor: undefined, allowOpenPedal: false, maxSpan: 5, maxShift: 5, maxStringTravel: 2 };
  const full = solveCompactGrip([mod(anchor.midi), fifth, third, root], { ...context, anchor }) ?? compactFragment(anchor, [[fifth, root], [third, root], [fifth, third], [color, third]], 3, context);
  return { time: 0, duration: 0.92, notes: full.notes, velocity: 0.75 };
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

function harmonyForSection(profile: PerformanceProfile, progression: string[], meterMap: MeterMap, rhythmComplexity: number): HarmonyEvent[] {
  const events: HarmonyEvent[] = []; const feel = chordFeelFor(profile, rhythmComplexity);
  const add = (chord: string, time: number, bar: number, duration: number, velocity = 0.68) => {
    const voicing = createChordPreview(chord, profile.position);
    events.push({ ...voicing, chord, bar, time: Math.max(0, time), duration: Math.max(0.18, duration), velocity });
  };
  progression.forEach((chord, bar) => {
    const start = meterMap.starts[bar]; const barBeats = meterMap.meters[bar].beatsPerBar; const previousBeats = meterMap.meters[bar - 1]?.beatsPerBar ?? barBeats;
    if (feel === "anticipate" && bar > 0) add(chord, start - previousBeats * 0.24, bar, previousBeats * 0.34);
    else if (feel === "late" && bar > 0) add(chord, start + barBeats * 0.24, bar, barBeats * 0.42);
    else add(chord, start, bar, barBeats * 0.44);
    if (rhythmComplexity >= 3 && feel === "split" && bar < progression.length - 1) add(progression[bar + 1], start + barBeats * 0.62, bar + 1, barBeats * 0.32, 0.62);
    else if (rhythmComplexity >= 3 && feel !== "downbeat" && bar < progression.length - 1) add(chord, start + barBeats * 0.72, bar, barBeats * 0.18, 0.48);
  });
  return events.sort((a, b) => a.time - b.time || a.bar - b.bar);
}

function chordRhythmForSection(profile: PerformanceProfile, progression: string[], meterMap: MeterMap, section: SectionType): HarmonyEvent[] {
  const cells = chordRhythmBooks[profile.riff];
  return progression.flatMap((chord, bar) => {
    const meter = meterMap.meters[bar]; const start = meterMap.starts[bar]; const barBeats = meter.beatsPerBar;
    const cell = cells[(bar + (section === "Chorus" ? 1 : 0) + Math.floor(Math.random() * cells.length)) % cells.length];
    return cell.hits.map((fraction, hit) => {
      const nextFraction = cell.hits[hit + 1] ?? 1;
      const duration = cell.finalHold && hit === cell.hits.length - 1
        ? Math.max(.26, barBeats * (1 - fraction) * .86)
        : Math.min(barBeats * (cell.lengths[hit] ?? .16), Math.max(.12, barBeats * (nextFraction - fraction) - .045));
      const voicing = createChordPreview(chord, profile.position + ((bar + hit) % 3) - 1);
      const accented = cell.accents.includes(hit);
      return {
        ...voicing,
        chord,
        bar,
        time: start + barBeats * fraction,
        duration,
        velocity: accented ? .82 : .6,
      };
    });
  }).sort((a, b) => a.time - b.time || a.bar - b.bar);
}

export function createPerformanceIdea(artist: Artist, section: SectionType, progression: string[], localCenters: number[], mode: Mode, complexity: number, rhythmComplexity = 2): PerformanceIdea {
  const profile = performanceProfiles[artist]; const meterMap = meterMapFor(profile, artist, progression.length, rhythmComplexity); const plans = makeRiffPlans(profile, artist, progression.length, section, complexity); const cursor: RiffCursor = { midi: 59 + complexity, handPosition: profile.position };
  const riff = progression.flatMap((chord, bar) => riffForBar(profile, artist, section, chord, localCenters[bar] ?? localCenters[0], mode, bar, meterMap.starts[bar], meterMap.meters[bar].beatsPerBar, complexity, plans[bar], cursor));
  const harmony = harmonyForSection(profile, progression, meterMap, rhythmComplexity);
  const chordRhythm = chordRhythmForSection(profile, progression, meterMap, section);
  const tempoLift = section === "Solo" ? 8 : section === "Chorus" ? 4 : 0;
  return { tempo: profile.tempo + tempoLift + Math.floor(Math.random() * 7) - 3, riffStyle: profile.riffLabel, meter: meterMap.meters[0], meterMap, harmony, chordRhythm, riff };
}

/** Makes a fresh lead idea while preserving the exact chart, meter map,
 * sustained harmony, chord-stab lane, and tempo of the source idea. */
export function regenerateRiffIdea(artist: Artist, section: SectionType, progression: string[], localCenters: number[], mode: Mode, complexity: number, source: PerformanceIdea): PerformanceIdea {
  const profile = performanceProfiles[artist]; const plans = makeRiffPlans(profile, artist, progression.length, section, complexity);
  const cursor: RiffCursor = { midi: 59 + complexity, handPosition: profile.position };
  const riff = progression.flatMap((chord, bar) => riffForBar(profile, artist, section, chord, localCenters[bar] ?? localCenters[0], mode, bar, source.meterMap.starts[bar], source.meterMap.meters[bar].beatsPerBar, complexity, plans[bar], cursor));
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

  score -= awkwardMoves * 8.5;
  score += singles >= profile.texture.minSingles ? 5 : -8;
  score += Math.min(dyads, profile.texture.maxDyads) * 1.35 + Math.min(triads, profile.texture.maxTriads) * 1.65;
  score -= Math.max(0, dyads - profile.texture.maxDyads) * 4 + Math.max(0, triads - profile.texture.maxTriads) * 5;
  if (["interlock", "angular", "pedal", "fusion"].includes(profile.riff) && dyads + triads === 0) score -= 5.5;

  const barRhythms = idea.meterMap.meters.map((meter, bar) => rhythmSignature(events, idea.meterMap.starts[bar], idea.meterMap.starts[bar] + meter.beatsPerBar));
  const uniqueRhythms = new Set(barRhythms).size;
  const targetRhythms = profile.riff === "sequence" ? 2 : profile.riff === "pedal" || profile.riff === "interlock" ? 3 : 3;
  score += uniqueRhythms >= targetRhythms ? 6 : uniqueRhythms * 1.2;
  if (barRhythms.length > 2 && barRhythms[0] === barRhythms[2]) score += profile.riff === "pedal" || profile.riff === "sequence" ? 2.5 : -1.2;
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

  const stabs = idea.chordRhythm;
  const stabBars = new Set(stabs.map((event) => event.bar));
  score += stabBars.size === idea.meterMap.meters.length ? 5 : -8;
  score += Math.min(12, stabs.length) * .45;
  if (stabs.some((event) => !event.notes.length || event.duration < .08)) score -= 20;
  const stabSignatures = idea.meterMap.meters.map((meter, bar) => rhythmSignature(stabs, idea.meterMap.starts[bar], idea.meterMap.starts[bar] + meter.beatsPerBar));
  score += new Set(stabSignatures).size > 1 || stabSignatures.length === 1 ? 3 : -2;
  return score;
}
