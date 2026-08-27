cmake_minimum_required(VERSION 3.22)
project(RiffizerMIDIFX VERSION 0.1.0)

# Point JUCE_DIR at a checked-out JUCE 8+ source tree for an offline build.
# Otherwise CMake fetches the released JUCE source on the first configure.
if (NOT DEFINED JUCE_DIR)
  include(FetchContent)
  FetchContent_Declare(
    JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG 8.0.12
    GIT_SHALLOW TRUE
  )
  FetchContent_MakeAvailable(JUCE)
else()
  add_subdirectory(${JUCE_DIR} JUCE)
endif()

juce_add_plugin(RiffizerMIDIFX
  COMPANY_NAME "Riffizer"
  BUNDLE_ID "chatgpt.ojertrejo.riffizer-midifx"
  PLUGIN_MANUFACTURER_CODE Ojrt
  PLUGIN_CODE Rfmx
  FORMATS AU Standalone
  PRODUCT_NAME "Riffizer MIDI FX"
  IS_MIDI_EFFECT TRUE
  NEEDS_MIDI_INPUT FALSE
  NEEDS_MIDI_OUTPUT TRUE
  IS_SYNTH FALSE
  EDITOR_WANTS_KEYBOARD_FOCUS TRUE
  COPY_PLUGIN_AFTER_BUILD FALSE
)

# Run scripts/build-ui.sh before configuring CMake. The WebView UI is then
# embedded into the component, so it works without network access in Logic.
if (NOT EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/Resources/web/assets/main.js")
  message(FATAL_ERROR "Missing bundled web UI. Run logic-midi-fx/scripts/build-ui.sh first.")
endif()
file(GLOB_RECURSE RIFFIZER_WEB_UI CONFIGURE_DEPENDS Resources/web/*)
if (NOT RIFFIZER_WEB_UI)
  message(FATAL_ERROR "Missing bundled web UI. Run logic-midi-fx/scripts/build-ui.sh first.")
endif()
juce_add_binary_data(RiffizerWebUI SOURCES ${RIFFIZER_WEB_UI})

target_sources(RiffizerMIDIFX PRIVATE
  Source/PluginProcessor.cpp
  Source/PluginEditor.cpp
)

target_compile_definitions(RiffizerMIDIFX PRIVATE
  JUCE_WEB_BROWSER=1
  JUCE_USE_CURL=0
  JUCE_VST3_CAN_REPLACE_VST2=0
)

target_link_libraries(RiffizerMIDIFX PRIVATE
  RiffizerWebUI
  juce::juce_audio_utils
  juce::juce_gui_extra
  juce::juce_audio_plugin_client
  juce::juce_recommended_config_flags
  juce::juce_recommended_lto_flags
  juce::juce_recommended_warning_flags
)

juce_generate_juce_header(RiffizerMIDIFX)
