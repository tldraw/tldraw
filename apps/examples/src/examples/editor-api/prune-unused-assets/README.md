---
title: Prune unused assets
component: ./PruneUnusedAssetsExample.tsx
priority: 6
keywords: [assets, images, prune, cleanup, document size, orphaned, garbage collection, storage]
---

Reclaim document space by removing image, video, and bookmark assets that no shape references.

---

Deleting an image, video, or bookmark shape does not delete its asset record. With the default asset store, image data is stored inline as a base64 data URL, so orphaned assets keep inflating the document's size long after their shapes are gone.

This example shows the live document size, the number of asset records, and how many of them are orphaned. Add a few images, delete their shapes, and watch the orphan count and document size stay high — then prune to reclaim the space.

`editor.getUnusedAssetIds()` returns the asset ids that no shape on any page references. `editor.pruneUnusedAssets()` deletes those assets and returns the ids it removed; with an external asset store it also calls the store's `remove()` so the underlying files are deleted.

Asset deletion is not tracked by the undo history, so pruning is not undoable. Prune at a point where a removed asset cannot be brought back by undo — most naturally right after loading a document (when there is no history) or before persisting a snapshot. This example prunes on mount for exactly that reason.
