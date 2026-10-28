# Riffizer

Riffizer is a mobile-first guitar idea generator. It creates 4-, 8-, or 12-bar chord
charts and playable, original riff ideas guided by artist-inspired high-level
composition profiles.


## What it does

- Builds a chord chart, playable riff, coordinated bass line, and style-shaped
  drum part together, with optional chord-harmony playback and MIDI export.
- Creates a separate style-aware **Chord rhythm** lane: compact playable chord
  stabs whose rhythm is generated from the selected profile and scored against
  the riff's accents and gaps while the chart remains unchanged.
- Keeps the complex chord qualities intact while selecting from varied
  style-aware guitar grips with contiguous strings, four-fret-or-smaller spans,
  and no impossible interior string gaps.
- Locks bass attacks, chord stabs, drum accents, and the riff's strongest notes
  to a shared accent map while retaining profile-specific fills and motion.
- Auditions the arrangement with bundled, style-selected guitar and bass
  multisamples plus baked drum one-shots on both the Site and in the plug-in.
- Lets the fretboard switch between the riff, chord-rhythm voicings, and a
  four-string bass fingering view.
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
  Waxamilion, CHON, Marco Sfogli, Guthrie Govan, Greg Howe, Yngwie Malmsteen,
  and Matteo Mancuso (**Silk Current** in the interface).

Profiles use broad composition and playability tendencies only. They do not
contain transcriptions, tabs, sampled performances, or copied song material.

## Phrasing and harmony

Each profile has its own harmonic vocabulary, phrase contours, preferred rhythm
cells, articulation lengths, dynamics, approach-note probability, arpeggio
weighting, and density range. A section establishes a motif, answers it, develops
it, and lands it. Recalled gestures keep a common contour instead of restarting
with unrelated random scale steps in each bar.

| Profile inspiration | Harmonic emphasis | Phrase emphasis |
| --- | --- | --- |
| Nick Johnston | Suspensions, borrowed minor color, plagal returns | Spacious melodic arcs and sustained answers |
| Moray Pringle | Rock foundations, blues colors, dominant lift | Accented groove, repeated anchors, short replies |
| Owane | Major extensions, Lydian color, pedal motion | Displaced accents and angular arpeggio shapes |
| Waxamilion | Pedals, planed colors, asymmetric pivots | Clipped fragments, gaps, recurring pedal tones |
| CHON | Bright extended chords, common tones, plagal motion | Interlocking rhythms and arpeggiated contours |
| Marco Sfogli | Lyrical rock progressions and decisive cadences | Broad melodic arcs, long notes, clear arrivals |
| Guthrie Govan | Blues/fusion changes and backdoor resolutions | Elastic contours and short resolved chromatic approaches |
| Greg Howe | Dominant cycles, moving roots, extended tonics | Compact linear gestures and syncopated accents |
| Yngwie Malmsteen | Minor-key sequences, diminished links, V–i | Sequenced contours, pedal returns, harmonic-minor color |
| Silk Current / Matteo Mancuso | Major/minor ninths, ii–V and backdoor motion | Fluid single-note bursts, fourth-shaped contours, extended arpeggios, triplets |

Harmony and performance share one chord-quality parser, including major ninths,
minor sixths, 6/9, suspended seconds, and altered extensions. Lead targets follow
the actual harmony onset, including early and late changes. Short chromatic
approaches have a planned resolution; long endings land on the active chord.
Candidate scoring measures harmonic fit, phrase recall, density, space, dynamics,
and playability. Per-note bonuses are normalized, and texture limits are measured
per bar, so length or sheer note count does not dominate the choice.

Each profile now also shapes harmonic pacing, tension arcs, accent positions,
register, motif-return intervals, answer transformations, and preferred landing
tones. Expressive single-note gestures include target bends, same-string slides,
softened legato, muted attacks, and delayed vibrato. They follow the realized
fingering and harmonic targets instead of being scattered randomly over a phrase.
**About profile** explains these decisions; generated ideas show their articulation
summary.

These are hand-authored interpretations, not trained artist replicas. Sample
playback approximates these gestures through pitch envelopes, attack shaping,
and filtering. Reference links, interpretation limits, and technical details are
in [the profile design notes](docs/profile-design.md).

Design references include Matteo Mancuso's own descriptions of
[arpeggios, legato, and melodic storytelling](https://www.guitarworld.com/features/matteo-mancuso-talks-tone-technique-and-guthrie-govan)
and [fingerstyle fourths and triplet accents](https://www.guitarplayer.com/guitarists/matteo-mancuso-on-why-he-plays-fingerstyle-on-electric-and-how-he-got-steve-vai-to-work-with-him),
plus CHON's discussion of
[rhythmic displacement and layered harmony](https://www.earthquakerdevices.com/blog-posts/chon-koalas-are-just-super-baked-all-day).
The numeric weights and original contours are implementation choices, not
measurements of recordings.

## Interface

A restrained dark workspace groups composition settings, chord audition, playback
tracks, tempo, and fretboard navigation. All capabilities remain accessible on
mobile. **About profile** explains the selected style; **Playback & export**
contains usage details. The standalone website still exports five-track MIDI,
with independent lead/accompaniment channels and lead pitch gestures. It requests
a ±12-semitone bend range; instruments that ignore RPN messages need that range
set manually. Legato/mute markers convey intent, with timbre determined by the
receiving instrument. The Logic plug-in retains its existing native note/velocity
transport and drag export options; its shared WebView preview supports expression
when rebuilt.

### Sustained phrasing and coordinated changes

All pitched lanes now follow the same harmonic timeline, including early, late,
and split changes. Harmony rings until the next change; chord rhythm and bass
use whichever chord is actually sounding. Held lead notes favor structural chord
tones and common tones across changes, and release before incompatible harmony.
Chromatic bass pickups are brief and resolve to the next root within half a beat.

Each profile reserves a different amount of space for an answer or arrival:
lyrical profiles have broad sustained notes, fusion profiles connect short runs,
and pedal/rock profiles retain their clipped attacks between held endings.
Playback respects the generated durations without an extra gate, and MIDI uses
those same durations. Chord voicings favor nearby voices between changes.

The progression scorer rewards complete profile gestures and allows returning
hooks. Four-bar cadences preserve the opening half of the profile's progression
instead of replacing three bars with a generic turnaround. New sessions start
with internal modulation at 0%; the full modulation control remains available.
These are compositional rules and tuning choices, not measured artist models.

## Validation

`npm run test:engine` checks chord spellings in every key, all ten profiles across
4/8/12-bar forms, simple/complex and mixed-meter settings, playable fingerings,
phrase landings, non-overlapping lead notes, riff-only regeneration, legacy
completion, scoring regressions, distinct Silk Current behavior, profile
register/pacing differences, guitar gesture constraints, MIDI pitch isolation/reset ordering, and sample scheduling through a
silent mock. `npm test`
also runs the hosted build and rendered-page test. `npm run build:pages` verifies
the static mirror output.

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
generated guitar MIDI while the transport runs: **Riff**, **Harmony**, and
**Chord rhythm** select the live lane, while bass and drums stay out of the
instrument receiving the plug-in's transport output. The plug-in's own play
button still auditions every enabled lane through its bundled samples. The compact
black **Drag MIDI** control sits beside **Copy Chord Names** above the plug-in UI
and starts a file drag with no save dialog: **5 tracks** carries
named riff, chord-chart, chord-rhythm, bass, and General MIDI drum lanes;
**Single track** merges them while keeping drums on MIDI channel 10.
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

Bundled instrument multisamples come from
[tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments) under
CC BY 3.0. Full attribution is included in
[`public/samples/ATTRIBUTION.txt`](public/samples/ATTRIBUTION.txt).
