import type { Artist } from "./harmonic-engine";

export type PhraseMotion = "statement" | "answer" | "development" | "arrival";
export type ArtistBehavior = {
  summary: string;
  /** Indices into a four-chord gesture; repeated slots prolong a harmony. */
  harmonicPacing: number[][];
  phraseCycle: PhraseMotion[];
  recallEvery: number;
  answer: "return" | "sequence" | "displace" | "contrast";
  register: [number, number];
  accents: number[];
  landing: number[];
  tensionArc: number[];
  expression: { bend: number; slide: number; legato: number; mute: number; vibrato: number; depthCents: number; rateHz: number };
};

// Original design choices informed by the references in docs/profile-design.md.
// These values are interpretations, not measurements of an artist's recordings.
export const artistBehaviors: Record<Artist, ArtistBehavior> = {
  "Nick Johnston": {
    summary: "Broad chord holds, returning vocal-like phrases, third/fifth landings, singing bends and delayed vibrato.",
    harmonicPacing: [[0, 0, 2, 3], [0, 1, 2, 3]], phraseCycle: ["statement", "answer", "statement", "arrival"], recallEvery: 2, answer: "return", register: [59, 74], accents: [0, 2.5], landing: [1, 2, 0], tensionArc: [1, 2, 3, 1],
    expression: { bend: .55, slide: .18, legato: .5, mute: .08, vibrato: .9, depthCents: 24, rateHz: 5.2 },
  },
  "Moray Pringle": {
    summary: "Repeated groove anchors, short answering figures, a middle-register hook and punchy muted attacks between melodic arrivals.",
    harmonicPacing: [[0, 1, 1, 3], [0, 1, 2, 3]], phraseCycle: ["statement", "statement", "development", "answer"], recallEvery: 2, answer: "sequence", register: [55, 71], accents: [0, 1.5, 2.5], landing: [0, 2, 1], tensionArc: [1, 2, 3, 2],
    expression: { bend: .3, slide: .22, legato: .5, mute: .65, vibrato: .5, depthCents: 22, rateHz: 5.8 },
  },
  Owane: {
    summary: "Moving bright harmonies, displaced returns, upper-register chord colors and fluid slides into syncopated accents.",
    harmonicPacing: [[0, 1, 2, 3], [0, 1, 2, 3], [0, 0, 2, 3]], phraseCycle: ["statement", "development", "answer", "development"], recallEvery: 3, answer: "displace", register: [62, 76], accents: [.75, 2.25, 3.5], landing: [1, 2, 1], tensionArc: [2, 3, 2, 4],
    expression: { bend: .12, slide: .55, legato: .65, mute: .12, vibrato: .45, depthCents: 16, rateHz: 5.5 },
  },
  Waxamilion: {
    summary: "Held pedal harmony, clipped repeated cells, asymmetric answers, low/middle-register attacks and selective slides.",
    harmonicPacing: [[0, 0, 2, 3], [0, 1, 1, 3]], phraseCycle: ["statement", "answer", "development", "answer"], recallEvery: 3, answer: "contrast", register: [53, 69], accents: [0, 1.25, 2.75], landing: [0, 2, 0], tensionArc: [1, 3, 4, 2],
    expression: { bend: .06, slide: .4, legato: .25, mute: .8, vibrato: .2, depthCents: 14, rateHz: 5 },
  },
  CHON: {
    summary: "Bright moving chords, recurring displaced accents, high-register interlocks and clean connected notes with little bending.",
    harmonicPacing: [[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 1, 3]], phraseCycle: ["statement", "development", "statement", "answer"], recallEvery: 2, answer: "displace", register: [60, 76], accents: [0, 1.75, 3.25], landing: [2, 1, 0], tensionArc: [1, 2, 3, 2],
    expression: { bend: .02, slide: .3, legato: .85, mute: .1, vibrato: .16, depthCents: 10, rateHz: 5.5 },
  },
  "Marco Sfogli": {
    summary: "Spacious harmonic support, a rising melodic arc and returning hooks, broad bends and sustained vibrato at decisive arrivals.",
    harmonicPacing: [[0, 0, 2, 3], [0, 1, 1, 3], [0, 1, 2, 3]], phraseCycle: ["statement", "answer", "development", "arrival"], recallEvery: 2, answer: "return", register: [60, 76], accents: [0, 2], landing: [0, 2, 1], tensionArc: [1, 2, 4, 1],
    expression: { bend: .65, slide: .18, legato: .65, mute: .08, vibrato: .95, depthCents: 32, rateHz: 5.4 },
  },
  "Guthrie Govan": {
    summary: "Moving fusion changes, contrasting conversational answers, targeted thirds, short blues bends and varied articulation.",
    harmonicPacing: [[0, 1, 2, 3], [0, 1, 1, 3]], phraseCycle: ["statement", "answer", "development", "answer"], recallEvery: 4, answer: "contrast", register: [57, 75], accents: [.5, 2.25, 3.5], landing: [1, 2, 0], tensionArc: [2, 3, 4, 2],
    expression: { bend: .45, slide: .45, legato: .7, mute: .25, vibrato: .7, depthCents: 26, rateHz: 5.7 },
  },
  "Greg Howe": {
    summary: "Active harmonic motion, compact sequenced answers, offbeat accents and punchy legato with short slides into held tones.",
    harmonicPacing: [[0, 1, 2, 3]], phraseCycle: ["statement", "development", "answer", "development"], recallEvery: 2, answer: "sequence", register: [58, 74], accents: [.5, 1.75, 3], landing: [1, 0, 2], tensionArc: [2, 3, 4, 3],
    expression: { bend: .15, slide: .65, legato: .95, mute: .25, vibrato: .55, depthCents: 24, rateHz: 6 },
  },
  "Yngwie Malmsteen": {
    summary: "Steady minor-key harmonic motion, sequenced development, emphatic root arrivals and broad vibrato after articulated runs.",
    harmonicPacing: [[0, 1, 2, 3]], phraseCycle: ["statement", "development", "development", "arrival"], recallEvery: 2, answer: "sequence", register: [60, 76], accents: [0, 1, 2, 3], landing: [0, 0, 2], tensionArc: [1, 3, 4, 1],
    expression: { bend: .4, slide: .08, legato: .35, mute: .18, vibrato: .95, depthCents: 42, rateHz: 6.2 },
  },
  "Matteo Mancuso": {
    summary: "Moving chord-led fusion, arpeggio-based sequences, high-register bursts and clean connected notes leading to restrained held answers.",
    harmonicPacing: [[0, 1, 2, 3], [0, 1, 2, 3], [0, 1, 1, 3]], phraseCycle: ["statement", "development", "answer", "arrival"], recallEvery: 3, answer: "sequence", register: [61, 76], accents: [0, 1.5, 3], landing: [1, 2, 0], tensionArc: [1, 3, 2, 3],
    expression: { bend: .08, slide: .4, legato: .85, mute: .08, vibrato: .4, depthCents: 16, rateHz: 5.7 },
  },
};
