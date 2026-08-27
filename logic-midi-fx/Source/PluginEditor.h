#pragma once

#include "PluginProcessor.h"

class RiffizerMidiDragButton;

class RiffizerMIDIFXAudioProcessorEditor final : public juce::AudioProcessorEditor, private juce::Timer {
public:
  explicit RiffizerMIDIFXAudioProcessorEditor(RiffizerMIDIFXAudioProcessor&);
  ~RiffizerMIDIFXAudioProcessorEditor() override;
  void resized() override;

private:
  void updateDragSettings(const juce::var&);
  void beginMidiDrag();
  void timerCallback() override;
  static std::optional<juce::WebBrowserComponent::Resource> webResource(const juce::String&);
  RiffizerMIDIFXAudioProcessor& ownerProcessor;
  std::unique_ptr<juce::WebBrowserComponent> browser;
  std::unique_ptr<RiffizerMidiDragButton> dragButton;
  RiffizerMIDIFXAudioProcessor::ExportOptions dragOptions;
  juce::File currentDragFile;

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RiffizerMIDIFXAudioProcessorEditor)
};
