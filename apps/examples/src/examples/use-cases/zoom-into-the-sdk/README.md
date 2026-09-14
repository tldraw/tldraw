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
each leaf — and that needs no special casing. A corpus without detail simply has two fewer levels.
