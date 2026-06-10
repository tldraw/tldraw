# Why the eraser never skips a shape

When you scrub the eraser across the canvas in tldraw, every shape you cross gets erased. That sounds like the bare minimum for an eraser, but it's easy to build one that fails at it. The reason is that pointer input isn't continuous. The browser reports the pointer's position as a series of discrete samples, and when you move fast, those samples can land far apart. Flick your wrist and two consecutive pointer events might be a hundred pixels from each other, with three small shapes sitting untouched in the gap between them.

A naive eraser asks "what's under the pointer right now?" on every pointer event. At slow speeds that works fine. At high speeds it tunnels straight through anything that happens to fall between two samples, which is exactly when people use the eraser most aggressively: big, fast, careless swipes to clear a region. Game developers know this problem as tunneling, where a fast-moving bullet passes through a wall because no frame ever caught it inside the wall. An eraser is a bullet you drag around with your hand.

Here's how we solve it.

## Erase the line, not the point

The fix is to stop thinking of eraser input as a sequence of points and start thinking of it as a sequence of line segments. Each pointer event gives us a new position, and the editor remembers the previous one. Together they define a segment, and anything that segment touches gets erased. The samples may be sparse, but the segments between them are continuous: chain them together and you've covered the full path of the pointer, no matter how fast it moved.

The eraser tool is a state machine with three states: `idle`, `pointing`, and `erasing`. A quick click runs a single point test in the `pointing` state. The interesting work happens in the `erasing` state, which runs an `update` method on every pointer move:

```ts
const segmentToTest = [
	previousPagePoint,
	currentPagePoint
]
```

These two points are the segment we test. But testing every shape on the page against it would be wasteful, so we narrow the field first:

```ts
// the margin is in screen pixels, so convert it to page space
const margin = hitTestMargin / zoomLevel

const bounds = Box.FromPoints(segmentToTest).expandBy(margin)
const candidates = editor.getShapeIdsInsideBounds(bounds)
```

We wrap the segment in a bounding box, pad it by the hit test margin, and ask the editor's spatial index for the shapes inside. If there are none, we return early without testing a single shape.

Note the division by `zoomLevel`: the margin is defined in screen pixels, so when you're zoomed out we make it larger in page space. The eraser feels the same size on your screen no matter how far you've zoomed.

For each candidate, we transform the segment into the shape's local coordinate space:

```ts
const toLocalSpace = editor.getShapePageTransform(shape).clone().invert()
const [A, B] = segmentToTest.map((point) => toLocalSpace.applyToPoint(point))
```

Instead of teaching every hit test about rotated and scaled shapes, we move the two endpoints into the shape's own space, where the shape is axis-aligned and unscaled. A rotated rectangle is just a rectangle once you're standing inside its transform. After a quick bounding-box rejection, we hand the segment to the shape's geometry:

```ts
const geometry = editor.getShapeGeometry(shape)
if (geometry.hitTestLineSegment(A, B, margin)) {
	erasing.add(shape.id)
}
```

## One hit test, many geometries

That `geometry` object is where the second half of the story lives. Every shape in tldraw exposes its outline through the geometry system: a tree of `Geometry2d` primitives like `Rectangle2d`, `Circle2d`, `Polyline2d`, and `CubicBezier2d`. The same geometry powers selection, arrow binding, snapping, and hit testing across the editor, so the eraser doesn't need to know anything about what it's erasing. A freehand draw stroke and a perfect ellipse both answer the same question: does this segment come within the margin of you?

The hit test itself is just a distance check: measure how close the segment gets to the geometry, and compare that against the margin. The base implementation walks the geometry's outline:

```ts
distanceToLineSegment(A, B) {
	const { vertices } = this
	let distance = Infinity
	let nearest

	for (let i = 0; i < vertices.length; i++) {
		const vertex = vertices[i]

		// if the segment crosses an edge of the outline, that's a direct hit
		const next = vertices[(i + 1) % vertices.length]
		if (linesIntersect(A, B, vertex, next)) return 0

		// otherwise, track the nearest the segment gets to the outline
		const point = Vec.NearestPointOnLineSegment(A, B, vertex)
		if (Vec.Dist(vertex, point) < distance) {
			distance = Vec.Dist(vertex, point)
			nearest = point
		}
	}

	// being inside a filled shape counts, even without touching the outline
	if (this.isFilled && pointInPolygon(nearest, vertices)) return -distance

	return distance
}
```

If the segment crosses the outline anywhere, the distance is zero and the test passes. If nothing crosses, we fall back to the nearest distance between the segment and the outline, which is what makes the margin work: you can erase a thin line by passing close to it, not just by crossing it exactly.

The filled-shape check at the end holds one more subtlety. If the shape is filled and the nearest point sits inside it, the distance comes back negative. A negative distance always passes the hit test, so a segment drawn entirely inside a filled shape still erases it. For hollow shapes only the outline registers, which matches how clicking works elsewhere in the editor: you can't select a hollow rectangle by clicking its empty middle, and you can't erase it from there either.

Shapes with better math available override the vertex walk. A circle doesn't need to be approximated by vertices when there's a closed-form answer:

```ts
hitTestLineSegment(A, B, margin) {
	return intersectLineSegmentCircle(A, B, this.center, this.radius + margin) !== null
}
```

That's the quadratic formula doing eraser detection. Arcs do the circle intersection and then check that the hits land within the arc's angular range. Stadiums test their two arcs and two edges. Group geometries ask their children. Each primitive answers in whatever way is cheapest and most exact for its own shape.

## Sticky hits and committed deletes

One more behavior worth mentioning: hits accumulate. Each `update` starts from the set of shapes already marked for erasing and only ever adds to it. Shapes in the set render semi-transparent as feedback, the scribble trail follows your pointer, and nothing is actually deleted until you release. On pointer up we delete the whole set in one operation; pressing escape mid-drag bails back to a history mark and everything snaps back to full opacity. Erasing is a proposal until the moment you let go.

There's also some care taken around containers. When the eraser hits a shape that belongs to a group, we mark the outermost group rather than the individual shape: erasing follows the same boundaries as selection, so what you'd select by clicking is what you erase by scrubbing. And if you start erasing while your pointer is inside a frame or a group, that container goes on an exclusion list, so you can scrub away its children without obliterating the frame around them. Cross into a frame from outside, though, and the frame itself is fair game.

The erasing logic lives in [`packages/tldraw/src/lib/tools/EraserTool/childStates/Erasing.ts`](https://github.com/tldraw/tldraw/blob/main/packages/tldraw/src/lib/tools/EraserTool/childStates/Erasing.ts), and the segment hit testing in [`packages/editor/src/lib/primitives/geometry/Geometry2d.ts`](https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/primitives/geometry/Geometry2d.ts) and its subclasses. None of it is exotic: a spatial index for the broad phase and a distance-to-segment test for the exact one. But the decision to test segments instead of points is the difference between an eraser you can trust at speed and one that mysteriously leaves survivors behind. Users will never notice it working, and that's the point.
