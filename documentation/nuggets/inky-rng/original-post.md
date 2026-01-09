In tldraw, we give our geometric shapes a hand-drawn style through carefully designed imperfections. These precision tweaks and kinks add character to diagrams, loosen up wireframes, and look right next to shapes that are actually drawn by hand.

While the results look casual and creative, it took some real work to engineer the hand-drawn style. We needed a way to draw our geometric shapes that could incorporate imperfections. Our space for variety needed to be narrow enough that each geometric shape was easily recognizable, yet broad enough so that no two shapes looked exactly alike. And critically, each shape’s imperfections needed to be _stable_ for that shape as it resized or transformed on the canvas.

In this article, I’ll take you deeper into those problems and our solutions for each: first, how we draw our geometric shapes, then how we use randomness to achieve the hand-drawn look, and finally how we make that randomness stable.

- GIF
  ![m-squares-3.gif](attachment:60165b58-ea87-4265-be1a-531d6746b7bc:m-squares-3.gif)

### How to draw a geometric shape

Every shape in tldraw is represented by an object, called a record, that stores the shape’s information. This information includes a unique id, shape type, and the props object associated with that type.

While tldraw includes twelve geometric shapes, all twelve are actually described by the same record type, meaning they share the same props. One of those props (props.geo) is used as a subtype for the type of geometric shape: rectangle, ellipse, or any of the others.

When it comes time to render a shape, we build a “path” made up of points (normalized against the shape’s width and height props) and commands for drawing line segments between each point.

```tsx
		case 'rectangle':
			return new PathBuilder()
				.moveTo(0, 0)
				.lineTo(w, 0)
				.lineTo(w, h)
				.lineTo(0, h)
				.close()
```

![frame (23).svg](<attachment:6fa8e51d-c1f0-4118-ae35-8f77c6150e90:frame_(23).svg>)

We then use this path to generate SVG path data, which becomes the SVG shown for the shape on the canvas.

(We use this path in other places, too, such as rendering a shape’s indicator, as well as to determine the shape’s geometry, which the editor will use for intersections, hit tests, and bounding boxes.)

### Introducing randomness

To make this perfect path look hand drawn, we need to add random offsets to the points, then round off the corners

![frame (13).svg](<attachment:9f3c3691-3ea3-4c0a-9fe9-a7a5e0def914:frame_(13).svg>)

To offset the point, we first generate a random number between -1 and 1. We then multiply this number by the maximum offset and then add it to the point’s x coordinate. We repeat for the y coordinate, and then we repeat these step for all of points, giving each a tiny offset.

![frame (14).svg](<attachment:b5c8648b-5edf-46a7-98fb-76786eb43feb:frame_(14).svg>)

The second step is to round the corners. We replace the sharp corners with smooth arcs, but we don’t want these to make the shapes look flat or limp. To strike the balance between rounded and sharp, we draw a Bézier curve and pass in the original corner as a control point. This control point in effect “pulls in” the curve, making it tend towards the corner, while curving smoothly between start and end points near the corner. Here’s a comparison between zero rounding, our default rounding, and exaggerated rounding (which still tends towards the control point):

![offset vs no offset.svg](attachment:03ce9bde-dd7f-4a47-baab-75cb9322e65e:offset_vs_no_offset.svg)

![frame (22).svg](<attachment:2896a60a-d5c5-4119-90db-061ebe81d503:frame_(22).svg>)

The final step is to vary the width of the line strokes. To achieve this, we actually draw multiple times around the shape. Here’s the code:

```tsx
		for (let pass = 0; pass < passes; pass++) {
			const random = rng(randomSeed + pass)

			let lastMoveToOffset = { x: 0, y: 0 }
			let isSkippingCurrentLine = false
			for (const {
				command,
				...
			} of drawCommands) {
				const offset = command.isClose
					? lastMoveToOffset
					: { x: random() * offsetAmount, y: random() * offsetAmount }
```

We’ve set the path builder to do _two_ passes. So, we (randomly) generate 16 numbers for our hand-drawn rectangle: 4 `x` values, and 4 `y` values, twice.

The generator produces a different sequence of values per pass. As a result, the offsets are different in each pass - and therefore so is the path drawn in each pass. And this difference is the variation in stroke width. Here’s the visual difference of 1 vs 2 passes:

![1vs2passes-final.gif](attachment:70ca4940-0ad1-4610-8655-798de7ebbcc0:1vs2passes-final.gif)

### Solving consistent randomness

We want shapes to generate with a unique border, and for that border to be the same across renders and all forms of interaction (like resizing, rotating, and undo/redo). As above, the uniqueness of shapes in tldraw comes from randomly offsetting the end-points of line segments.

Without randomness, we get consistency - though this lacks the friendly imperfection we’re looking for:

![robot-wave.gif](attachment:bff17ad4-e15f-411c-bf2e-2d10403da10b:robot-wave.gif)

But if we generate different random numbers each time a shape is drawn or transformed, we get this really weird jitter:

![robot_new.gif](attachment:f87cd5b1-3106-40b0-9d53-8909ab3455bc:robot_new.gif)

This is the inconsistency we want to avoid. Instead, if the randomness is _stable_, then so are the imperfections, which are maintained while the shape is rotated, resized or moved around the canvas:

![robot-waving.gif](attachment:3f4ff481-5fe7-4755-9a7b-03432e9bf18d:robot-waving.gif)

The third one is the one we want. How did we get there?

Random numbers generated for the offsets need to be the same each time the shape is drawn. _True_ randomness is not consistent or reproducible - this causes the jitter effect since the random numbers are always different. Our solution is to use _deterministic_ randomness; random patterns which are predictable and therefore reproducible given an input seed.

Here’s an analogy: suppose you have a deck of cards and a specific shuffling technique. If you start with a fixed initial ordering and use the same sequence of shuffles, you'll always end up with the same arrangement. The ordering after the shuffle is a random one, but that randomness is reproducible.

We use a seeded pseudorandom number generator (PRNG) to generate the same random imperfections for a given shape each time it is drawn. With a PRNG, if you feed in the same seed, you’ll get the same set of values as an output.

In tldraw, each shape has a unique ID, so we use that as the input seed! This way, we ensure two things. One, that the random patterns are unique for each shape. And two, that we generate the same set of numbers for a given shape each time it’s drawn — that’s how the pattern gets tied to the shape and remains consistent across user interactions.

There’s an interesting thing you can do to play with this. We’ve added `alt-drag` in tldraw to make a clone of a shape. If you let go of `alt` during the drag, you keep the new shape but remove the old one. You can then re-press `alt` to bring back the old shape. What’s going on here? The old shape’s unique ID is stored, and that’s how you get back the same shape border (since the ID is used to create it). However, the new shape hasn’t been stored yet. So you can cycle through and see unique, temporary IDs being created in real-time.

![opt-drag-undo.gif](attachment:50195e74-96f4-4f41-9ebc-ca238dd32dc6:opt-drag-undo.gif)

### Closing The Loop

Three issues remain. One is smoothly handling path closure. We don't want a visible gap or overlap when the path returns to the start point. To achieve this, the close() command does two interesting things. First, it reuses the same random offset that was applied to the original move() command, ensuring that the first and final edges are shifted by identical amounts. Second, it calculates appropriate roundness for the closing corner and applies that same value to both close() and move(). This creates the same geometric constraints we applied to all other path segments. This way, all four corners appear consistent - and it’s not obvious which corner is the “closing” one.

![frame (2).svg](<attachment:c79e6653-ce26-4542-81ea-e869e08ae1a8:frame_(2).svg>)

We also need to be careful about the roundness of corners. The best corners are smooth corners, but the smoothness must be proportionate the shape itself: over-rounded and the shape looks like a blob, under-rounded and we lose the hand-drawn effect. However, smoothness must also be proportionate to the _other corners_, since sharper corners need more rounding than gentler ones.

![rounding-triangle-16-9.gif](attachment:4c7f055f-df3d-4f50-9dce-e7648be8a509:rounding-triangle-16-9.gif)

We handle this by modulating the roundness value according to the angle of the corner, with a sharp corner (90° or less) getting maximally rounded, an obtuse angle (closer to 180°) receiving the minimum roundness, and every angle in between receiving a roundness value in proportion to its sharpness. This ensures that sharper shapes remain friendly, particularly when resized.

```tsx
const roundnessClampedForAngle = modulate(
	Math.abs(Vec.AngleBetween(tangentToPrev, tangentToNext)),
	[Math.PI / 2, Math.PI],
	[roundness, 0],
	true
)
```

Finally, if a shape is resized and the width or height segments become very small, we don’t want the rounding to overlap or consume the entire segment. To prevent this, we clamp the rounding such that long segments aren’t affected but short segments get reduced rounding.

```tsx
const roundnessBeforeClampedForLength = Math.min(
	roundnessClampedForAngle,
	(currentInfo?.length ?? Infinity) / 4
)
const roundnessAfterClampedForLength = Math.min(
	roundnessClampedForAngle,
	(nextInfo?.length ?? Infinity) / 4
)
```

This way, the rounded corners don’t eat up the entire shape:

![roundness-clamping.gif](attachment:8f796865-f304-455b-8729-6fe07ac5ffe3:roundness-clamping.gif)

And that’s how we get unique, hand-drawn shapes! You can check out the source code for this feature [here](https://github.com/tldraw/tldraw/blob/main/packages/tldraw/src/lib/shapes/shared/PathBuilder.tsx).

![lots-of-shapes.gif](attachment:2f8534aa-512c-419b-979e-74a35cfb1354:lots-of-shapes.gif)
