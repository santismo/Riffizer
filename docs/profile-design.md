# Artist behavior and guitar expression

These profiles generate original ideas. They are hand-authored interpretations
of broad musical tendencies, not trained models, transcriptions, or measurements
of recordings. The sources below guide the design; the registers, probabilities,
rhythms, and pitch envelopes are implementation choices. Silent automated checks
establish correctness and differentiation, not a listening judgment of authenticity.

## Reference-to-rule mapping

| Inspiration | First-person or artist-authorized reference | Original implementation choice |
| --- | --- | --- |
| Nick Johnston | [Interview on melody, touch, and composition](https://www.musicradar.com/news/nick-johnston-talks-technique-gear-guthrie-and-gilbert) | Longer harmonic support, returning melodic answers, third/fifth arrivals, sustained bends and delayed vibrato. |
| Moray Pringle | [Artist/publisher Riff Playbooks collaboration](https://www.sheethappenspublishing.com/blogs/news/riff-playbooks-moray-pringle-riffs-from-good-times) | Repeated groove anchors, sequenced answers, middle-register lines and muted passing attacks. These are design hypotheses, not statistics extracted from the published riffs; no tab or note sequence is copied. |
| Owane | [Jack Gardiner on their collaborative work](https://www.guitarworld.com/news/jack-gardiner-owane-henrik-linder-utff) | Moving bright harmony, displaced returns and restrained slides. This source establishes collaboration/context, not a detailed account of Owane's compositional method; these rules extend Riffizer's existing jazz-prog interpretation and have lower evidential confidence. |
| Waxamilion | [Artist statement on Superbloom](https://holdtightpr.squarespace.com/news/2024/4/26/laid-back-jazz-prog-guitarist-waxamilion-shares-new-video-for-superbloom) and [interview on influences](https://www.mathrocktimes.com/single-post/waxamilion-vanish) | Repeating clipped cells over held harmony, asymmetric answers and stronger muted attacks. The melodic repetition and harmonic space follow the stated direction; the exact articulation mix is an original choice. |
| CHON | [Interview on rhythmic displacement and composition](https://www.earthquakerdevices.com/blog-posts/chon-koalas-are-just-super-baked-all-day) | Moving bright chords, recurring displaced accents, upper-register connected figures and few bends. |
| Marco Sfogli | [Interview on memorable melody](https://guitarmessenger.com/marco-sfogli-interview/) | Broad phrase arcs, returning hooks, space under the melody and stronger bend/vibrato emphasis on held arrivals. |
| Guthrie Govan | [His string-bending lesson](https://www.musicradar.com/tuition/guitars/guthrie-govans-string-bending-masterclass-part-1-628750) and [interview](https://guitarmessenger.com/guthrie-govan-interview/) | Contrasting answers, targeted thirds, controlled bends and mixed articulation. The engine uses semitone/whole-tone target bends; it does not reproduce his microtonal vocabulary. |
| Greg Howe | [Interview on technique and slide vibrato](https://zrockr.com/2014/10/20/guitars-gear-greg-howe/) | Active changes, compact sequenced answers, offbeat accents and a higher chance of connected legato/slide gestures. The periodic pitch modulation is an approximation, not a model of slide vibrato mechanics. |
| Yngwie Malmsteen | [Interview on linear arpeggios and violin influence](https://www.kclu.org/arts-culture/2013-05-10/yngwie-malmsteen-ive-always-been-a-little-bit-of-an-extremist) | Steady harmonic motion, minor-key sequences, strong root arrivals and broader vibrato following articulated runs. |
| Matteo Mancuso | [Interview on melodic writing, arpeggios, and fingerstyle](https://www.guitarworld.com/features/matteo-mancuso-talks-tone-technique-and-guthrie-govan) | Chord-led sequences, upper-register bursts, connected notes and restrained vibrato. Softened sample attacks approximate connection, not his fingerstyle sound. |

## Composition

`artist-behavior.ts` connects harmonic pacing, block-level tension targets,
phrase roles, motif-recall intervals, answer transformations, lead register,
accent positions, and landing preferences. Pacing can prolong tonic/color
harmony while preserving required dominant and passing links. Pre-chorus/solo sections
retain moving changes. Candidate scoring recognizes both the original and
prolonged gestures, so it does not reject a profile's intended pacing.

The existing chord-aware target planner still chooses stable held notes and
resolves chromatic approaches. Realized grips must keep their highest voice in
the profile's register; if a compact grip would move it out of range, a single
note preserves the melody. A profile describes preferences, not every possible
phrase an artist could write.

## Performance

Expression is assigned after fingering and before accompaniment generation:

- Bends target stable chord tones on the upper three strings, from a reachable
  fretted pitch one or two semitones below. Target notes remain in `notes`;
  `expression.fromMidi` describes the starting pitch.
- Slides and legato require nearby fretted notes on the same string with a small
  gap. Muted notes and bends cannot be the source of a connected gesture.
- Palm muting shortens selected lower attacks and softens their velocity; phrase
  endings are excluded. Preview also uses a low-pass filter and a shorter release.
- Vibrato starts after a stable held tone settles. Depth/rate vary by profile.
- Polyphonic lead events retain their ordinary articulation. The fretboard shows
  the target note positions; the expression summary identifies gestures.

Preview and website MIDI share the pitch-envelope function. Sample playback
automates cents of detuning; legato uses a softer envelope and skips part of the
sample attack. This is sample-based approximation, not physical guitar synthesis.
Existing saved ideas without expression continue to work. Riff regeneration
recreates expression while preserving the accompaniment, meter, and tempo.

## Website MIDI

Five tracks use channels 1 (lead), 2 (harmony), 3 (chord rhythm), 4 (bass), and
10 (drums), at 480 ticks per quarter note. Only the monophonic lead uses pitch
bend. RPN 0 requests a ±12-semitone range, then is deselected. Note-offs and
pitch resets precede a new gesture at the same tick; overlapping legacy lead
events omit pitch gestures to avoid bending an unrelated note.

[Microsoft's implementation documentation](https://microsoft.github.io/MIDI/kb/in-box-general-midi-synth/)
describes pitch-bend sensitivity and the supporting RPN/data-entry controllers.
Some instruments ignore the request; set their bend range to ±12 semitones
manually. Bend/slide/vibrato curves are actual MIDI pitch data. Legato and palm-mute
text markers communicate intent but do not select library-specific articulations.
The shorter durations and changed velocities are still exported.

The shared Logic WebView gets the generator and preview improvements when rebuilt.
Its existing native transport/drag export remains note/velocity MIDI and does not
yet serialize these pitch gestures. This website change does not install or alter
the user's Audio Unit or audio-device settings.

## Validation

The engine suite covers all ten profiles over a seeded corpus, register limits,
harmonic pacing, resolved targets, physically connected gestures, relative
articulation biases, pitch-envelope bounds, MIDI parsing and event ordering,
channel isolation, long UTF-8 track names, legacy overlap protection, and silent
mocked sample scheduling/cleanup. Existing harmonic, rhythmic, and regeneration
tests remain in place. No AudioContext connected to a real device is used in tests.
