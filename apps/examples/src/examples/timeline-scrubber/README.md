---
title: Timeline scrubber
component: ./TimelineScrubberExample.tsx
category: use-cases
priority: 10
keywords: [timeline, history, undo, redo, time travel, scrubber]
---

A timeline scrubber that records document changes and allows time travel through editor history.

---

This example demonstrates how to create a timeline scrubber that records all document changes using `store.listen` and enables time travel through the editing history. Users can scrub backwards and forwards through time using a slider control at the bottom of the editor. If changes are made while scrubbed back in time, a new timeline branch is created from that point.
