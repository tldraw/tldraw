---
title: MIDI sequencer
component: ./MidiSequencerExample.tsx
category: use-cases
priority: 5
keywords: [midi, sequencer, music, audio, web midi, timeline, playhead]
---

A canvas-based MIDI sequencer built from custom shapes and a tick-driven engine.

---

This example turns tldraw into a node-based MIDI sequencer. It ports the
event-bus engine from [kaneel/midiseq](https://github.com/kaneel/midiseq) to
TypeScript and drives it from the canvas.

There are two custom shapes:

- **Sequence** – a step / piano-roll pattern with its own MIDI channel, trig
  mode and a moving playhead along its timeline. Click cells to toggle notes.
- **Chain** – a lane that plays the sequences placed inside it one at a time,
  advancing to the next after a set number of loops. Drop sequence shapes inside
  a chain to add them; their left-to-right order is the chain order.

The engine mirrors kaneel's design: a central `EventBus`, a `Sequencer` that
emits `Tick` events at a tempo (PPQ 480), `Sequence` objects whose playhead is
advanced by those ticks, a `PlaybackManager` that schedules note-offs, and a
`Chain` that forwards notes and switches active sequences on loop wrap. Shape
props are the source of truth for configuration; the engine publishes transient
runtime state (playheads, active sequence) through reactive atoms so the shapes
re-render as the music plays.

Use the top panel to start the transport and pick a Web MIDI output, and the
Clock shape to set the tempo (BPM). Notes are sent out over Web MIDI only, so
you need a Chromium-based browser and an output port.

Because the whole song lives on the canvas (shapes and their props), "Save song"
exports a `.tldr` file and "Open song" loads one back — the same format
tldraw.com uses.

To play into GarageBand on macOS: open Audio MIDI Setup, show the MIDI Studio,
double-click the IAC Driver and tick "Device is online". The IAC Driver then
appears as an output here, and GarageBand receives it on its track input.
