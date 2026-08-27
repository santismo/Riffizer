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

class RiffizerMidiDragButton final : public juce::TextButton {
public:
  explicit RiffizerMidiDragButton(std::function<void()> onBeginDrag)
    : juce::TextButton("HOLD + DRAG MIDI  →  LOGIC"), beginDrag(std::move(onBeginDrag)) {
    setTooltip("Hold, then drag this MIDI into Logic's Tracks area");
    setColour(juce::TextButton::buttonColourId, juce::Colour::fromRGB(35, 96, 145));
    setColour(juce::TextButton::buttonOnColourId, juce::Colour::fromRGB(51, 135, 191));
    setColour(juce::TextButton::textColourOffId, juce::Colours::white);
  }

  void mouseDown(const juce::MouseEvent& event) override {
    dragStarted = false;
    juce::TextButton::mouseDown(event);
  }

  void mouseDrag(const juce::MouseEvent& event) override {
    if (dragStarted) return;
    if (event.getDistanceFromDragStart() >= 6) {
      dragStarted = true;
      beginDrag();
      return;
    }
    juce::TextButton::mouseDrag(event);
  }

private:
  std::function<void()> beginDrag;
  bool dragStarted = false;
};

RiffizerMIDIFXAudioProcessorEditor::RiffizerMIDIFXAudioProcessorEditor(RiffizerMIDIFXAudioProcessor& owner)
  : AudioProcessorEditor(&owner), ownerProcessor(owner) {
  const auto options = juce::WebBrowserComponent::Options{}
    .withNativeIntegrationEnabled()
    .withKeepPageLoadedWhenBrowserIsHidden()
    .withEventListener("riffizerIdea", [this](juce::var payload) { ownerProcessor.setGeneratedIdea(payload); })
    .withEventListener("riffizerDragSettings", [this](juce::var payload) { updateDragSettings(payload); })
    .withResourceProvider([](const juce::String& path) { return webResource(path); }, juce::WebBrowserComponent::getResourceProviderRoot());
  browser = std::make_unique<juce::WebBrowserComponent>(options);
  dragButton = std::make_unique<RiffizerMidiDragButton>([this] { beginMidiDrag(); });
  addAndMakeVisible(*browser);
  addAndMakeVisible(*dragButton);
  browser->goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
  setResizable(true, true);
  setSize(1180, 790);
}

RiffizerMIDIFXAudioProcessorEditor::~RiffizerMIDIFXAudioProcessorEditor() = default;

void RiffizerMIDIFXAudioProcessorEditor::resized() {
  auto area = getLocalBounds();
  dragButton->setBounds(area.removeFromBottom(46).reduced(8, 5));
  browser->setBounds(area);
}

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

void RiffizerMIDIFXAudioProcessorEditor::updateDragSettings(const juce::var& payload) {
  ownerProcessor.setGeneratedIdea(payload);
  dragOptions.multipleTracks = truthy(payload, "multipleTracks", true);
  dragOptions.stringChannels = truthy(payload, "stringChannels", false);
  dragOptions.invertedChannels = truthy(payload, "invertedChannels", false);
}

void RiffizerMIDIFXAudioProcessorEditor::beginMidiDrag() {
  const auto midiFile = ownerProcessor.createDragMidiFile(dragOptions);
  if (!midiFile.existsAsFile()) return;
  currentDragFile = midiFile;

  juce::StringArray files;
  files.add(currentDragFile.getFullPathName());
  // This call happens from the native button's mouse-drag gesture, so macOS
  // retains the event context needed to continue the drag into Logic.
  const auto started = juce::DragAndDropContainer::performExternalDragDropOfFiles(files, false, dragButton.get());
  if (!started) { currentDragFile.deleteFile(); currentDragFile = juce::File{}; }
}
