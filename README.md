# Riffizer

Riffizer is a mobile-first guitar idea generator. It creates four-bar chord
charts and playable, original riff ideas guided by artist-inspired high-level
composition profiles.

The public Site is available at [riffizer.ojertrejo.chatgpt.site](https://riffizer.ojertrejo.chatgpt.site).

## What it does

- Builds a chord chart and a playable riff together, with optional chord-harmony
  playback and MIDI export.
- Creates a separate style-aware **Chord rhythm** lane: compact playable chord
  stabs whose rhythm is generated from the selected profile and scored against
  the riff's accents and gaps while the chart remains unchanged.
- Keeps the chart fixed when using **Regenerate riff**. Only **Riffize** creates
  a new progression.
- Keeps whole-section continuity: a new part considers the prior landing,
  melodic handoff, and rhythmic contrast instead of resetting to a hard key.
- Uses a candidate-selection pass to favor phrase shape, harmonic flow, varied
  rhythm, compact dyads/triads, adjacent string sets, and visible fretboard
  positions.
- Has separate controls for melodic/harmonic complexity, chord placement and
  meter, internal modulation, and tempo.
- Includes original high-level profiles for Nick Johnston, Moray Pringle, Owane,
  Waxamilion, CHON, Marco Sfogli, Guthrie Govan, Greg Howe, and Yngwie Malmsteen.

Profiles use broad composition and playability tendencies only. They do not
contain transcriptions, tabs, sampled performances, or copied song material.

## GitHub Pages mirror

The `Deploy GitHub Pages mirror` workflow creates a static deployment from the
same source. In the repository's **Settings → Pages**, select **GitHub Actions**
as the source once. Future pushes to `main` publish automatically.

## Local development

```sh
npm ci
npm run dev
```

Use `npm run build` for the normal hosted build, or `npm run build:pages` to
produce the Pages artifact in `dist/client`.

## Logic Pro MIDI FX

`logic-midi-fx/` builds an Apple Audio Unit MIDI Processor with the same
Riffizer UI and generator. It follows Logic's project tempo and outputs
generated MIDI while the transport runs, with the existing **Riff**,
**Harmony**, and **Chord rhythm** controls selecting the live MIDI lanes. The
compact black **Drag MIDI** control sits beside **Copy Chord Names** above the
plug-in UI and starts a file drag with no save dialog: **Multi tracks** carries
named riff, chord-chart, and chord-rhythm lanes; **Single track** merges them.
Its export controls can route guitar strings to MIDI channels 1–6, with
optional channel inversion. Generated arrangements and playback/export settings
are stored in the Audio Unit state, so closing and reopening its window—or the
Logic project—restores the current idea.

```sh
npm ci
bash logic-midi-fx/scripts/build-ui.sh
cmake -S logic-midi-fx -B logic-midi-fx/build -DCMAKE_BUILD_TYPE=Release
cmake --build logic-midi-fx/build --config Release --target RiffizerMIDIFX_AU
```

The component appears at `logic-midi-fx/build/RiffizerMIDIFX_artefacts/Release/AU/Riffizer.component`.
Install it in `~/Library/Audio/Plug-Ins/Components`, then reopen Logic Pro.
Drop the generated multi-track MIDI item into Logic's Tracks area to import the
separate named lanes. Logic controls the final tracks and region placement.

## License

Released under the [Santismo License](LICENSE).
