import type { Artist } from "./harmonic-engine";

export type RhythmCell = { id: string; times: number[]; durations: number[]; accents: number[]; cadence?: boolean };
type PhrasingProfile = {
  rhythms: string[];
  /** Relative scale degrees: choose once, then recall/develop across the section. */
  contours: number[][];
  gate: number;
  dynamicRange: number;
  approach: number;
  arpeggio: number;
  density: [number, number];
  cells?: RhythmCell[];
};

// Original musical constraints, not transcriptions or learned artist models.
// Probability weights describe the generator's interpretation of each profile.
export const phrasingProfiles: Record<Artist, PhrasingProfile> = {
  "Nick Johnston": {
    rhythms: ["lyric-space", "suspended-answer", "offbeat-lyric"],
    contours: [[0, 1, 3, 2, 1, 0], [0, 2, 1, 0, -1, 0]],
    gate: .88, dynamicRange: .17, approach: .12, arpeggio: .08, density: [.45, 1.2],
  },
  "Moray Pringle": {
    rhythms: ["chug-answer", "push-chug", "stomp-space"],
    contours: [[0, 0, 2, 3, 1, 0], [0, -2, 0, 2, 1, 0]],
    gate: .62, dynamicRange: .2, approach: .16, arpeggio: .12, density: [.7, 1.5],
  },
  Owane: {
    rhythms: ["angular-displace", "angular-lift", "angular-weave"],
    contours: [[0, 2, 5, 3, 4, 1], [0, 3, 1, 4, 2, 0]],
    gate: .72, dynamicRange: .16, approach: .14, arpeggio: .38, density: [.8, 1.65],
  },
  Waxamilion: {
    rhythms: ["pedal-push", "pedal-echo", "pedal-rattle"],
    contours: [[0, 3, 0, 2, 0, -1], [0, 0, 4, 1, 0, 2]],
    gate: .54, dynamicRange: .23, approach: .08, arpeggio: .1, density: [.7, 1.55],
  },
  CHON: {
    rhythms: ["interlock-a", "interlock-c", "interlock-e"],
    contours: [[0, 2, 4, 1, 3, 2], [0, 3, 1, 4, 2, 0]],
    gate: .82, dynamicRange: .13, approach: .03, arpeggio: .45, density: [.9, 1.8],
  },
  "Marco Sfogli": {
    rhythms: ["lyric-space", "late-lift", "answer-pickup"],
    contours: [[0, 2, 4, 3, 2, 0], [0, 1, 2, 4, 3, 2]],
    gate: .96, dynamicRange: .15, approach: .07, arpeggio: .12, density: [.45, 1.25],
  },
  "Guthrie Govan": {
    rhythms: ["fusion-space", "fusion-lilt", "fusion-turn"],
    contours: [[0, -1, 1, 3, 2, 0], [0, 2, 1, -1, 0, 3]],
    gate: .86, dynamicRange: .22, approach: .48, arpeggio: .25, density: [.7, 1.65],
  },
  "Greg Howe": {
    rhythms: ["fusion-groove", "fusion-pickup", "fusion-turn"],
    contours: [[0, 1, 2, 1, 3, 2], [0, 2, 1, 3, 2, 4]],
    gate: .91, dynamicRange: .18, approach: .36, arpeggio: .3, density: [.9, 1.9],
  },
  "Yngwie Malmsteen": {
    rhythms: ["sequence-run", "sequence-climb", "sequence-pedal"],
    contours: [[0, 2, 1, 0, 3, 2, 1], [0, 1, 2, 0, 1, 2, 3]],
    gate: .81, dynamicRange: .12, approach: 0, arpeggio: .4, density: [1, 2.1],
  },
  "Matteo Mancuso": {
    rhythms: ["mancuso-flow", "mancuso-fourths", "mancuso-triplet", "fusion-space"],
    contours: [[0, 2, 4, 6, 5, 3, 1, 2], [0, 3, 2, 5, 4, 2, 1, 0], [0, 1, 2, 4, 3, 1, 2, 0]],
    gate: .97, dynamicRange: .19, approach: .34, arpeggio: .58, density: [1, 2.5],
    cells: [
      { id: "mancuso-flow", times: [0, .5, .75, 1, 1.5, 2, 2.25, 2.5, 3.25], durations: [.46, .24, .24, .48, .46, .24, .24, .6, .65], accents: [0, 4, 8] },
      { id: "mancuso-fourths", times: [.25, .75, 1.25, 1.5, 2, 2.5, 2.75, 3.25], durations: [.46, .46, .24, .46, .46, .24, .46, .65], accents: [0, 3, 7] },
      { id: "mancuso-triplet", times: [0, 1/3, 2/3, 1, 1.5, 2, 7/3, 8/3, 3], durations: [.32, .32, .32, .46, .46, .32, .32, .32, .85], accents: [0, 3, 5, 8], cadence: true },
    ],
  },
};
