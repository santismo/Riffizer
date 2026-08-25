export const artists = ["Nick Johnston", "Moray Pringle", "Owane", "Waxamilion", "CHON", "Marco Sfogli", "Guthrie Govan", "Greg Howe", "Yngwie Malmsteen"] as const;
export type Artist = (typeof artists)[number];
export type SectionType = "Intro" | "Verse" | "Pre-chorus" | "Chorus" | "Bridge" | "Solo" | "Outro";
export type Mode = "major" | "minor";
export type HarmonicState = { center: number; mode: Mode; useFlats: boolean; endingPc: number };
export type HarmonicGeneration = HarmonicState & { progression: string[]; localCenters: number[] };

type HarmonicFunction = "tonic" | "predominant" | "dominant" | "color" | "pedal" | "passing";
type PhraseRole = "opening" | "answer" | "lift" | "hook" | "contrast" | "vamp" | "turnaround" | "release" | "build";
type CadenceKind = "suspended" | "plagal" | "iiV" | "backdoor" | "modal" | "neoclassical" | "rock";
type PivotKind = "dominant" | "commonTone" | "mediant" | "diminished" | "backcycle" | "direct";
type ChordPlan = { offset: number; suffix: string; fn: HarmonicFunction };
type Phrase = { id: string; min: number; roles: PhraseRole[]; tension: number; chords: ChordPlan[] };
type Profile = {
  color: string;
  note: string;
  modes: Mode[];
  shifts: number[];
  pivots: PivotKind[];
  cadences: CadenceKind[];
  majorTonic: string[];
  minorTonic: string[];
  phrases: Phrase[];
};

const c = (offset: number, suffix: string, fn: HarmonicFunction): ChordPlan => ({ offset, suffix, fn });
const p = (id: string, min: number, roles: PhraseRole[], tension: number, chords: ChordPlan[]): Phrase => ({ id, min, roles, tension, chords });

// These are high-level harmonic grammars: original functional material and weighted
// tendencies, rather than transcriptions or song-derived chord sequences.
const engines: Record<Artist, Profile> = {
  "Nick Johnston": {
    color: "#b1a2ff", note: "melodic center · chromatic color · suspended resolution", modes: ["major", "major", "minor"], shifts: [3, -3, 5, 7, 9], pivots: ["commonTone", "mediant", "direct"], cadences: ["plagal", "suspended", "modal"], majorTonic: ["add9", "maj7", "maj9"], minorTonic: ["m", "m9"],
    phrases: [
      p("singable", 1, ["opening", "hook"], 1, [c(0, "add9", "tonic"), c(9, "m7", "predominant"), c(5, "maj7", "predominant"), c(7, "sus4", "dominant")]),
      p("open-answer", 1, ["answer", "release"], 2, [c(9, "m7", "tonic"), c(5, "maj7", "predominant"), c(0, "add9", "tonic"), c(7, "sus2", "dominant")]),
      p("borrowed-lift", 2, ["lift", "contrast"], 3, [c(0, "maj7", "tonic"), c(5, "m6", "color"), c(0, "add9", "tonic"), c(7, "13sus4", "dominant")]),
      p("chromatic-color", 3, ["answer", "turnaround"], 3, [c(9, "m9", "tonic"), c(2, "7", "passing"), c(5, "maj7#11", "color"), c(0, "maj9", "tonic")]),
      p("minor-shape", 3, ["contrast", "build"], 4, [c(0, "m9", "tonic"), c(8, "maj7", "color"), c(3, "maj7", "color"), c(10, "sus4", "dominant")]),
      p("return", 4, ["turnaround", "release"], 3, [c(2, "m9", "predominant"), c(7, "13", "dominant"), c(4, "m7", "predominant"), c(0, "maj9", "tonic")]),
    ],
  },
  "Moray Pringle": {
    color: "#e4ff74", note: "energetic rock-fusion · bluesy lift · strong arrivals", modes: ["major", "major", "minor"], shifts: [5, 7, 9, 3], pivots: ["dominant", "commonTone", "mediant"], cadences: ["rock", "modal", "suspended"], majorTonic: ["add9", "6", "maj7"], minorTonic: ["m", "m7", "m9"],
    phrases: [
      p("rock-cell", 1, ["opening", "vamp"], 1, [c(0, "add9", "tonic"), c(5, "maj7", "predominant"), c(7, "sus4", "dominant"), c(0, "add9", "tonic")]),
      p("bluesy-answer", 1, ["answer", "hook"], 2, [c(0, "6", "tonic"), c(10, "add9", "color"), c(5, "maj7", "predominant"), c(7, "7", "dominant")]),
      p("fusion-push", 2, ["lift", "build"], 3, [c(2, "m7", "predominant"), c(7, "13", "dominant"), c(0, "maj7", "tonic"), c(9, "m7", "tonic")]),
      p("minor-descent", 2, ["contrast", "turnaround"], 3, [c(0, "m7", "tonic"), c(10, "maj7", "color"), c(8, "maj7", "color"), c(7, "sus4", "dominant")]),
      p("dominant-pickup", 3, ["build", "turnaround"], 4, [c(4, "m7", "predominant"), c(9, "7", "passing"), c(2, "m7", "predominant"), c(7, "13", "dominant")]),
      p("bright-return", 4, ["release", "hook"], 2, [c(0, "maj9", "tonic"), c(7, "sus2", "dominant"), c(9, "m7", "tonic"), c(5, "add9", "predominant")]),
    ],
  },
  Owane: {
    color: "#ffb493", note: "bright color · pedal-minded motion · delayed resolution", modes: ["major", "major", "minor"], shifts: [2, 5, 7, -2, 3], pivots: ["commonTone", "direct", "mediant"], cadences: ["plagal", "suspended", "iiV"], majorTonic: ["maj9", "6/9", "add9"], minorTonic: ["m9", "m11"],
    phrases: [
      p("bright-loop", 1, ["opening", "hook"], 1, [c(0, "maj9", "tonic"), c(7, "sus2", "pedal"), c(9, "m7", "predominant"), c(5, "maj7", "predominant")]),
      p("step-color", 1, ["answer", "vamp"], 2, [c(0, "6/9", "tonic"), c(2, "m7", "predominant"), c(4, "m7", "color"), c(5, "maj9", "predominant")]),
      p("lydian-turn", 2, ["lift", "contrast"], 3, [c(0, "maj7#11", "tonic"), c(9, "m9", "predominant"), c(2, "13", "dominant"), c(7, "maj9", "color")]),
      p("pedal-recolor", 2, ["answer", "release"], 2, [c(0, "add9", "pedal"), c(5, "maj7", "predominant"), c(0, "6/9", "tonic"), c(7, "sus4", "dominant")]),
      p("fusion-detail", 3, ["build", "turnaround"], 4, [c(2, "m11", "predominant"), c(7, "13", "dominant"), c(0, "maj9", "tonic"), c(4, "7#11", "color")]),
      p("sliding-color", 4, ["contrast", "hook"], 4, [c(0, "maj9", "tonic"), c(8, "maj7#11", "color"), c(9, "m7", "predominant"), c(2, "13", "dominant")]),
    ],
  },
  Waxamilion: {
    color: "#8ee9e0", note: "pedal anchors · planed color · asymmetric surprise", modes: ["minor", "major", "minor"], shifts: [3, -3, 5, 6, 8], pivots: ["mediant", "direct", "commonTone"], cadences: ["modal", "suspended", "plagal"], majorTonic: ["add9", "maj7#11", "maj9"], minorTonic: ["m9", "m11", "m"],
    phrases: [
      p("anchor", 1, ["opening", "vamp"], 1, [c(0, "sus2", "pedal"), c(0, "m9", "tonic"), c(8, "maj7", "color"), c(0, "sus2", "pedal")]),
      p("planed-answer", 1, ["answer", "contrast"], 3, [c(0, "add9", "tonic"), c(3, "maj7", "color"), c(8, "maj7#11", "color"), c(0, "sus2", "pedal")]),
      p("dark-pivot", 2, ["lift", "build"], 3, [c(0, "m9", "tonic"), c(1, "maj7", "color"), c(6, "m7b5", "passing"), c(7, "7sus4", "dominant")]),
      p("side-slip", 3, ["contrast", "turnaround"], 4, [c(0, "maj9", "tonic"), c(10, "13", "color"), c(3, "m9", "color"), c(8, "maj7#11", "color")]),
      p("impact-reset", 3, ["release", "hook"], 3, [c(5, "m9", "predominant"), c(8, "maj7", "color"), c(0, "add9", "tonic"), c(0, "sus2", "pedal")]),
      p("angular-build", 4, ["build", "answer"], 4, [c(0, "m11", "tonic"), c(7, "13", "dominant"), c(1, "maj7#11", "color"), c(0, "m9", "tonic")]),
    ],
  },
  CHON: {
    color: "#8bb7ff", note: "bright diatonic color · common tones · plagal arrivals", modes: ["major", "major", "minor"], shifts: [5, 7, 9, 2, -2], pivots: ["commonTone", "direct", "mediant"], cadences: ["plagal", "suspended", "modal"], majorTonic: ["add9", "maj7", "6/9"], minorTonic: ["m7", "m9"],
    phrases: [
      p("open-major", 1, ["opening", "hook"], 1, [c(0, "add9", "tonic"), c(7, "sus2", "pedal"), c(9, "m7", "predominant"), c(5, "maj7", "predominant")]),
      p("interlock", 1, ["answer", "vamp"], 2, [c(2, "m7", "predominant"), c(7, "sus4", "dominant"), c(0, "add9", "tonic"), c(4, "m7", "color")]),
      p("relative-lift", 2, ["lift", "release"], 2, [c(9, "m7", "tonic"), c(2, "m7", "predominant"), c(5, "maj9", "predominant"), c(0, "add9", "tonic")]),
      p("lydian-widen", 3, ["contrast", "hook"], 3, [c(0, "maj7#11", "tonic"), c(7, "sus2", "pedal"), c(2, "m9", "predominant"), c(5, "maj7", "predominant")]),
      p("soft-turn", 3, ["turnaround", "build"], 3, [c(0, "add9", "tonic"), c(11, "m7b5", "passing"), c(9, "m7", "predominant"), c(5, "maj9", "predominant")]),
      p("bright-cycle", 4, ["answer", "release"], 3, [c(7, "sus4", "dominant"), c(9, "m7", "tonic"), c(2, "m7", "predominant"), c(0, "maj9", "tonic")]),
    ],
  },
  "Marco Sfogli": {
    color: "#f7cc73", note: "lyrical rock form · clear lift · decisive return", modes: ["major", "major", "minor"], shifts: [5, 7, 9, 3, -3], pivots: ["dominant", "mediant", "commonTone"], cadences: ["rock", "plagal", "suspended"], majorTonic: ["add9", "maj7", "maj9"], minorTonic: ["m", "m7", "m9"],
    phrases: [
      p("anthem", 1, ["opening", "hook"], 1, [c(0, "add9", "tonic"), c(4, "m7", "predominant"), c(9, "m7", "tonic"), c(5, "maj7", "predominant")]),
      p("song-answer", 1, ["answer", "release"], 2, [c(9, "m7", "tonic"), c(5, "maj7", "predominant"), c(0, "add9", "tonic"), c(7, "sus4", "dominant")]),
      p("lift", 2, ["lift", "build"], 3, [c(2, "m7", "predominant"), c(7, "13", "dominant"), c(0, "maj7", "tonic"), c(5, "maj9", "predominant")]),
      p("minor-bridge", 2, ["contrast", "turnaround"], 3, [c(0, "m", "tonic"), c(8, "maj", "color"), c(10, "maj", "color"), c(7, "7", "dominant")]),
      p("dramatic-return", 3, ["build", "turnaround"], 4, [c(9, "m9", "tonic"), c(2, "7", "passing"), c(5, "maj7", "predominant"), c(7, "13sus4", "dominant")]),
      p("clear-hook", 4, ["hook", "release"], 2, [c(0, "maj9", "tonic"), c(7, "sus4", "dominant"), c(4, "m7", "predominant"), c(0, "add9", "tonic")]),
    ],
  },
  "Guthrie Govan": {
    color: "#f3a7e8", note: "blues-fusion color · earned chromatic turns · melodic landing", modes: ["major", "minor", "major"], shifts: [2, 5, 7, -1, 3], pivots: ["dominant", "backcycle", "commonTone", "mediant"], cadences: ["iiV", "backdoor", "plagal"], majorTonic: ["maj9", "6/9", "add9"], minorTonic: ["m9", "m7", "m6"],
    phrases: [
      p("blues-fusion", 1, ["opening", "vamp"], 1, [c(0, "maj9", "tonic"), c(5, "maj7", "predominant"), c(0, "7", "color"), c(5, "13", "dominant")]),
      p("smooth-answer", 1, ["answer", "hook"], 2, [c(2, "m9", "predominant"), c(7, "13", "dominant"), c(0, "maj9", "tonic"), c(9, "m7", "tonic")]),
      p("minor-fusion", 2, ["contrast", "build"], 3, [c(0, "m9", "tonic"), c(5, "m9", "predominant"), c(10, "13", "dominant"), c(3, "maj7", "color")]),
      p("chromatic-connector", 3, ["turnaround", "answer"], 4, [c(0, "maj7#11", "color"), c(6, "7alt", "passing"), c(2, "m9", "predominant"), c(7, "13", "dominant")]),
      p("backdoor-color", 3, ["lift", "release"], 3, [c(5, "m9", "predominant"), c(10, "13", "dominant"), c(0, "maj9", "tonic"), c(8, "maj7", "color")]),
      p("wide-return", 4, ["hook", "turnaround"], 4, [c(9, "m9", "tonic"), c(2, "13", "dominant"), c(7, "maj9", "color"), c(0, "13", "dominant")]),
    ],
  },
  "Greg Howe": {
    color: "#ff8f9e", note: "linear fusion · bass motion · compact targeted dominance", modes: ["major", "major", "minor"], shifts: [2, 5, 7, -2, 3], pivots: ["dominant", "backcycle", "commonTone", "direct"], cadences: ["iiV", "backdoor", "rock"], majorTonic: ["6/9", "maj7", "maj9"], minorTonic: ["m7", "m9"],
    phrases: [
      p("linear-groove", 1, ["opening", "vamp"], 1, [c(0, "6/9", "tonic"), c(4, "7", "passing"), c(9, "m7", "tonic"), c(2, "13", "dominant")]),
      p("target-cell", 1, ["answer", "hook"], 2, [c(2, "m7", "predominant"), c(7, "13", "dominant"), c(0, "maj7", "tonic"), c(6, "m7b5", "passing")]),
      p("bass-line", 2, ["lift", "turnaround"], 3, [c(0, "maj7", "tonic"), c(10, "13", "color"), c(9, "m9", "predominant"), c(2, "13", "dominant")]),
      p("altered-push", 3, ["build", "contrast"], 4, [c(0, "maj9", "tonic"), c(6, "7alt", "passing"), c(2, "m9", "predominant"), c(7, "13", "dominant")]),
      p("backcycle", 3, ["turnaround", "answer"], 4, [c(4, "m7", "predominant"), c(9, "7", "passing"), c(2, "m9", "predominant"), c(7, "13", "dominant")]),
      p("compact-release", 4, ["release", "hook"], 3, [c(5, "maj9", "predominant"), c(4, "7alt", "passing"), c(9, "m9", "predominant"), c(0, "maj7", "tonic")]),
    ],
  },
  "Yngwie Malmsteen": {
    color: "#ffde63", note: "harmonic-minor drama · pedal/sequence · emphatic V→i", modes: ["minor", "minor", "minor", "major"], shifts: [3, 5, 7, -3, 9], pivots: ["diminished", "dominant", "direct"], cadences: ["neoclassical"], majorTonic: ["maj", "add9"], minorTonic: ["m", "m", "m(add9)"],
    phrases: [
      p("minor-descent", 1, ["opening", "hook"], 1, [c(0, "m", "tonic"), c(10, "maj", "color"), c(8, "maj", "predominant"), c(7, "7", "dominant")]),
      p("pedal-cell", 1, ["vamp", "answer"], 2, [c(0, "m", "pedal"), c(5, "m", "predominant"), c(10, "maj", "color"), c(7, "7", "dominant")]),
      p("classical-sequence", 2, ["build", "contrast"], 3, [c(0, "m", "tonic"), c(11, "dim7", "passing"), c(8, "maj", "color"), c(7, "7b9", "dominant")]),
      p("phrygian-lift", 2, ["lift", "turnaround"], 3, [c(0, "m", "tonic"), c(1, "maj", "color"), c(5, "m", "predominant"), c(7, "7b9", "dominant")]),
      p("baroque-return", 3, ["turnaround", "release"], 4, [c(5, "m", "predominant"), c(0, "m", "tonic"), c(2, "dim7", "passing"), c(7, "7b9", "dominant")]),
      p("relative-hero", 4, ["hook", "contrast"], 3, [c(3, "maj", "color"), c(8, "maj", "predominant"), c(7, "7", "dominant"), c(0, "m", "tonic")]),
    ],
  },
};

export const profiles: Record<Artist, Pick<Profile, "color" | "note">> = Object.fromEntries(artists.map((artist) => [artist, { color: engines[artist].color, note: engines[artist].note }])) as Record<Artist, Pick<Profile, "color" | "note">>;
export const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const flatNames = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
export const pitchClasses: Record<string, number> = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };

const mod = (value: number, divisor = 12) => ((value % divisor) + divisor) % divisor;
const choose = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const noteName = (pc: number, flats: boolean) => (flats ? flatNames : sharpNames)[mod(pc)];
const chordName = (pc: number, suffix: string, flats: boolean) => `${noteName(pc, flats)}${suffix}`;
const distance = (a: number, b: number) => Math.min(mod(a - b), mod(b - a));

type PlannedBar = { center: number; plan: ChordPlan; phraseId: string };

const sectionArcs: Record<SectionType, PhraseRole[]> = {
  "Intro": ["opening", "answer", "release"],
  "Verse": ["opening", "answer", "turnaround", "release"],
  "Pre-chorus": ["lift", "build", "build", "turnaround"],
  "Chorus": ["hook", "answer", "hook", "release"],
  "Bridge": ["contrast", "build", "turnaround", "release"],
  "Solo": ["vamp", "answer", "build", "turnaround"],
  "Outro": ["release", "hook", "release", "release"],
};

function chordTones(root: number, suffix: string) {
  if (suffix.includes("dim")) return [0, 3, 6, 9].map((interval) => mod(root + interval));
  if (suffix.includes("m7b5")) return [0, 3, 6, 10].map((interval) => mod(root + interval));
  if (suffix.includes("sus")) return [0, 5, 7].map((interval) => mod(root + interval));
  if (suffix.includes("m") && !suffix.includes("maj")) return [0, 3, 7, ...(suffix.includes("7") || suffix.includes("9") || suffix.includes("11") ? [10] : [])].map((interval) => mod(root + interval));
  if (suffix.includes("7") && !suffix.includes("maj")) return [0, 4, 7, 10].map((interval) => mod(root + interval));
  if (suffix.includes("maj7")) return [0, 4, 7, 11].map((interval) => mod(root + interval));
  return [0, 4, 7].map((interval) => mod(root + interval));
}

function voiceLeadScore(previous: PlannedBar | undefined, next: PlannedBar) {
  if (!previous) return 0.7;
  const previousRoot = mod(previous.center + previous.plan.offset);
  const nextRoot = mod(next.center + next.plan.offset);
  const shared = chordTones(previousRoot, previous.plan.suffix).filter((tone) => chordTones(nextRoot, next.plan.suffix).includes(tone)).length;
  return shared * 1.1 + (distance(previousRoot, nextRoot) <= 2 ? 1 : distance(previousRoot, nextRoot) <= 5 ? 0.45 : 0);
}

function weightedPick<T>(entries: { value: T; weight: number }[]) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let threshold = Math.random() * total;
  for (const entry of entries) {
    threshold -= entry.weight;
    if (threshold <= 0) return entry.value;
  }
  return entries[0].value;
}

function chooseContext(previous: HarmonicState | undefined, profile: Profile) {
  if (!previous) {
    const center = Math.floor(Math.random() * 12);
    return { center, mode: choose(profile.modes), useFlats: [1, 3, 5, 6, 8, 10].includes(center) ? Math.random() > 0.42 : Math.random() > 0.75 };
  }
  // A new section should feel connected to the last landing, while retaining
  // enough regional motion to avoid treating a key signature as a hard wall.
  const center = weightedPick([
    { value: previous.endingPc, weight: 4.5 },
    { value: previous.center, weight: 2.7 },
    { value: mod(previous.endingPc + 5), weight: 2.1 },
    { value: mod(previous.endingPc + 7), weight: 1.9 },
    { value: mod(previous.center + 9), weight: 1.25 },
    { value: mod(previous.endingPc + choose(profile.shifts)), weight: 0.9 },
  ]);
  const mode = Math.random() < 0.64 ? previous.mode : choose(profile.modes);
  return { center, mode, useFlats: [1, 3, 5, 6, 8, 10].includes(center) ? Math.random() > 0.38 : Math.random() > 0.78 };
}

function choosePhrase(profile: Profile, role: PhraseRole, complexity: number, used: Set<string>, last: PlannedBar | undefined, center: number) {
  const candidates = profile.phrases.filter((phrase) => phrase.min <= complexity);
  const freshCandidates = candidates.filter((phrase) => !used.has(phrase.id));
  const pool = freshCandidates.length ? freshCandidates : candidates;
  const rated = pool.map((phrase) => {
    const first: PlannedBar = { center, plan: phrase.chords[0], phraseId: phrase.id };
    const artistFit = phrase.roles.includes(role) ? 4 : 0.45;
    const novelty = freshCandidates.length ? 1.2 : -1.4;
    const tensionFit = role === "build" || role === "turnaround" ? phrase.tension * 0.45 : (5 - phrase.tension) * 0.12;
    return { phrase, score: artistFit + novelty + tensionFit + voiceLeadScore(last, first) + Math.random() * 1.2 };
  });
  rated.sort((a, b) => b.score - a.score);
  const shortlist = rated.slice(0, Math.min(3, rated.length));
  const lowestScore = Math.min(...shortlist.map((entry) => entry.score));
  let threshold = Math.random() * shortlist.reduce((total, entry) => total + entry.score - lowestScore + 0.55, 0);
  let chosen = shortlist[0].phrase;
  for (const entry of shortlist) {
    threshold -= entry.score - lowestScore + 0.55;
    if (threshold <= 0) { chosen = entry.phrase; break; }
  }
  used.add(chosen.id);
  if (freshCandidates.length) return chosen;

  // A long form can outgrow the profile's low-complexity vocabulary. Keep the
  // function intact but alter one inner color so a phrase never returns verbatim.
  const target = role === "turnaround" || role === "build" ? 2 : 1;
  const replacement = { ...chosen.chords[target] };
  if (replacement.suffix.includes("sus4")) replacement.suffix = replacement.suffix.replace("sus4", "sus2");
  else if (replacement.suffix.includes("add9")) replacement.suffix = replacement.suffix.replace("add9", "maj7");
  else if (replacement.suffix === "maj") replacement.suffix = "add9";
  else if (replacement.suffix.includes("maj")) replacement.suffix = replacement.suffix.replace("maj7", "add9").replace("maj9", "add9");
  else if (replacement.suffix === "m") replacement.suffix = "m7";
  else if (replacement.suffix.includes("m7")) replacement.suffix = replacement.suffix.replace("m7", complexity > 2 ? "m9" : "m");
  else if (replacement.suffix.includes("13")) replacement.suffix = "7sus4";
  else replacement.suffix = replacement.suffix.includes("7") ? "sus4" : "add9";
  const chords = chosen.chords.map((chord, index) => index === target ? replacement : chord);
  return { ...chosen, id: `${chosen.id}-answer-${Math.random()}`, chords };
}

function scheduledModulationBars(bars: number, slider: number) {
  if (bars < 2 || slider <= 10) return new Set<number>();
  const middle = Math.max(1, Math.floor(bars / 2));
  if (slider <= 35) return Math.random() < (slider - 10) / 25 ? new Set([middle]) : new Set<number>();
  if (slider <= 65) return new Set([middle]);
  const points = new Set([middle]);
  if (bars > 3) points.add(Math.min(bars - 1, middle + 1));
  if (slider > 85 && bars > 4) points.add(Math.max(1, middle - 1));
  return points;
}

function applyInsidePartModulations(planned: PlannedBar[], profile: Profile, complexity: number, slider: number) {
  const points = Array.from(scheduledModulationBars(planned.length, slider)).sort((a, b) => a - b);
  points.forEach((point) => {
    const previous = planned[point - 1];
    if (!previous) return;
    const oldCenter = previous.center;
    const shiftOptions = profile.shifts.filter((shift) => mod(oldCenter + shift) !== oldCenter);
    const nextCenter = mod(oldCenter + choose(shiftOptions.length ? shiftOptions : profile.shifts));
    const pivot = pivotBar(choose(profile.pivots), nextCenter, oldCenter, complexity);
    if (pivot) planned[point - 1] = pivot;
    for (let index = point; index < planned.length; index += 1) planned[index] = { ...planned[index], center: nextCenter };
  });
}

function pivotBar(kind: PivotKind, nextCenter: number, oldCenter: number, complexity: number): PlannedBar | null {
  if (kind === "direct" || kind === "mediant") return null;
  if (kind === "diminished") return { center: nextCenter, plan: c(11, "dim7", "passing"), phraseId: "pivot" };
  if (kind === "commonTone") return { center: nextCenter, plan: c(9, complexity > 2 ? "m9" : "m7", "predominant"), phraseId: "pivot" };
  if (kind === "backcycle") return { center: nextCenter, plan: c(2, complexity > 3 ? "m9" : "m7", "predominant"), phraseId: "pivot" };
  return { center: nextCenter, plan: c(7, complexity > 3 ? "13" : "7sus4", "dominant"), phraseId: oldCenter === nextCenter ? "pivot" : "pivot" };
}

function tonicSuffix(profile: Profile, mode: Mode, complexity: number) {
  const options = mode === "minor" ? profile.minorTonic : profile.majorTonic;
  return choose(options.slice(0, Math.min(options.length, complexity > 3 ? options.length : 2)));
}

function applyCadence(bars: PlannedBar[], profile: Profile, section: SectionType, mode: Mode, complexity: number) {
  if (bars.length < 2) return;
  const finalCenter = bars[bars.length - 1].center;
  const cadence = choose(profile.cadences);
  const set = (index: number, offset: number, suffix: string, fn: HarmonicFunction) => { bars[index] = { center: finalCenter, plan: c(offset, suffix, fn), phraseId: "cadence" }; };
  const minor = mode === "minor";
  const tonic = tonicSuffix(profile, mode, complexity);

  if (section === "Pre-chorus") {
    if (cadence === "iiV" && bars.length >= 2) { set(-2 + bars.length, 2, minor ? "m7b5" : "m7", "predominant"); set(-1 + bars.length, 7, complexity > 3 ? "13" : "7sus4", "dominant"); }
    else if (cadence === "neoclassical") { set(-2 + bars.length, 11, "dim7", "passing"); set(-1 + bars.length, 7, "7b9", "dominant"); }
    else set(-1 + bars.length, 7, complexity > 3 ? "13sus4" : "7sus4", "dominant");
    return;
  }

  if (section === "Chorus" || section === "Outro") {
    if (cadence === "iiV" && bars.length >= 3) { set(-3 + bars.length, 2, minor ? "m7b5" : "m9", "predominant"); set(-2 + bars.length, 7, complexity > 3 ? "13" : "7", "dominant"); set(-1 + bars.length, 0, tonic, "tonic"); }
    else if (cadence === "backdoor" && bars.length >= 2) { set(-2 + bars.length, 10, "13", "dominant"); set(-1 + bars.length, 0, tonic, "tonic"); }
    else if (cadence === "neoclassical" && bars.length >= 3) { set(-3 + bars.length, 5, "m", "predominant"); set(-2 + bars.length, 7, "7b9", "dominant"); set(-1 + bars.length, 0, tonic, "tonic"); }
    else if (cadence === "plagal" && bars.length >= 2) { set(-2 + bars.length, minor ? 5 : 5, minor ? "m7" : "maj7", "predominant"); set(-1 + bars.length, 0, tonic, "tonic"); }
    else if (cadence === "modal" && bars.length >= 2) { set(-2 + bars.length, minor ? 10 : 10, minor ? "maj" : "add9", "color"); set(-1 + bars.length, 0, tonic, "tonic"); }
    else { set(-2 + bars.length, 7, "sus4", "dominant"); set(-1 + bars.length, 0, tonic, "tonic"); }
    return;
  }

  if ((section === "Verse" || section === "Bridge") && complexity >= 4 && Math.random() < 0.55) {
    if (cadence === "neoclassical") set(-1 + bars.length, 7, "7b9", "dominant");
    else if (cadence === "iiV") set(-1 + bars.length, 7, "13", "dominant");
    else if (cadence === "rock") set(-1 + bars.length, 7, "sus4", "dominant");
  }
}

function parseNamedChord(chord: string) {
  const match = chord.match(/^([A-G])([#b]?)(.*)/);
  if (!match) return { root: 0, suffix: "" };
  return { root: pitchClasses[`${match[1]}${match[2]}`] ?? 0, suffix: match[3] };
}

/** Scores a four-bar harmonic candidate for continuity, voice-leading, and
 * artist-appropriate contrast. It deliberately rewards several viable paths
 * instead of locking the generator to one key or progression. */
export function scoreProgressionCandidate(artist: Artist, section: SectionType, generation: HarmonicGeneration, previous?: HarmonicState) {
  const parsed = generation.progression.map(parseNamedChord);
  if (!parsed.length) return -1000;
  let score = 0;
  const uniqueChords = new Set(generation.progression).size;
  const uniqueRoots = new Set(parsed.map((chord) => chord.root)).size;
  const pedalFriendly = artist === "Waxamilion" || artist === "Owane" || artist === "Yngwie Malmsteen";
  score += uniqueChords * 2.1 + uniqueRoots * 1.2;

  parsed.forEach((chord, index) => {
    if (!index) return;
    const prior = parsed[index - 1];
    const shared = chordTones(prior.root, prior.suffix).filter((tone) => chordTones(chord.root, chord.suffix).includes(tone)).length;
    const rootMotion = distance(prior.root, chord.root);
    score += shared * 1.15 + (rootMotion <= 2 ? 1.2 : rootMotion <= 5 ? 0.55 : -0.25);
    if (prior.root === chord.root && prior.suffix === chord.suffix) score -= 8;
    else if (prior.root === chord.root && !pedalFriendly) score -= 1.3;
  });

  const centerChanges = generation.localCenters.filter((center, index) => index > 0 && center !== generation.localCenters[index - 1]).length;
  if (centerChanges) score += centerChanges * 2.4;
  if (centerChanges > 2) score -= (centerChanges - 2) * 3;

  const first = parsed[0]; const last = parsed[parsed.length - 1];
  if (previous) {
    const openingTones = chordTones(first.root, first.suffix);
    const openingDistance = distance(previous.endingPc, first.root);
    score += openingTones.includes(previous.endingPc) ? 5.2 : openingDistance <= 2 ? 2.3 : openingDistance <= 5 ? 0.8 : -2.4;
    score += generation.mode === previous.mode ? 0.8 : 0.35;
  }

  const finalCenter = generation.localCenters.at(-1) ?? generation.center;
  const finalDistance = distance(last.root, finalCenter);
  if (section === "Pre-chorus") score += finalDistance === 5 ? 4.5 : finalDistance === 7 ? 3.8 : 0;
  else if (section === "Chorus" || section === "Outro") score += finalDistance === 0 ? 5.8 : finalDistance <= 2 ? 1.2 : -1.3;
  else score += finalDistance === 0 ? 2.6 : finalDistance === 7 ? 1.3 : 0;
  if (section === "Solo" || section === "Bridge") score += uniqueRoots >= 3 ? 2.1 : 0;
  return score;
}

export function createProgression(artist: Artist, bars: number, section: SectionType, complexity: number, modulation: number, previous?: HarmonicState): HarmonicGeneration {
  const profile = engines[artist];
  const { center, mode, useFlats } = chooseContext(previous, profile);
  const used = new Set<string>();
  const blocks: PlannedBar[][] = [];
  const localCenter = center;
  let last: PlannedBar | undefined;

  for (let block = 0; block < Math.ceil(bars / 4); block += 1) {
    const arc = sectionArcs[section];
    const role = arc[Math.min(block, arc.length - 1)];
    const phrase = choosePhrase(profile, role, complexity, used, last, localCenter);
    const phraseBars = phrase.chords.map((plan) => ({ center: localCenter, plan, phraseId: phrase.id }));
    blocks.push(phraseBars);
    last = phraseBars[phraseBars.length - 1];
  }

  const planned = blocks.flat().slice(0, bars);
  applyInsidePartModulations(planned, profile, complexity, modulation);
  applyCadence(planned, profile, section, mode, complexity);
  const lastBar = planned[planned.length - 1];
  return {
    progression: planned.map((bar) => chordName(bar.center + bar.plan.offset, bar.plan.suffix, useFlats)),
    localCenters: planned.map((bar) => bar.center),
    center,
    mode,
    useFlats,
    endingPc: mod(lastBar.center + lastBar.plan.offset),
  };
}

export const keyLabel = (state: Pick<HarmonicState, "center" | "mode" | "useFlats">) => `${noteName(state.center, state.useFlats)} ${state.mode}`;
