---
title: Snapping
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - snap
  - alignment
  - guides
  - SnapManager
  - precision
---

Snapping provides precision alignment assistance when moving, resizing, or connecting shapes. The system enables precise layout without manual measurement by automatically detecting alignment opportunities and adjusting positions to match key geometry on nearby shapes.

The editor provides three types of snapping: bounds snapping aligns edges, centers, and corners during movement and resizing; handle snapping connects endpoints to outlines and key points for precise attachments; and gap snapping maintains consistent spacing between multiple shapes. All snapping provides real-time visual feedback through colored snap lines that appear when shapes come within the snap threshold.

## SnapManager

The `SnapManager` coordinates all snapping behavior in the editor. It maintains two specialized snap systems and provides shared infrastructure for snap threshold calculation, visual indicators, and shape filtering.

The manager lives on the editor instance at `editor.snapping` and exposes:

- `shapeBounds` - A `BoundsSnaps` instance handling edge and center alignment
- `handles` - A `HandleSnaps` instance handling precise point connections
- `getSnapThreshold()` - Returns snap distance threshold adjusted for zoom level
- `getSnappableShapes()` - Identifies which shapes are eligible for snapping
- `setIndicators()` - Updates visual snap line indicators
- `clearIndicators()` - Removes all snap indicators

The snap threshold adjusts dynamically based on zoom level (8 pixels divided by zoom level), ensuring consistent snapping behavior regardless of viewport scale.

### Snappable shape filtering

The `SnapManager` determines which shapes participate in snapping through `getSnappableShapes()`. This method:

- Excludes currently selected shapes (you don't snap to what you're dragging)
- Includes only shapes within the viewport for performance
- Respects shape utility `canSnap()` method for opt-out behavior
- Includes frame shapes as snap targets
- Automatically recurses into groups, snapping to group children but not the group itself

The method returns a computed set that updates reactively as shapes move, selection changes, or the viewport pans.

## Bounds snapping

Bounds snapping aligns the bounding box edges and centers of shapes. When moving or resizing shapes, the `BoundsSnaps` system compares snap points on the selection bounds against snap points on nearby shapes.

### Snap points

Each shape defines snap points through its `ShapeUtil.getBoundsSnapGeometry()` method. By default, shapes provide their bounding box corners and center point. Custom shapes can override this to provide different snap points:

```typescript
class MyShapeUtil extends ShapeUtil<MyShape> {
	getBoundsSnapGeometry(shape: MyShape): BoundsSnapGeometry {
		return {
			points: [
				{ x: 0, y: 0 }, // custom snap points
				{ x: shape.props.w, y: 0 },
				{ x: shape.props.w / 2, y: shape.props.h / 2 },
			],
		}
	}
}
```

Return an empty array to disable snapping to a specific shape.

### Translation snapping

When moving shapes, `snapTranslateShapes()` compares the selection's snap points against other shapes and calculates the minimum offset needed to align in each axis independently:

```typescript
const snapData = editor.snapping.shapeBounds.snapTranslateShapes({
	lockedAxis: null, // or 'x' or 'y' to constrain
	initialSelectionPageBounds: bounds,
	initialSelectionSnapPoints: snapPoints,
	dragDelta: delta,
})

// Apply the nudge to achieve snapping
const finalPosition = Vec.Add(dragDelta, snapData.nudge)
```

The method finds the nearest snap points in both x and y directions. When multiple shapes align at the same distance, the system detects and displays all snaps. The returned `nudge` vector indicates how much to adjust the drag delta to achieve alignment.

### Resize snapping

When resizing shapes, `snapResizeShapes()` snaps the corners and edges being moved. The snap points used depend on which resize handle is being dragged:

- Corner handles snap both x and y axes using that corner
- Edge handles snap only the perpendicular axis using both corners on that edge
- When aspect ratio is locked, the dominant snap axis determines both axes

The method returns a nudge vector that's applied to the resize delta:

```typescript
const snapData = editor.snapping.shapeBounds.snapResizeShapes({
	initialSelectionPageBounds: bounds,
	dragDelta: delta,
	handle: 'bottom_right',
	isAspectRatioLocked: false,
	isResizingFromCenter: false,
})
```

### Gap snapping

Gap snapping maintains consistent spacing between shapes. The system detects gaps between adjacent shapes and provides three types of gap snapping:

**Gap center snapping** - Centers the selection within a gap larger than the selection, creating equal spacing on both sides.

**Gap duplication snapping** - Duplicates an existing gap on the opposite side of a shape. When two shapes have a 100px gap, dragging a third shape snaps to create another 100px gap.

**Adjacent gap detection** - When multiple shapes are evenly spaced, the system finds all adjacent gaps with matching lengths and displays them together, helping maintain consistent spacing across many shapes.

Gaps are calculated separately for horizontal and vertical directions. A gap exists when two shapes don't overlap in one axis but have overlapping ranges in the perpendicular axis (their "breadth intersection").

## Handle snapping

Handle snapping enables precise connections between shapes. When dragging a handle (like an arrow endpoint), the `HandleSnaps` system snaps to nearby geometry for accurate positioning.

### Handle snap geometry

Shapes define what handles can snap to through `ShapeUtil.getHandleSnapGeometry()`. This returns:

- `outline` - A `Geometry2d` describing the shape's outline (default: the shape's geometry)
- `points` - Key points on the shape to snap to with higher priority than outlines
- `getSelfSnapOutline()` - Optional method returning a stable outline for snapping to the shape itself
- `getSelfSnapPoints()` - Optional method returning stable points for self-snapping

```typescript
class MyShapeUtil extends ShapeUtil<MyShape> {
	getHandleSnapGeometry(shape: MyShape): HandleSnapGeometry {
		return {
			outline: this.getGeometry(shape),
			points: [
				{ x: 0, y: 0 },
				{ x: shape.props.w, y: shape.props.h },
			],
		}
	}
}
```

By default, handles cannot snap to their own shape because moving the handle changes the snap target, creating feedback loops. The `getSelfSnapOutline()` and `getSelfSnapPoints()` methods enable opt-in self-snapping when the snap geometry remains stable regardless of handle position.

### Snap types

Handles support two snap types controlled by the `snapType` property:

**Point snapping** (`snapType: 'point'`) - Snaps the handle to the single nearest location. The system checks snap points first, then falls back to the nearest point on any outline. This is a "magnetize to single best target" behavior.

**Align snapping** (`snapType: 'align'`) - Snaps the handle to align with nearby points on both x and y axes independently. This creates perpendicular snap lines showing alignment in each direction.

Point snapping takes priority over align snapping. Snap points have higher priority than outline snapping.

### Snapping handles

Tools call `snapHandle()` to snap a handle position:

```typescript
const snapData = editor.snapping.handles.snapHandle({
	currentShapeId: shape.id,
	handle: handleBeingDragged,
})

if (snapData) {
	// Apply nudge to handle position
	const snappedPosition = Vec.Add(handlePosition, snapData.nudge)
}
```

The method returns `null` if no snap is found within the threshold, or a `SnapData` object with the `nudge` vector needed to achieve snapping. Snap indicators are automatically set on the manager for visual feedback.

## Snap indicators

Snap indicators provide visual feedback when snapping occurs. The `SnapManager` maintains a reactive atom of current indicators that the UI renders.

Two types of indicators exist:

**Points indicators** (`type: 'points'`) - Display as lines connecting aligned points. When multiple snap points align on the same axis, they appear as a single continuous line spanning all aligned points.

**Gaps indicators** (`type: 'gaps'`) - Display spacing between shapes with perpendicular measurement lines at each gap. When multiple equal-sized gaps exist, all matching gaps display to show the consistent spacing pattern.

The manager automatically deduplicates gap indicators to avoid visual noise. When gap breadths overlap and one gap is larger than another, only the smaller gap displays because it provides more specific information.

The system clears indicators automatically when dragging stops or when `clearIndicators()` is called. The UI subscribes to indicator changes and renders them as SVG overlays on the canvas.

## Key files

- packages/editor/src/lib/editor/managers/SnapManager/SnapManager.ts - Main snap coordination and snappable shape filtering
- packages/editor/src/lib/editor/managers/SnapManager/BoundsSnaps.ts - Bounds, edge, and center snapping with gap detection
- packages/editor/src/lib/editor/managers/SnapManager/HandleSnaps.ts - Handle point and outline snapping

## Related

- [Selection system](./selection-system.md) - Selection interacts closely with snapping during transforms
