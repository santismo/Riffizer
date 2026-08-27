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
    .withEventListener("riffizerExport", [this](juce::var payload) { beginMidiDragFromPayload(payload); })
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
  // juce_add_binary_data converts punctuation in resource names to underscores:
  // `assets/main.js` becomes BinaryData's `main_js`, for example.
  auto binaryResourceName = file.replaceCharacter('.', '_').replaceCharacter('-', '_');
  int size = 0;
  if (const auto* data = BinaryData::getNamedResource(binaryResourceName.toRawUTF8(), size)) {
    std::vector<std::byte> bytes(static_cast<size_t>(size));
    std::memcpy(bytes.data(), data, static_cast<size_t>(size));
    return juce::WebBrowserComponent::Resource{ std::move(bytes), mimeFor(file) };
  }
  return std::nullopt;
}

void RiffizerMIDIFXAudioProcessorEditor::beginMidiDragFromPayload(const juce::var& payload) {
  ownerProcessor.setGeneratedIdea(payload);
  RiffizerMIDIFXAudioProcessor::ExportOptions options;
  options.multipleTracks = truthy(payload, "multipleTracks", true);
  options.stringChannels = truthy(payload, "stringChannels", false);
  options.invertedChannels = truthy(payload, "invertedChannels", false);
  const auto midiFile = ownerProcessor.createDragMidiFile(options);
  if (!midiFile.existsAsFile()) return;

  juce::StringArray files;
  files.add(midiFile.getFullPathName());
  // Keep the temporary file available after the drop: Logic can finish reading
  // a file URL just after its drag operation completes.
  const auto started = juce::DragAndDropContainer::performExternalDragDropOfFiles(files, false, this);
  if (!started) midiFile.deleteFile();
}
