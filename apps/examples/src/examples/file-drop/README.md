---
title: File drop and parse
component: ./FileDropExample.tsx
category: data/assets
priority: 2
---

Drop a `.tldr` file onto the canvas and parse it using `parseTldrawJsonFile()`.

---

This example sets up a basic drag-and-drop area over the Tldraw editor. When a `.tldr` file is dropped, it’s parsed using `parseTldrawJsonFile()` from `@tldraw/tldraw`. You can log the result, or load it into the editor.

This is useful for custom importers, debuggers, or editors that support loading files by drag and drop.
