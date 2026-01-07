---
title: Spectrogram frame
component: ./SpectrogramFrameExample.tsx
category: shapes/tools
keywords: [audio, spectrogram, synthesis, frame, sound, music]
priority: 5
---

Convert drawings into audio using spectrogram synthesis.

---

This example demonstrates a custom "spectrogram frame" shape that captures its visual contents and synthesizes audio from them. Draw shapes inside the frame, then click the play button to hear the result!

## How it works

The spectrogram frame interprets drawings as a spectrogram:

- **X-axis = time**: The playhead scrubs from left to right
- **Y-axis = frequency**: Top of the frame = high frequencies (20kHz), bottom = low frequencies (20Hz)
- **Colors = volume**: Red is loudest (1.0), green is medium (0.67), blue is quietest (0.33)
- **White = silence**: The white background produces no sound

## Controls

- **Play button (▶)**: Captures the frame contents and synthesizes audio
- **Stop button (■)**: Stops playback (shown while playing)
- **Playhead**: Red line that shows current playback position
- **Waveform**: Debug display showing the generated audio waveform (appears after first play)

## Audio parameters

- **Duration**: 5ms per pixel width (a 400px frame = 2 seconds)
- **Frequency range**: 20Hz to 20kHz (full human hearing range)
- **Synthesis**: Additive synthesis using sine wave oscillators

## Tips for interesting sounds

- Draw horizontal lines for sustained tones (higher = higher pitch)
- Draw vertical lines for percussive clicks
- Use red for loud sounds, green for medium, blue for quiet
- Draw in different colors for different volume levels
- Black produces the loudest sound (all channels at max)

## Technical details

The implementation uses the Web Audio API with additive synthesis. Each row of pixels in the captured image corresponds to a frequency bin (logarithmically mapped), and the RGB color values determine the amplitude:

- Red channel: 1.0 amplitude weight
- Green channel: 0.67 amplitude weight
- Blue channel: 0.33 amplitude weight
