import { artistBehaviors } from "./artist-behavior";
import { chordTonesForQuality } from "./chord-tones";
import { pitchClasses, type Artist } from "./harmonic-engine";
import type { HarmonyEvent, MeterMap, PerformanceEvent } from "./performance-engine";

export type GuitarExpression = {
  technique: "picked" | "legato" | "slide" | "bend" | "palm-mute";
  /** Target pitch stays in notes; fromMidi is the fretted starting pitch. */
  fromMidi?: number;
  vibrato?: { depthCents: number; rateHz: number; delayBeats: number };
};
export type PitchPoint = { time: number; cents: number };
const clamp = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
const pc = (n: number) => ((n % 12) + 12) % 12;
const tonesFor = (chord: string) => {
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  return match ? chordTonesForQuality(pitchClasses[match[1]], match[2]) : [];
};

/** Articulate a realized line. Only single notes receive pitch gestures, and
 * connected techniques require a playable same-string source and destination. */
export function applyGuitarExpression(artist: Artist, events: PerformanceEvent[], harmony: HarmonyEvent[], meter: MeterMap): PerformanceEvent[] {
  const style = artistBehaviors[artist].expression;
  const result: PerformanceEvent[] = [];
  events.forEach((source, index) => {
    const event = { ...source };
    const note = event.notes[0]; const previous = result.at(-1); const previousNote = previous?.notes[0];
    if (event.notes.length !== 1) { result.push(event); return; }
    const chord = harmony.findLast((h) => h.time <= event.time + 1e-6)?.chord ?? "C";
    const stable = tonesFor(chord).includes(pc(note.midi));
    const bar = Math.max(0, meter.starts.findLastIndex((start) => start <= event.time));
    const end = meter.starts[bar] + meter.meters[bar].beatsPerBar;
    const ending = !events[index + 1] || events[index + 1].time >= end;
    const gap = previous ? event.time - previous.time - previous.duration : Infinity;
    const connected = previous?.notes.length === 1 && previousNote && gap >= -.001 && gap <= .12
      && note.string === previousNote.string && note.fret > 0 && previousNote.fret > 0
      && !["palm-mute", "bend"].includes(previous.expression?.technique ?? "");
    const interval = previousNote ? Math.abs(note.midi - previousNote.midi) : 0;
    const expression: GuitarExpression = { technique: "picked" };
    if (stable && event.duration >= .9 && note.string <= 2 && note.fret >= 3 && Math.random() < style.bend) {
      expression.technique = "bend";
      expression.fromMidi = note.midi - (Math.random() < .75 ? 2 : 1);
    } else if (connected && interval >= 2 && interval <= 5 && event.duration >= .3 && Math.random() < style.slide) {
      expression.technique = "slide"; expression.fromMidi = previousNote.midi;
    } else if (connected && interval > 0 && interval <= 4 && Math.random() < style.legato) {
      expression.technique = "legato"; event.velocity *= .92;
    } else if (!ending && event.duration <= .75 && (note.string >= 3 || note.midi <= 64) && Math.random() < style.mute) {
      expression.technique = "palm-mute";
      event.duration = Math.min(event.duration, .22);
      event.velocity *= .86;
    }
    if (stable && event.duration >= 1 && expression.technique !== "palm-mute" && Math.random() < style.vibrato) {
      expression.vibrato = { depthCents: style.depthCents, rateHz: style.rateHz, delayBeats: expression.technique === "bend" ? .65 : .45 };
    }
    if (expression.technique !== "picked" || expression.vibrato) event.expression = expression;
    result.push(event);
  });
  return result;
}

/** Shared pitch envelope for sampled preview and standard MIDI pitch bend.
 * Times are seconds; bend/slide arrival time is limited to a short fraction of
 * the note, and vibrato fades in only after the target has settled. */
export function pitchGesturePoints(midi: number, durationSeconds: number, secondsPerBeat: number, expression?: GuitarExpression): PitchPoint[] {
  if (!expression || durationSeconds <= 0) return [];
  const bends = expression.technique === "bend" || expression.technique === "slide";
  const from = bends && Number.isFinite(expression.fromMidi) ? clamp((expression.fromMidi! - midi) * 100, -500, 500) : 0;
  const arrival = Math.min(durationSeconds * .35, secondsPerBeat * (expression.technique === "bend" ? .3 : .18));
  const vibrato = expression.vibrato;
  const depth = vibrato && Number.isFinite(vibrato.depthCents) ? clamp(vibrato.depthCents, 0, 50) : 0;
  const rate = vibrato && Number.isFinite(vibrato.rateHz) ? clamp(vibrato.rateHz, 3, 8) : 5;
  const delay = Math.max(arrival, (vibrato && Number.isFinite(vibrato.delayBeats) ? clamp(vibrato.delayBeats, 0, 2) : .45) * secondsPerBeat);
  if (!from && !depth) return [];
  const steps = Math.max(2, Math.min(1024, Math.ceil(durationSeconds * 60)));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const time = durationSeconds * i / steps;
    const progress = arrival > 0 ? clamp(time / arrival, 0, 1) : 1;
    const approach = from * (1 - progress) ** 2;
    const fadeIn = clamp((time - delay) / .15, 0, 1);
    const fadeOut = clamp((durationSeconds - time) / .06, 0, 1);
    const vibratoCents = depth * fadeIn * fadeOut * Math.sin(2 * Math.PI * rate * Math.max(0, time - delay));
    return { time, cents: i === steps ? 0 : approach + vibratoCents };
  });
}

export function expressionLabel(expression?: GuitarExpression): string {
  if (!expression) return "Picked";
  const labels = { picked: "Picked", legato: "Legato", slide: "Slide", bend: "Bend", "palm-mute": "Palm mute" };
  return expression.vibrato ? expression.technique === "picked" ? "Vibrato" : `${labels[expression.technique]} + vibrato` : labels[expression.technique];
}
