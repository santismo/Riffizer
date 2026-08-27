#pragma once

#include <JuceHeader.h>
#include <atomic>
#include <memory>
#include <vector>

class RiffizerMIDIFXAudioProcessor final : public juce::AudioProcessor {
public:
  struct ExportOptions {
    bool multipleTracks = true;
    bool stringChannels = false;
    bool invertedChannels = false;
  };

  RiffizerMIDIFXAudioProcessor();
  ~RiffizerMIDIFXAudioProcessor() override = default;

  void prepareToPlay(double sampleRate, int maximumExpectedSamplesPerBlock) override;
  void releaseResources() override;
  bool isBusesLayoutSupported(const BusesLayout& layouts) const override;
  void processBlock(juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

  juce::AudioProcessorEditor* createEditor() override;
  bool hasEditor() const override { return true; }
  const juce::String getName() const override { return "Riffizer"; }
  bool acceptsMidi() const override { return false; }
  bool producesMidi() const override { return true; }
  bool isMidiEffect() const override { return true; }
  double getTailLengthSeconds() const override { return 0.0; }
  int getNumPrograms() override { return 1; }
  int getCurrentProgram() override { return 0; }
  void setCurrentProgram(int) override {}
  const juce::String getProgramName(int) override { return {}; }
  void changeProgramName(int, const juce::String&) override {}
  void getStateInformation(juce::MemoryBlock&) override;
  void setStateInformation(const void*, int) override;

  void setGeneratedIdea(const juce::var& payload);
  juce::File createDragMidiFile(const ExportOptions&) const;
  bool writeMidiFile(const juce::File&, const ExportOptions&) const;

private:
  enum class Lane { riff, harmony, chordRhythm };
  struct NoteEvent { double beat = 0.0, duration = .25; int midi = 60, guitarString = 0; float velocity = .8f; Lane lane = Lane::riff; };
  struct Sequence {
    std::vector<NoteEvent> notes;
    double loopBeats = 4.0, tempo = 120.0;
    juce::String artist, section;
    bool riffEnabled = true, harmonyEnabled = true, chordRhythmEnabled = false;
  };

  static int channelFor(const NoteEvent&, const ExportOptions&);
  static void appendLane(Sequence&, const juce::var&, Lane);
  static void addMidiTrack(juce::MidiFile&, const Sequence&, Lane, const juce::String&, const ExportOptions&);
  static void addMergedTrack(juce::MidiFile&, const Sequence&, const juce::String&, const ExportOptions&);
  std::shared_ptr<const Sequence> sequence;
  double currentSampleRate = 44100.0;

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RiffizerMIDIFXAudioProcessor)
};
