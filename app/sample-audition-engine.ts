export type GuitarSampleTone = "electric" | "acoustic" | "nylon";
export type SampleInstrument = GuitarSampleTone | "bass" | "drums";

type SampleDefinition = { midi: number; file: string };
type LoadedSample = SampleDefinition & { buffer: AudioBuffer };

const pitchedSamples: Record<Exclude<SampleInstrument, "drums">, SampleDefinition[]> = {
  electric: [
    { midi: 40, file: "electric-e2.mp3" },
    { midi: 48, file: "electric-c3.mp3" },
    { midi: 57, file: "electric-a3.mp3" },
    { midi: 66, file: "electric-fs4.mp3" },
  ],
  acoustic: [
    { midi: 38, file: "acoustic-d2.mp3" },
    { midi: 45, file: "acoustic-a2.mp3" },
    { midi: 55, file: "acoustic-g3.mp3" },
    { midi: 60, file: "acoustic-c4.mp3" },
  ],
  nylon: [
    { midi: 42, file: "nylon-fs2.mp3" },
    { midi: 55, file: "nylon-g3.mp3" },
    { midi: 63, file: "nylon-ds4.mp3" },
    { midi: 76, file: "nylon-e5.mp3" },
  ],
  bass: [
    { midi: 25, file: "bass-cs1.mp3" },
    { midi: 28, file: "bass-e1.mp3" },
    { midi: 31, file: "bass-g1.mp3" },
    { midi: 34, file: "bass-as1.mp3" },
  ],
};

const drumSamples: Record<number, string> = {
  36: "drum-kick.wav",
  38: "drum-snare.wav",
  42: "drum-hat-closed.wav",
  46: "drum-hat-open.wav",
  49: "drum-crash.wav",
};

const sampleBytes = new Map<string, ArrayBuffer>();
const sampleByteLoads = new Map<string, Promise<ArrayBuffer>>();

function sampleUrl(file: string) {
  return new URL(`samples/${file}`, document.baseURI).toString();
}

function fetchSampleBytes(file: string) {
  const ready = sampleBytes.get(file);
  if (ready) return Promise.resolve(ready);
  const existing = sampleByteLoads.get(file);
  if (existing) return existing;
  const pending = fetch(sampleUrl(file), { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load ${file} (${response.status})`);
      return response.arrayBuffer();
    })
    .then((data) => {
      sampleBytes.set(file, data);
      return data;
    })
    .finally(() => sampleByteLoads.delete(file));
  sampleByteLoads.set(file, pending);
  return pending;
}

function filesFor(instrument: SampleInstrument) {
  return instrument === "drums" ? Object.values(drumSamples) : pitchedSamples[instrument].map((sample) => sample.file);
}

/** Starts fetching sample bytes before the first play gesture. Audio decoding
 * still happens in the user-created AudioContext. Failed files remain retryable. */
export async function prefetchSampleAssets(instruments: SampleInstrument[]) {
  const files = new Set(instruments.flatMap(filesFor));
  await Promise.allSettled(Array.from(files, fetchSampleBytes));
}

function nearestSample(samples: LoadedSample[], midi: number) {
  return samples.reduce((best, sample) => Math.abs(sample.midi - midi) < Math.abs(best.midi - midi) ? sample : best);
}

async function decodeAudio(context: AudioContext, data: ArrayBuffer) {
  return context.decodeAudioData(data.slice(0));
}

export class SampleAuditionEngine {
  readonly context: AudioContext;
  private readonly loaded = new Map<string, AudioBuffer>();
  private readonly loading = new Map<string, Promise<AudioBuffer>>();
  private readonly active = new Set<AudioBufferSourceNode>();
  private readonly output: GainNode;

  constructor(context: AudioContext) {
    this.context = context;
    this.output = context.createGain();
    this.output.gain.value = 0.82;
    this.output.connect(context.destination);
  }

  private loadFile(file: string) {
    const ready = this.loaded.get(file);
    if (ready) return Promise.resolve(ready);
    let pending = this.loading.get(file);
    if (!pending) {
      pending = fetchSampleBytes(file)
        .then((data) => decodeAudio(this.context, data))
        .then((buffer) => {
          this.loaded.set(file, buffer);
          return buffer;
        })
        .finally(() => this.loading.delete(file));
      this.loading.set(file, pending);
    }
    return pending;
  }

  async load(instruments: SampleInstrument[]) {
    await Promise.all(Array.from(new Set(instruments), async (instrument) => {
      const files = filesFor(instrument);
      await Promise.allSettled(files.map((file) => this.loadFile(file)));
      if (!files.some((file) => this.loaded.has(file))) throw new Error(`No ${instrument} samples could be decoded`);
    }));
  }

  playPitched(instrument: Exclude<SampleInstrument, "drums">, midi: number, time: number, duration: number, velocity: number, level = 1) {
    const samples = pitchedSamples[instrument]
      .map((sample) => ({ ...sample, buffer: this.loaded.get(sample.file) }))
      .filter((sample): sample is LoadedSample => Boolean(sample.buffer));
    if (!samples.length) return;
    const sample = nearestSample(samples, midi);
    const start = Math.max(this.context.currentTime + 0.004, time);
    const length = Math.max(0.07, duration);
    const release = Math.min(0.2, Math.max(0.04, length * 0.2));
    const source = this.context.createBufferSource();
    const envelope = this.context.createGain();
    source.buffer = sample.buffer;
    source.playbackRate.setValueAtTime(2 ** ((midi - sample.midi) / 12), start);
    const peak = Math.max(0.012, Math.min(0.42, velocity * level));
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(peak, start + 0.006);
    envelope.gain.setValueAtTime(peak * 0.72, Math.max(start + 0.012, start + length - release));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + length);
    source.connect(envelope).connect(this.output);
    source.onended = () => this.active.delete(source);
    this.active.add(source);
    source.start(start);
    source.stop(start + length + 0.04);
  }

  playDrum(midi: number, time: number, velocity: number) {
    const file = drumSamples[midi];
    const buffer = file ? this.loaded.get(file) : undefined;
    if (!buffer) return;
    const start = Math.max(this.context.currentTime + 0.004, time);
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(Math.max(0.025, Math.min(0.5, velocity * (midi === 36 ? 0.42 : 0.31))), start);
    source.connect(gain).connect(this.output);
    source.onended = () => this.active.delete(source);
    this.active.add(source);
    source.start(start);
  }

  stopAll() {
    this.active.forEach((source) => { try { source.stop(); } catch { /* The source already ended. */ } });
    this.active.clear();
  }

  dispose() {
    this.stopAll();
    this.output.disconnect();
  }
}
