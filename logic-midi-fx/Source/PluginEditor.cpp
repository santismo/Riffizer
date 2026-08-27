#include "PluginEditor.h"

namespace {
juce::String mimeFor(const juce::String& path) {
  if (path.endsWithIgnoreCase(".html")) return "text/html";
  if (path.endsWithIgnoreCase(".js")) return "text/javascript";
  if (path.endsWithIgnoreCase(".css")) return "text/css";
  if (path.endsWithIgnoreCase(".svg")) return "image/svg+xml";
  if (path.endsWithIgnoreCase(".png")) return "image/png";
  if (path.endsWithIgnoreCase(".mp3")) return "audio/mpeg";
  if (path.endsWithIgnoreCase(".wav")) return "audio/wav";
  if (path.endsWithIgnoreCase(".txt")) return "text/plain";
  return "application/octet-stream";
}

bool truthy(const juce::var& payload, const juce::Identifier& name, bool fallback) {
  if (const auto* object = payload.getDynamicObject()) return object->hasProperty(name) ? static_cast<bool>(object->getProperty(name)) : fallback;
  return fallback;
}
}

class RiffizerBlackButton : public juce::TextButton {
public:
  explicit RiffizerBlackButton(const juce::String& label) : juce::TextButton(label) {}

  void paintButton(juce::Graphics& graphics, bool highlighted, bool down) override {
    const auto background = down ? juce::Colour(0xff242424) : highlighted ? juce::Colour(0xff191919) : juce::Colour(0xff050505);
    graphics.setColour(background);
    graphics.fillRoundedRectangle(getLocalBounds().toFloat(), 5.0f);
    graphics.setColour(highlighted ? juce::Colour(0xff6b6b68) : juce::Colour(0xff353533));
    graphics.drawRoundedRectangle(getLocalBounds().toFloat().reduced(0.5f), 5.0f, 1.0f);
    graphics.setColour(juce::Colour(0xfff1f1ec));
    graphics.setFont(juce::FontOptions(12.0f, juce::Font::bold));
    graphics.drawFittedText(getButtonText(), getLocalBounds().reduced(8, 0), juce::Justification::centred, 1);
  }
};

class RiffizerMidiDragButton final : public RiffizerBlackButton {
public:
  explicit RiffizerMidiDragButton(std::function<void()> onBeginDrag)
    : RiffizerBlackButton("DRAG MIDI"), beginDrag(std::move(onBeginDrag)) {
    setTooltip("Hold, then drag this MIDI into Logic's Tracks area");
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
    .withEventListener("riffizerClearIdea", [this](juce::var) { ownerProcessor.clearGeneratedIdea(); })
    .withEventListener("riffizerRestoreReady", [this](juce::var) {
      const auto payload = ownerProcessor.generatedPayload();
      if (!payload.isVoid() && browser != nullptr) browser->emitEventIfBrowserIsVisible("riffizerRestoreIdea", payload);
    })
    .withEventListener("riffizerDragSettings", [this](juce::var payload) { updateDragSettings(payload); })
    .withResourceProvider([](const juce::String& path) { return webResource(path); }, juce::WebBrowserComponent::getResourceProviderRoot());
  browser = std::make_unique<juce::WebBrowserComponent>(options);
  dragButton = std::make_unique<RiffizerMidiDragButton>([this] { beginMidiDrag(); });
  copyButton = std::make_unique<RiffizerBlackButton>("COPY CHORD NAMES");
  copyButton->setTooltip("Copy the generated chord names as comma-separated text");
  copyButton->onClick = [this] {
    const auto names = ownerProcessor.chordNames();
    if (names.isNotEmpty()) juce::SystemClipboard::copyTextToClipboard(names);
  };
  addAndMakeVisible(*browser);
  addAndMakeVisible(*copyButton);
  addAndMakeVisible(*dragButton);
  browser->goToURL(juce::WebBrowserComponent::getResourceProviderRoot());
  startTimerHz(4);
  setResizable(true, true);
  setSize(1180, 790);
}

RiffizerMIDIFXAudioProcessorEditor::~RiffizerMIDIFXAudioProcessorEditor() = default;

void RiffizerMIDIFXAudioProcessorEditor::resized() {
  auto area = getLocalBounds();
  auto controls = area.removeFromTop(42).reduced(8, 5);
  dragButton->setBounds(controls.removeFromRight(96));
  controls.removeFromRight(6);
  copyButton->setBounds(controls.removeFromRight(154));
  browser->setBounds(area);
}

void RiffizerMIDIFXAudioProcessorEditor::timerCallback() {
  const auto tempo = ownerProcessor.projectTempo();
  if (tempo <= 1.0) return;
  browser->emitEventIfBrowserIsVisible("riffizerHostTempo", tempo);
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
