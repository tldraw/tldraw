# Spatial indexing raw notes

## Historical context

- RBush was attempted in April 2024 (PR #3439 by Mitja Bezenšek) but immediately reverted (PR #3481)
- Reverted because "There's issues with shapes that have computed bounds (arrows, groups)"
- The problem: arrows and groups have bounds that depend on other shapes, so updating only changed shapes in the index missed these computed bounds

## New implementation (January 2026, PR #7676)

- SpatialIndexManager: wraps RBush R-tree for O(log n) spatial queries
- RBushIndex: low-level wrapper around the rbush library (v4.0.1)
- Key insight: checks ALL shapes' bounds on each update, not just changed shapes
- Uses filterHistory pattern from store for incremental updates
- Per-page index that rebuilds on page change

## Architecture

**SpatialIndexManager** (`packages/editor/src/lib/editor/managers/SpatialIndexManager/SpatialIndexManager.ts`):
- `spatialIndexComputed`: computed value using filterHistory
- `buildFromScratch()`: bulk loads all shapes with bounds
- `processIncrementalUpdate()`: handles diff from filterHistory, then ALSO checks all remaining indexed shapes for bounds changes
- `getShapeIdsInsideBounds(bounds: Box)`: main query API
- `getShapeIdsAtPoint(point, margin?)`: convenience for point queries

**RBushIndex** (`RBushIndex.ts`):
- Wraps RBush with Map<TLShapeId, SpatialElement> for tracking
- `upsert()`, `remove()`, `bulkLoad()`, `search()`, `getBounds()`, `getAllShapeIds()`

## Tool integrations

1. **notVisibleShapes.ts**: Uses `getShapeIdsInsideBounds(viewportPageBounds)` instead of iterating all shapes
2. **Brushing.ts**: Early return if `getShapeIdsInsideBounds(brush)` returns empty set
3. **ScribbleBrushing.ts**: Similar early return optimization
4. **Erasing.ts**: Creates bounds around eraser line segment, early returns if no candidates
5. **Editor.ts**: `getShapeAtPoint()` and `getShapesAtPoint()` filter by spatial candidates first

## Key code pattern - handling computed bounds

```typescript
// After processing shapeDiff, check ALL remaining shapes in index
const allShapeIds = this.rbush.getAllShapeIds()
for (const shapeId of allShapeIds) {
  if (processedShapeIds.has(shapeId)) continue
  const currentBounds = this.editor.getShapePageBounds(shapeId)
  const indexedBounds = this.rbush.getBounds(shapeId)
  if (!this.areBoundsEqual(currentBounds, indexedBounds)) {
    // Update index - handles arrows, groups, custom shapes
  }
}
```

## API changes

- PR #7699 made SpatialIndexManager internal (@internal annotation)
- `editor.spatialIndex` removed from public API (now `_spatialIndex`)
- `editor.getShapeIdsInsideBounds()` marked as @internal
- Public API remains `editor.getShapeAtPoint()` and `editor.getShapesAtPoint()`

## Performance benefits

- O(log n) vs O(n) for spatial queries
- Early returns when no candidates in area
- Especially helpful for large canvases with many shapes
- Improves viewport culling, selection, erasing

## Commits

- 2643056df - Add SpatialIndexManager for R-tree spatial indexing (#7676)
- 59b6e8540 - refactor(editor): make SpatialIndexManager internal (#7699)
- 45dffd1af - RBush again? (#3439) - original attempt, April 2024
- 88ee4e999 - Revert "RBush again? (#3439)" (#3481) - reverted same day
