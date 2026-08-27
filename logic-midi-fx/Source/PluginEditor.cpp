#include "PluginEditor.h"

namespace {
juce::String mimeFor(const juce::String& path) {
  if (path.endsWithIgnoreCase(".html")) return "text/html";
  if (path.endsWithIgnoreCase(".js")) return "text/javascript";
  if (path.endsWithIgnoreCase(".css")) return "text/css";
  if (path.endsWithIgnoreCase(".svg")) return "image/svg+xml";
  if (path.endsWithIgnoreCase(".png")) return "image/png";
  return "application/octet-stream";
}

bool truthy(const juce::var& payload, const juce::Identifier& name, bool fallback) {
  if (const auto* object = payload.getDynamicObject()) return object->hasProperty(name) ? static_cast<bool>(object->getProperty(name)) : fallback;
  return fallback;
}
}

RiffizerMIDIFXAudioProcessorEditor::RiffizerMIDIFXAudioProcessorEditor(RiffizerMIDIFXAudioProcessor& owner)
  : AudioProcessorEditor(&owner), ownerProcessor(owner) {
  const auto options = juce::WebBrowserComponent::Options{}
    .withNativeIntegrationEnabled()
    .withKeepPageLoadedWhenBrowserIsHidden()
    .withEventListener("riffizerIdea", [this](juce::var payload) { ownerProcessor.setGeneratedIdea(payload); })
    .withEventListener("riffizerExport", [this](juce::var payload) { exportFromPayload(payload); })
    .withResourceProvider([](const juce::String& path) { return webResource(path); }, juce::WebBrowserComponent::getResourceProviderRoot());
  browser = std::make_unique<juce::WebBrowserComponent>(options);
  addAndMakeVisible(*browser);
  browser->goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
  setResizable(true, true);
  setSize(1180, 790);
}

void RiffizerMIDIFXAudioProcessorEditor::resized() { browser->setBounds(getLocalBounds()); }

std::optional<juce::WebBrowserComponent::Resource> RiffizerMIDIFXAudioProcessorEditor::webResource(const juce::String& requestedPath) {
  const auto file = requestedPath == "/" || requestedPath.isEmpty() ? "index.html" : requestedPath.fromLastOccurrenceOf("/", false, false);
  int size = 0;
  if (const auto* data = BinaryData::getNamedResource(file.toRawUTF8(), size)) {
    std::vector<std::byte> bytes(static_cast<size_t>(size));
    std::memcpy(bytes.data(), data, static_cast<size_t>(size));
    return juce::WebBrowserComponent::Resource{ std::move(bytes), mimeFor(file) };
  }
  return std::nullopt;
}

void RiffizerMIDIFXAudioProcessorEditor::exportFromPayload(const juce::var& payload) {
  ownerProcessor.setGeneratedIdea(payload);
  RiffizerMIDIFXAudioProcessor::ExportOptions options;
  options.multipleTracks = truthy(payload, "multipleTracks", true);
  options.stringChannels = truthy(payload, "stringChannels", false);
  options.invertedChannels = truthy(payload, "invertedChannels", false);
  chooser = std::make_unique<juce::FileChooser>("Export Riffizer MIDI", juce::File::getSpecialLocation(juce::File::userDocumentsDirectory).getChildFile("riffizer.mid"), "*.mid");
  chooser->launchAsync(juce::FileBrowserComponent::saveMode | juce::FileBrowserComponent::canSelectFiles, [this, options](const juce::FileChooser& dialog) {
    const auto target = dialog.getResult();
    if (target != juce::File{}) ownerProcessor.writeMidiFile(target.withFileExtension("mid"), options);
    chooser.reset();
  });
}
