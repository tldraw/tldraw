---
title: Zoom into the tldraw SDK
component: ./ZoomIntoTheSdkExample.tsx
priority: 3
keywords: [semantic zoom, level of detail, lod, codebase, architecture, map, treemap, overview]
---

The SDK's own source at four levels of zoom, using the same semantic zoom component as the Moby Dick example.

---

One sentence describes the whole SDK. Zoom in and it becomes five areas, then twelve subsystems, then
fifty-odd modules — editor internals, default shapes, the store, signals, sync.

The point of this example is that it shares every line of its implementation with
"Zoom into Moby Dick". The technique lives in `src/semantic-zoom` and knows nothing about either novels
or codebases; both examples just hand it a tree.

This corpus is the smaller of the two, which is what makes the comparison useful. It has four levels
instead of six and no `loadDetail`, because unlike a novel there is no longer body of text waiting behind
each leaf — and that needs no special casing. A corpus without detail simply has two fewer levels. It
also has no cross-references, so the "echoes" control does not appear at all.

### The map is the repository

Every cell's area is proportional to the real line count of the source it stands for, measured across the
packages with tests excluded. That makes the layout say things a directory listing does not: the arrow
shape is larger than most of the geometry layer, the select tool is most of the tools directory, and the
single biggest thing in the repository is the translations.

Line counts are baked in rather than read at build time, so they drift as the code changes. They are a
rough sense of proportion, not a metric to trust to three digits.
