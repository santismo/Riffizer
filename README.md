# Riffizer

Riffizer is a mobile-first guitar idea generator. It creates four-bar chord
charts and playable, original riff ideas guided by artist-inspired high-level
composition profiles.

The public Site is available at [riffizer.ojertrejo.chatgpt.site](https://riffizer.ojertrejo.chatgpt.site).

## What it does

- Builds a chord chart and a playable riff together, with optional chord-harmony
  playback and MIDI export.
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

## License

Released under the [Santismo License](LICENSE).
