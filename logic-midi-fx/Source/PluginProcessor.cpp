#include "PluginProcessor.h"
#include "PluginEditor.h"

namespace {
const juce::var* child(const juce::var& value, const juce::Identifier& key) {
  if (const auto* object = value.getDynamicObject()) return &object->getProperty(key);
  return nullptr;
}

double number(const juce::var& value, double fallback = 0.0) {
  return value.isDouble() || value.isInt() || value.isInt64() ? static_cast<double>(value) : fallback;
}

bool enabled(const juce::var& value, const juce::Identifier& key, bool fallback) {
  if (const auto* object = value.getDynamicObject()) return object->hasProperty(key) ? static_cast<bool>(object->getProperty(key)) : fallback;
  return fallback;
}
}

RiffizerMIDIFXAudioProcessor::RiffizerMIDIFXAudioProcessor()
  : juce::AudioProcessor(BusesProperties()) {
  const std::shared_ptr<const Sequence> initial = std::make_shared<Sequence>();
  std::atomic_store(&sequence, initial);
}

void RiffizerMIDIFXAudioProcessor::prepareToPlay(double sampleRate, int) { currentSampleRate = sampleRate; }
void RiffizerMIDIFXAudioProcessor::releaseResources() {}
bool RiffizerMIDIFXAudioProcessor::isBusesLayoutSupported(const BusesLayout& layouts) const { return layouts == BusesLayout{}; }

void RiffizerMIDIFXAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midi) {
  buffer.clear();
  midi.clear();
  const auto current = std::atomic_load(&sequence);
  if (!current || current->notes.empty() || current->loopBeats <= 0.0 || currentSampleRate <= 0.0) return;

  double startBeat = 0.0;
  if (auto* playHead = getPlayHead()) {
    if (const auto position = playHead->getPosition()) {
      if (const auto ppq = position->getPpqPosition()) startBeat = *ppq;
    }
  }
  const auto tempo = current->tempo > 1.0 ? current->tempo : 120.0;
  const auto beatLength = static_cast<double>(buffer.getNumSamples()) * tempo / (60.0 * currentSampleRate);
  const auto endBeat = startBeat + beatLength;
  const auto firstLoop = static_cast<int>(std::floor(startBeat / current->loopBeats)) - 1;
  const auto lastLoop = static_cast<int>(std::floor(endBeat / current->loopBeats)) + 1;

  const ExportOptions routed { true, false, false };
  for (int loop = firstLoop; loop <= lastLoop; ++loop) {
    const auto loopStart = static_cast<double>(loop) * current->loopBeats;
    for (const auto& event : current->notes) {
      const auto sendsLane = event.lane == Lane::riff ? current->riffEnabled
        : event.lane == Lane::harmony ? current->harmonyEnabled && !current->chordRhythmEnabled
        : current->harmonyEnabled && current->chordRhythmEnabled;
      if (!sendsLane) continue;
      const auto noteOn = loopStart + event.beat;
      const auto noteOff = noteOn + event.duration;
      const auto sampleAt = [&] (double beat) { return juce::jlimit(0, buffer.getNumSamples() - 1, juce::roundToInt((beat - startBeat) * 60.0 * currentSampleRate / tempo)); };
      const auto channel = channelFor(event, routed);
      if (noteOn >= startBeat && noteOn < endBeat) midi.addEvent(juce::MidiMessage::noteOn(channel, event.midi, event.velocity), sampleAt(noteOn));
      if (noteOff >= startBeat && noteOff < endBeat) midi.addEvent(juce::MidiMessage::noteOff(channel, event.midi), sampleAt(noteOff));
    }
  }
}

juce::AudioProcessorEditor* RiffizerMIDIFXAudioProcessor::createEditor() { return new RiffizerMIDIFXAudioProcessorEditor(*this); }

void RiffizerMIDIFXAudioProcessor::appendLane(Sequence& result, const juce::var& lane, Lane laneType) {
  const auto* events = lane.getArray();
  if (events == nullptr) return;
  for (const auto& event : *events) {
    const auto* notes = child(event, "notes");
    const auto* noteArray = notes == nullptr ? nullptr : notes->getArray();
    if (noteArray == nullptr) continue;
    const auto beat = child(event, "time") == nullptr ? 0.0 : number(*child(event, "time"));
    const auto duration = child(event, "duration") == nullptr ? .25 : juce::jmax(.03, number(*child(event, "duration"), .25));
    const auto velocity = child(event, "velocity") == nullptr ? .8f : static_cast<float>(number(*child(event, "velocity"), .8));
    for (const auto& note : *noteArray) {
      const auto* midi = child(note, "midi");
      if (midi == nullptr) continue;
      const auto* guitarString = child(note, "string");
      result.notes.push_back({ beat, duration, juce::jlimit(0, 127, juce::roundToInt(number(*midi))), guitarString == nullptr ? 0 : juce::jlimit(0, 5, juce::roundToInt(number(*guitarString))), juce::jlimit(0.01f, 1.0f, velocity), laneType });
    }
  }
}

void RiffizerMIDIFXAudioProcessor::setGeneratedIdea(const juce::var& payload) {
  const auto* part = child(payload, "part");
  const auto* idea = part == nullptr ? nullptr : child(*part, "idea");
  if (idea == nullptr) return;
  auto next = std::make_shared<Sequence>();
  if (const auto* tempo = child(*idea, "tempo")) next->tempo = number(*tempo, 120.0);
  if (const auto* artist = child(*part, "artist")) next->artist = artist->toString();
  if (const auto* section = child(*part, "section")) next->section = section->toString();
  if (const auto* meterMap = child(*idea, "meterMap")) if (const auto* total = child(*meterMap, "totalBeats")) next->loopBeats = juce::jmax(1.0, number(*total, 4.0));
  if (const auto* settings = child(payload, "settings")) {
    next->riffEnabled = enabled(*settings, "riffEnabled", true);
    next->harmonyEnabled = enabled(*settings, "harmonyEnabled", true);
    next->chordRhythmEnabled = enabled(*settings, "chordRhythmEnabled", false);
  }
  if (const auto* lane = child(*idea, "riff")) appendLane(*next, *lane, Lane::riff);
  if (const auto* lane = child(*idea, "harmony")) appendLane(*next, *lane, Lane::harmony);
  if (const auto* lane = child(*idea, "chordRhythm")) appendLane(*next, *lane, Lane::chordRhythm);
  const std::shared_ptr<const Sequence> frozen = std::move(next);
  std::atomic_store(&sequence, frozen);
}

int RiffizerMIDIFXAudioProcessor::channelFor(const NoteEvent& event, const ExportOptions& options) {
  if (!options.stringChannels) return 1;
  return options.invertedChannels ? 6 - event.guitarString : event.guitarString + 1;
}

void RiffizerMIDIFXAudioProcessor::addMidiTrack(juce::MidiFile& file, const Sequence& data, Lane lane, const juce::String& name, const ExportOptions& options) {
  juce::MidiMessageSequence track;
  track.addEvent(juce::MidiMessage::textMetaEvent(3, name), 0.0);
  track.addEvent(juce::MidiMessage::tempoMetaEvent(juce::roundToInt(60000000.0 / data.tempo)), 0.0);
  for (const auto& event : data.notes) if (event.lane == lane) {
    const auto channel = channelFor(event, options);
    track.addEvent(juce::MidiMessage::noteOn(channel, event.midi, event.velocity), event.beat);
    track.addEvent(juce::MidiMessage::noteOff(channel, event.midi), event.beat + event.duration);
  }
  track.updateMatchedPairs();
  file.addTrack(track);
}

void RiffizerMIDIFXAudioProcessor::addMergedTrack(juce::MidiFile& file, const Sequence& data, const juce::String& name, const ExportOptions& options) {
  juce::MidiMessageSequence track;
  track.addEvent(juce::MidiMessage::textMetaEvent(3, name), 0.0);
  track.addEvent(juce::MidiMessage::tempoMetaEvent(juce::roundToInt(60000000.0 / data.tempo)), 0.0);
  for (const auto& event : data.notes) {
    const auto channel = channelFor(event, options);
    track.addEvent(juce::MidiMessage::noteOn(channel, event.midi, event.velocity), event.beat);
    track.addEvent(juce::MidiMessage::noteOff(channel, event.midi), event.beat + event.duration);
  }
  track.updateMatchedPairs();
  file.addTrack(track);
}

bool RiffizerMIDIFXAudioProcessor::writeMidiFile(const juce::File& destination, const ExportOptions& options) const {
  const auto data = std::atomic_load(&sequence);
  if (!data || data->notes.empty()) return false;
  juce::MidiFile file;
  file.setTicksPerQuarterNote(960);
  const auto prefix = data->section.isNotEmpty() ? data->section : "Riffizer";
  if (options.multipleTracks) {
    addMidiTrack(file, *data, Lane::riff, prefix + " · " + data->artist + " riff", options);
    addMidiTrack(file, *data, Lane::harmony, prefix + " · chord chart", options);
    addMidiTrack(file, *data, Lane::chordRhythm, prefix + " · " + data->artist + " chord rhythm", options);
  } else addMergedTrack(file, *data, prefix + " · Riffizer", options);
  if (auto output = std::unique_ptr<juce::FileOutputStream>(destination.createOutputStream())) return file.writeTo(*output);
  return false;
}

juce::File RiffizerMIDIFXAudioProcessor::createDragMidiFile(const ExportOptions& options) const {
  const auto data = std::atomic_load(&sequence);
  if (!data || data->notes.empty()) return {};

  const auto artist = data->artist.isNotEmpty() ? data->artist : "style";
  const auto section = data->section.isNotEmpty() ? data->section : "idea";
  const auto layout = options.multipleTracks ? "multitrack" : "single-track";
  const auto stem = juce::File::createLegalFileName("Riffizer " + artist + " " + section + " " + layout);
  const auto destination = juce::File::getSpecialLocation(juce::File::tempDirectory)
    .getNonexistentChildFile(stem, ".mid", false);
  return writeMidiFile(destination, options) ? destination : juce::File{};
}

void RiffizerMIDIFXAudioProcessor::getStateInformation(juce::MemoryBlock& state) {
  const auto current = std::atomic_load(&sequence);
  juce::ValueTree tree("RiffizerMIDIFX");
  if (current != nullptr) { tree.setProperty("tempo", current->tempo, nullptr); tree.setProperty("loopBeats", current->loopBeats, nullptr); tree.setProperty("artist", current->artist, nullptr); tree.setProperty("section", current->section, nullptr); }
  copyXmlToBinary(*tree.createXml(), state);
}

void RiffizerMIDIFXAudioProcessor::setStateInformation(const void* data, int size) {
  if (const auto xml = getXmlFromBinary(data, size)) {
    const juce::ValueTree tree = juce::ValueTree::fromXml(*xml);
    auto restored = std::make_shared<Sequence>();
    restored->tempo = static_cast<double>(tree.getProperty("tempo", 120.0)); restored->loopBeats = static_cast<double>(tree.getProperty("loopBeats", 4.0)); restored->artist = tree.getProperty("artist").toString(); restored->section = tree.getProperty("section").toString();
    const std::shared_ptr<const Sequence> frozen = std::move(restored);
    std::atomic_store(&sequence, frozen);
  }
}

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() { return new RiffizerMIDIFXAudioProcessor(); }
