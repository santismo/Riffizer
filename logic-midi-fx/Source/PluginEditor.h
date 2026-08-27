#pragma once

#include "PluginProcessor.h"

class RiffizerMIDIFXAudioProcessorEditor final : public juce::AudioProcessorEditor {
public:
  explicit RiffizerMIDIFXAudioProcessorEditor(RiffizerMIDIFXAudioProcessor&);
  ~RiffizerMIDIFXAudioProcessorEditor() override = default;
  void resized() override;

private:
  void beginMidiDragFromPayload(const juce::var&);
  static std::optional<juce::WebBrowserComponent::Resource> webResource(const juce::String&);
  RiffizerMIDIFXAudioProcessor& ownerProcessor;
  std::unique_ptr<juce::WebBrowserComponent> browser;

  JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(RiffizerMIDIFXAudioProcessorEditor)
};
