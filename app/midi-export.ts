import { expressionLabel, pitchGesturePoints } from "./guitar-expression";
import type { PerformanceEvent, PerformanceIdea } from "./performance-engine";

export const MIDI_TICKS_PER_BEAT = 480;
export const MIDI_BEND_RANGE = 12;
const textBytes = (text: string) => Array.from(new TextEncoder().encode(text));
function vlq(value: number) { const bytes = [value & 0x7f]; while ((value >>= 7)) bytes.unshift((value & 0x7f) | 0x80); return bytes; }
function u32(value: number) { return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]; }
function metaText(type: number, text: string) { const bytes = textBytes(text); return [0xff, type, ...vlq(bytes.length), ...bytes]; }
type Message = { tick: number; order: number; bytes: number[] };

function midiTrack(events: PerformanceEvent[], name: string, idea: PerformanceIdea, channel: number, expressive = false) {
  const tick = (beat: number) => Math.round(beat * MIDI_TICKS_PER_BEAT);
  const micros = Math.round(60000000 / idea.tempo);
  const ch = channel - 1;
  const messages: Message[] = [
    { tick: 0, order: 0, bytes: metaText(3, name) },
    { tick: 0, order: 0, bytes: [0xff, 0x51, 3, (micros >>> 16) & 255, (micros >>> 8) & 255, micros & 255] },
    ...idea.meterMap.meters.map((meter, bar) => {
      const [numerator, denominator] = meter.label.split("/").map(Number);
      return { tick: tick(idea.meterMap.starts[bar]), order: 0, bytes: [0xff, 0x58, 4, numerator, Math.log2(denominator), 24, 8] };
    }),
  ];
  let hasPitch = false;
  const bend = (at: number, cents: number, order: number) => {
    const value = Math.min(16383, Math.max(0, Math.round(8192 + cents / (MIDI_BEND_RANGE * 100) * 8192)));
    messages.push({ tick: at, order, bytes: [0xe0 | ch, value & 127, (value >> 7) & 127] });
  };
  events.forEach((event, index) => {
    const start = tick(event.time), end = Math.max(start + 1, tick(event.time + event.duration));
    for (const note of event.notes) {
      messages.push({ tick: start, order: 5, bytes: [0x90 | ch, note.midi, Math.max(1, Math.min(127, Math.round(event.velocity * 96)))] });
      messages.push({ tick: end, order: 2, bytes: [0x80 | ch, note.midi, 0] });
    }
    if (!expressive || !event.expression) return;
    // A legacy/saved polyphonic riff must never bend another sounding note.
    const overlaps = events.some((other, otherIndex) => otherIndex !== index
      && tick(other.time) < end && Math.max(tick(other.time) + 1, tick(other.time + other.duration)) > start);
    const points = event.notes.length === 1 && !overlaps
      ? pitchGesturePoints(event.notes[0].midi, event.duration * 60 / idea.tempo, 60 / idea.tempo, event.expression) : [];
    if (event.notes.length === 1) messages.push({ tick: start, order: 0, bytes: metaText(6, `${expressionLabel(event.expression)}${overlaps && points.length === 0 ? " (pitch omitted: overlapping notes)" : ""}`) });
    if (!points.length) return;
    hasPitch = true;
    // Keep one bend per tick. End reset precedes the next note's initial bend.
    const curve = new Map<number, number>();
    points.slice(0, -1).forEach((point) => {
      const at = start + tick(point.time * idea.tempo / 60);
      if (at < end) curve.set(at, point.cents);
    });
    curve.forEach((cents, at) => bend(at, cents, 4));
    bend(end, 0, 3);
  });
  if (hasPitch) {
    // RPN 0 sets pitch-bend sensitivity; null the RPN after data entry.
    for (const [controller, value] of [[101, 0], [100, 0], [6, MIDI_BEND_RANGE], [38, 0], [101, 127], [100, 127]]) {
      messages.push({ tick: 0, order: 1, bytes: [0xb0 | ch, controller, value] });
    }
    bend(0, 0, 3);
  }
  messages.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const track: number[] = []; let previous = 0;
  messages.forEach((message) => { track.push(...vlq(message.tick - previous), ...message.bytes); previous = message.tick; });
  track.push(...vlq(Math.max(0, tick(idea.meterMap.totalBeats) - previous)), 0xff, 0x2f, 0);
  return [...textBytes("MTrk"), ...u32(track.length), ...track];
}

/** Independent channels isolate lead pitch gestures from the accompaniment. */
export function createMidiBytes(idea: PerformanceIdea, style: string, chords: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array([
    ...textBytes("MThd"), 0, 0, 0, 6, 0, 1, 0, 5, MIDI_TICKS_PER_BEAT >> 8, MIDI_TICKS_PER_BEAT & 255,
    ...midiTrack(idea.riff, `${style} · riff · ${chords}`, idea, 1, true),
    ...midiTrack(idea.harmony, `${style} · chords · ${chords}`, idea, 2),
    ...midiTrack(idea.chordRhythm, `${style} · chord rhythm · ${chords}`, idea, 3),
    ...midiTrack(idea.bass ?? [], `${style} · bass · ${chords}`, idea, 4),
    ...midiTrack(idea.drums ?? [], `${style} · drums · ${chords}`, idea, 10),
  ]);
}
