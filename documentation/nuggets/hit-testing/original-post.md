---
title: Hit Testing - Original Blog Post Draft
created_at: 12/21/2025
updated_at: 01/07/2026
keywords:
  - hit testing
  - geometry
  - selection
  - hollow shapes
readability: 6
voice: 5
potential: 7
accuracy: 8
notes: "Raw blog draft with good v1→v2 narrative and genuine insights about distance-based hit testing. Needs cleanup: contains unfinished 'junkyard' section, placeholder references ([ EXAMPLE ]), bullet points with bolded headers (AI tell), and mixed voice. The hollow shape/arrow binding problems are interesting. Code accuracy is good."
---

Check out these circles. Are they under the cursor(s)?

[ RAINBOW CURSORS EXAMPLE ]

…and if so, how would we know?

This particular problem is called hit-testing, and it appears when building an app with any form of GUI. In a canvas application like tldraw, getting hit-testing right is important: it determines the precision and quality of response to user interactions, as well as the app's performance under the hood. For example, shape selection and arrow binding are key parts of the user experience on the canvas—and these are dependent on a functional hit-testing system.

Fortunately, the browser’s in-built hit-testing infrastructure makes it possible to offload some of this work. However, since there are many possible configuration of shapes and bindings, the challenge is to identify and account for cases where interactions do not work as expected.

This is why tldraw’s hit-testing mechanism has had to evolve over time. We’ll explore that journey in this post.

## **Hit-detection in the browser**

For an application on the web, hit-testing is the process of figuring out which element on a page is under the pointer. A pointer is a point of contact made on the screen with an input device, like a stylus, or mouse input. Pointer events can capture precise changes including the tilt, twist and pressure of the input signal.

Browsers render web pages in a series of steps. Initially, the browser parses the HTML file and adds its elements to the DOM. It does the same thing for the styles by parsing CSS files. Nodes that will actually be visible on the page get added to a render tree. The browser then computes the geometry and layout for rendered elements. The final stages are painting and composition, where each node in the render tree is converted into pixels on the screen, with the correct dimensions and ordering.

Pointer events target the topmost element under the cursor by working backwards through the rendering layers and figuring out which element is highest in the stacking order. For regular HTML elements like divs, buttons and links, the browser hit-tests against the entire border box, so the whole visual area responds to clicks. Though there are ways of going around this. For example, clipped regions don’t register pointer events. Below is an example…

[ CLIPPING EXAMPLE ]

- e.g.
  ![dog-ear.gif](attachment:0a267324-c226-44b6-aab8-3afe8e9dfaf8:dog-ear.gif)

## **Old**

In tldraw, objects on the canvas are elements in the DOM. This makes it possible to use the browser to hit-test canvas objects. In fact, in the first version of tldraw, hit-testing happened almost entirely through DOM-based pointer events.

In tldraw v1, shapes were simple data objects:

```tsx
export interface RectangleShape extends TDBaseShape {
	type: TDShapeType.Rectangle
	size: number[]
	label?: string
	labelPoint?: number[]
}
```

Which allowed for direct React → DOM rendering of geometric shapes:

```tsx
export const BoxComponent = TLShapeUtil.Component<BoxShape, SVGSVGElement>(
  ({ shape, events, isGhost, meta }, ref) => {
    return (
      <SVGContainer ref={ref} {...events}>
        <rect
          ...
          pointerEvents="all"
        />
      </SVGContainer>
    )
  }
)
```

Each geometric shape was rendered with _three_ SVG layers.

The first, topmost layer was an _invisible hit path_, with pointer events on. This hit path had a stroke-width larger than the visible stroke so users could grab shapes easily. The second layer was an optional fill path. And the third, bottommost layer was the visible stroke path.

[ HIT EXAMPLE ]

Hit-testing is usually split into a broad-phase check (cheap) and a narrow-phase check (expensive). We first cull the viewport of shapes that we can’t see or access. The broad phase involves a check to find the axis-aligned bounding box (AABB) that encloses the shape—this is a quick way to roughly compute the area the shape is in. The narrow phase checks if the point is within the shape’s exact geometry.

For example - here’s part of the `EllipseUtil` file in tldraw v1. This function returns whether a point is a hit. `pointInBounds` is the broad-phase AABB check, and `pointInEllipse` is the narrow-phase check on the shape’s geometry.

```tsx
hitTestPoint = (shape: T, point: number[]): boolean => {
	return (
		Utils.pointInBounds(point, this.getRotatedBounds(shape)) &&
		Utils.pointInEllipse(
			point,
			this.getCenter(shape),
			shape.radius[0],
			shape.radius[1],
			shape.rotation || 0
		)
	)
}
```

Shapes have the first chance to handle events, and then the canvas gets whatever is leftover. If you click on empty space, the `useCanvasEvents()` method handles it: this is how you could create selection brushes or pan the canvas, through callbacks like `onPointCanvas()` and `onDragCanvas()`.

### **Issues**

Doing z-index traversal on multiple DOM elements leads to a few issues with interactions. The most egregious is with arrow bindings to hollow shapes.

- Here’s an example where the child shape has a higher z-index than the parent. This case is fine; the arrow can find the shape and bind to it.
  ![z-index-higher2.gif](attachment:33f987fc-5b00-4a31-bebe-494fcbabaf55:z-index-higher2.gif)
- However, when the child has a lower z-index than the parent, the arrow cannot find the shape and bind to it.
  ![z-index-lower2.gif](attachment:e1995aee-bf22-4d53-af46-6dc4fb51c591:z-index-lower2.gif)

Since the shapes are hollow, it’s impossible for the user to tell the difference between these cases—they shouldn’t behave differently!

A similar case of inconsistent interactions: when a child shape has a lower z-index than its parent and is in a group, we can no longer select it by clicking within its bounds.

- GIF
  ![group-child-not-select.gif](attachment:0d6d6b72-a7ad-4966-9cb0-092c6b2380a0:group-child-not-select.gif)

There are also ways in which this implementation forces a fight against the DOM.

An example is with groups: hover over the blank space, and the whole group lights up. If you wanted to separate this behaviour, you’d have to really fight against the pointer-events model. This would mean adding pointer events selectively, then dealing with transform and zoom implications, tackling event delegation to child objects of the group, and so on.

- GIF
  ![group-selection-box.gif](attachment:e1f939e5-3a2d-4baa-9eaa-5b22562d31a0:group-selection-box.gif)

---

## **New**

In the current iteration of tldraw, bounds and hit detection is done in a purely geometric system, and does not use pointer events on shape elements. This approach uses geometry primitives that are separate from shape data—instead, the geometric calculations are performed at hit-test time. This separation provides greater flexibility for developers. Shape calculations remain standard, but shapes themselves can have complex properties.

This approach also avoids rendering the extra invisible DOM elements used for hit-testing. This obviates the need to manually clean up DOM nodes, and removes unnecessary memory overheads and the chance for memory leaks. Less DOM pollution also means fewer bugs and an easier time for developers working with the canvas.

The changes also presented an opportunity to build a [debug-geometry mode](https://github.com/tldraw/tldraw/blob/5b2a0198/packages/editor/src/lib/components/GeometryDebuggingView.tsx). This is useful when developing and testing new shape interactions, but also helps visualise the hit-testing concept.

[ DEBUG EXAMPLE ]

**Red lines** trace the shape's perimeter and the bounding box inside the polygon. **Green/blue dots** illustrate the the vertices of the shape (green first, blue last). **Blue lines** illustrate the distance to the nearest point on the shape's outline when the cursor is _outside_ the shape, and **golden lines** illustrate the distance to the nearest point on the shape's outline when the cursor is _inside_ the shape (within 150px).

Let’s take a deeper look at the hit-testing algorithm.

## **The Algorithm**

The change to a purely geometric system allows for adding more control over interactions. It’s now possible to define in more detail what counts as a hit, and therefore solve for the sorts of interaction issues mentioned above. This detail is contained within one function, `getShapeAtPoint`, which is the algorithm used for hit-testing in tldraw’s canvas ‘editor’ god-object.

The function begins by ordering the shapes on the page. We want to hit the topmost shapes first, so the ordering goes backwards through the list of shapes. `getCurrentPageShapesSorted()` returns an array of shapes sorted in z-index order, and we iterate through this array in reverse.

```tsx
		const shapesToCheck = (
			opts.renderingOnly
				? this.getCurrentPageRenderingShapesSorted()
				: this.getCurrentPageShapesSorted()
		).filter((shape) => {
			if (
				(shape.isLocked && !hitLocked) ||
				this.isShapeHidden(shape) ||
				this.isShapeOfType(shape, 'group')
			)
				return false
			const pageMask = this.getShapeMask(shape)
			if (pageMask && !pointInPolygon(point, pageMask)) return false
			if (filter && !filter(shape)) return false
			return true
		})

		for (let i = shapesToCheck.length - 1; i >= 0; i--) {
			const shape = shapesToCheck[i]
			...
```

This check is part of the broad-phase initial search to rule out obvious non-contenders, like locked and hidden shapes. It’s worth zooming into these lines in particular:

```tsx
const pageMask = this.getShapeMask(shape)
if (pageMask && !pointInPolygon(point, pageMask)) return false
```

`getShapeMask` returns an array of points that define a polygon mask for a shape. The mask represents the clipping region applied to a shape when it’s a child of a container (like a frame).

`pointInPolygon` is an implementation of the 'winding number algorithm'. This is a technique that counts how many times a horizontal ray, shot to the right of the point, intersects the polygon. An odd winding number means the point is inside; an even winding number means the point is outside.

[ POLYGON EXAMPLE ]

### **Labels**

Next, a preliminary check for labels: a user can add a label to arrows, sticky notes, and to geometric shapes (by double-clicking on them) - this check gives priority to label hits for easier text editing. It returns the shape if the point is inside a label's bounds, and also ensures that selection works on frame headers, so users can rename frames.

```tsx
if (
	this.isShapeOfType<TLFrameShape>(shape, 'frame') ||
	((this.isShapeOfType<TLNoteShape>(shape, 'note') ||
		this.isShapeOfType<TLArrowShape>(shape, 'arrow') ||
		(this.isShapeOfType<TLGeoShape>(shape, 'geo') && shape.props.fill === 'none')) &&
		this.getShapeUtil(shape).getText(shape)?.trim())
) {
	for (const childGeometry of (geometry as Group2d).children) {
		if (childGeometry.isLabel && childGeometry.isPointInBounds(pointInShapeSpace)) {
			return shape
		}
	}
}
```

### **Frames**

What happens if we hit a frame? Frames weren’t present in tldraw v1, so this is a novel case. If we hit close to the frame’s margin, then we select the frame itself. The frame is _not_ returned if the hit is inside and in blank space. However, if the hit is inside and on a shape inside the frame, that shape should be captured.

Shapes partially outside the frame are clipped; this happens in the `shapesToCheck` section at the top of the algorithm. Only masked bounds are used for hit-testing, so only the visible portion of the shape in the frame can be hit.

```tsx
if (this.isShapeOfType<TLFrameShape>(shape, 'frame')) {
	const distance = geometry.distanceToPoint(pointInShapeSpace, hitFrameInside)
	if (
		hitFrameInside
			? (distance > 0 && distance <= outerMargin) || (distance <= 0 && distance > -innerMargin)
			: distance > 0 && distance <= outerMargin
	) {
		return inMarginClosestToEdgeHit || shape
	}

	if (geometry.hitTestPoint(pointInShapeSpace, 0, true)) {
		return (
			inMarginClosestToEdgeHit || inHollowSmallestAreaHit || (hitFrameInside ? shape : undefined)
		)
	}
	continue
}
```

One of the funnier bugs found in early v2 was that you could select shapes _behind_ frames.

- GIF
  ![select-shape-behind-frame.gif](attachment:ed49189d-ceac-468f-9ed8-296c1cea62bf:select-shape-behind-frame.gif)

Here, DOM-based z-index traversal _does_ play in our favour. Since we go through shapes in reverse order and return when we hit the blank space in the frame, we occlude shapes behind it without requiring a special case.

### **Groups**

How should we handle groups, and the issue with empty space between child shapes? We iterate through all the children and run the narrow phase check on each of them. Now instead of hitting the group when the point is in its bounds, we hit the group only when we select a child shape inside.

```tsx
if (isGroup) {
	let minDistance = Infinity
	for (const childGeometry of geometry.children) {
		if (childGeometry.isLabel && !hitLabels) continue

		const tDistance = childGeometry.distanceToPoint(pointInShapeSpace, hitInside)
		if (tDistance < minDistance) {
			minDistance = tDistance
		}
	}

	distance = minDistance
}
```

### **Geometric shapes**

Now for standalone geometric shapes. This begins with a broad-phase/narrow-phase check - but we have to solve for one edge case first. We found that for extremely _thin_ shapes, the broad phase check would fail because the bounding box was so small. For these tiny shapes, we skip straight to the narrow-phase distance test.

```tsx
if (outerMargin === 0 && (geometry.bounds.w < 1 || geometry.bounds.h < 1)) {
	distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
} else {
	if (geometry.bounds.containsPoint(pointInShapeSpace, outerMargin)) {
		distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
	} else {
		distance = Infinity
	}
}
```

Then there are a few straightforward alternative cases.

One is the immediate return on filled shapes. Again, since we’ve sorted by z-index, a filled shape would occlude shapes behind it - so any point within the topmost filled shape is a hit on that shape.

```tsx
		if (geometry.isFilled || (isGroup && geometry.children[0].isFilled)) {
			return inMarginClosestToEdgeHit || shape
```

- GIF
  ![shapes-filled-3.gif](attachment:a8b12f2a-c092-45ff-8132-7094b7db6d6c:shapes-filled-3.gif)

If the shape is bigger than the viewport, skip it.

```tsx
if (this.getShapePageBounds(shape)!.contains(viewportPageBounds)) continue
```

And for ‘open’ shapes (e.g freehand lines), simply return a hit if the point is close to the margin.

```tsx
if (distance < this.options.hitTestMargin / zoomLevel) {
	return shape
}
```

Now we get to address the trouble with hollow closed shapes and arrow bindings. The current solution involves dancing around margins.

Two variables are used to track these shapes. `inMarginClosestToEdgeHit` tracks hollow shapes where the point is close to the edge, and `inHollowSmallestAreaHit` tracks the smallest hollow shapes containing the point. These variables start `null` and get updated when there is a more specific shape (closer or smaller).

One other related bindings issue that surfaced in v2 was where hollow shapes positioned on _top_ of filled shapes could not be bound by arrows; only the larger filled shape would be hit.

- GIF
  ![edge-hitting.gif](attachment:f816d634-874a-4c46-85af-c515f268e8e8:edge-hitting.gif)

The issue was that filled shapes return immediately if the point was anywhere in the shape, and this would override the margin check for hollow shapes that might be inside it. To solve this, arrow bindings needed to become sensitive to whether the point is inside or outside (hollow) shapes. To achieve this, the algorithm now accepts either a number or a tuple for its margin, and makes use of this distinction depending on whether the point is inside the shape.

```tsx
const [innerMargin, outerMargin] = Array.isArray(margin) ? margin : [margin, margin]
```

Before: hit the closest shape within the margin. This used a single, absolute inside/outside margin value.

```tsx
		if (Math.abs(distance) < margin) {
				if (Math.abs(distance) < inMarginClosestToEdgeDistance) {
					inMarginClosestToEdgeDistance = Math.abs(distance)
					inMarginClosestToEdgeHit = shape
		}
```

After: hit the closest shape within the margin—but first, if we can detect that the point is inside a shape, then make a different distance check for inner and outer margins. This lets us detect when the pointer is inside the hollow shape's bounds (within the inner margin) and prioritize it over the filled shape underneath.

```tsx
		if (
			hitInside
				?
					(distance > 0 && distance <= outerMargin) ||
					(distance <= 0 && distance > -innerMargin)
				:
					Math.abs(distance) <= Math.max(innerMargin, outerMargin)
		) {
			if (Math.abs(distance) < inMarginClosestToEdgeDistance) {
				inMarginClosestToEdgeDistance = Math.abs(distance)
				inMarginClosestToEdgeHit = shape
			}
```

Interestingly, this check doesn’t help us when the user _hovers_ over the inside of hollow shapes. In such cases, we are not able to tell whether or not the point is inside or outside the shape. The issue is in how `distanceToPoint` is calculated. This function calculates the signed distance from a point to a shape (negative inside, positive outside):

```tsx
distanceToPoint(point: VecLike, hitInside = false, filters?: Geometry2dFilters) {
    return (
        Vec.Dist(point, this.nearestPoint(point, filters)) *
        (this.isClosed && (this.isFilled || hitInside) && pointInPolygon(point, this.vertices)
            ? -1
            : 1)
    )
}
```

Hovering over a hollow shape means that both `hitInside` and `isFilled` are `false`, and therefore returns a positive value in every case. As above, for this case, we default to checking both margins and using the maximum value because we want to hit the shape if it’s close-by.

Lastly: if the point is not within margin distance of any edge, is inside multiple *hollow* shapes, and no filled shapes have been hit—then we want to hit the shape with the smallest area (as a tiebreaker). This part also enables the user to select hollow shapes by clicking inside them.

```tsx
else if (!inMarginClosestToEdgeHit) {
	const { area } = geometry
	if (area < inHollowSmallestArea) {
		inHollowSmallestArea = area
		inHollowSmallestAreaHit = shape
	}
```

Here’s an illustration of this logic, taken to the extreme (of all the hollow shapes, we select the smallest):

- [GIF]
  ![hollow-shape.gif](attachment:5db77bd9-0368-43f6-b303-62c310c7565d:hollow-shape.gif)

Here’s a before and after of the changes to hollow shapes:

- **Before**
  ![before-2.gif](attachment:7001fdb9-f85e-4be1-be0c-e48a5792c636:before-2.gif)
- **After**
  ![after.gif](attachment:ba26be3b-8dfb-456b-91eb-3d089b679647:after.gif)

Phew… that's been the journey so far! Thanks for following along.

You can check out the old version of tldraw at [old.tldraw.com](https://old.tldraw.com/). We’re eager to hear about issues, requests or improvements - check out our main repo on [GitHub](https://github.com/tldraw/tldraw), and follow us on [X](https://x.com/tldraw).

---

---

---

# **misc / junkyard**

Few other related edge-cases.

1. When you put two shapes next to each other, it’s unclear which is selected. Overlap of hit test border area, higher z-index wins.

- binding (idt this is right)

  ![small-cursor-difference.gif](attachment:dc7f40bf-1ef6-4c82-94ad-cefe0265eebe:small-cursor-difference.gif)

- group phase unnecessary detail
  For hollow shapes**,** the label is often the only filled/interactive area selection. Without checking labels first, clicks on the label of a hollow shape might miss entirely, since the shape body itself is not filled and would only hit on its edges.
  [Test example](https://github.com/tldraw/tldraw/blob/fe9b43f7/packages/tldraw/src/test/selection-omnibus.test.ts) - when clicking on the center of a hollow geo shape (where the label is), the shape gets selected even though the body itself would miss selection. The label hit test succeeds and returns the shape immediately.
  Similarly, when editing shapes, the **`EditingShape`** state checks if clicks are on labels to determine whether to continue editing or transition states (EditingShape.ts:106-134).

Full algorithm:

```tsx
	/**
	 * Get the shape at the current point.
	 *
	 * @param point - The point to check.
	 * @param opts - Options for the check: `hitInside` to check if the point is inside the shape, `margin` to check if the point is within a margin of the shape, `hitFrameInside` to check if the point is inside the frame, and `filter` to filter the shapes to check.
	 *
	 * @returns The shape at the given point, or undefined if there is no shape at the point.
	 */
	getShapeAtPoint(point: VecLike, opts: TLGetShapeAtPointOptions = {}): TLShape | undefined {
		const zoomLevel = this.getZoomLevel()
		const viewportPageBounds = this.getViewportPageBounds()
		const {
			filter,
			margin = 0,
			hitLocked = false,
			hitLabels = false,
			hitInside = false,
			hitFrameInside = false,
		} = opts

		const [innerMargin, outerMargin] = Array.isArray(margin) ? margin : [margin, margin]

		let inHollowSmallestArea = Infinity
		let inHollowSmallestAreaHit: TLShape | null = null

		let inMarginClosestToEdgeDistance = Infinity
		let inMarginClosestToEdgeHit: TLShape | null = null

		const shapesToCheck = (
			opts.renderingOnly
				? this.getCurrentPageRenderingShapesSorted()
				: this.getCurrentPageShapesSorted()
		).filter((shape) => {
			if (
				(shape.isLocked && !hitLocked) ||
				this.isShapeHidden(shape) ||
				this.isShapeOfType(shape, 'group')
			)
				return false
			const pageMask = this.getShapeMask(shape)
			if (pageMask && !pointInPolygon(point, pageMask)) return false
			if (filter && !filter(shape)) return false
			return true
		})

		for (let i = shapesToCheck.length - 1; i >= 0; i--) {
			const shape = shapesToCheck[i]
			const geometry = this.getShapeGeometry(shape)
			const isGroup = geometry instanceof Group2d

			const pointInShapeSpace = this.getPointInShapeSpace(shape, point)

			// Check labels first
			if (
				this.isShapeOfType<TLFrameShape>(shape, 'frame') ||
				((this.isShapeOfType<TLNoteShape>(shape, 'note') ||
					this.isShapeOfType<TLArrowShape>(shape, 'arrow') ||
					(this.isShapeOfType<TLGeoShape>(shape, 'geo') && shape.props.fill === 'none')) &&
					this.getShapeUtil(shape).getText(shape)?.trim())
			) {
				for (const childGeometry of (geometry as Group2d).children) {
					if (childGeometry.isLabel && childGeometry.isPointInBounds(pointInShapeSpace)) {
						return shape
					}
				}
			}

			if (this.isShapeOfType<TLFrameShape>(shape, 'frame')) {
				// On the rare case that we've hit a frame (not its label), test again hitInside to be forced true;
				// this prevents clicks from passing through the body of a frame to shapes behind it.

				// If the hit is within the frame's outer margin, then select the frame
				const distance = geometry.distanceToPoint(pointInShapeSpace, hitFrameInside)
				if (
					hitFrameInside
						? (distance > 0 && distance <= outerMargin) ||
							(distance <= 0 && distance > -innerMargin)
						: distance > 0 && distance <= outerMargin
				) {
					return inMarginClosestToEdgeHit || shape
				}

				if (geometry.hitTestPoint(pointInShapeSpace, 0, true)) {
					// Once we've hit a frame, we want to end the search. If we have hit a shape
					// already, then this would either be above the frame or a child of the frame,
					// so we want to return that. Otherwise, the point is in the empty space of the
					// frame. If `hitFrameInside` is true (e.g. used drawing an arrow into the
					// frame) we the frame itself; other wise, (e.g. when hovering or pointing)
					// we would want to return null.
					return (
						inMarginClosestToEdgeHit ||
						inHollowSmallestAreaHit ||
						(hitFrameInside ? shape : undefined)
					)
				}
				continue
			}

			let distance: number

			if (isGroup) {
				let minDistance = Infinity
				for (const childGeometry of geometry.children) {
					if (childGeometry.isLabel && !hitLabels) continue

					// hit test the all of the child geometries that aren't labels
					const tDistance = childGeometry.distanceToPoint(pointInShapeSpace, hitInside)
					if (tDistance < minDistance) {
						minDistance = tDistance
					}
				}

				distance = minDistance
			} else {
				// If the margin is zero and the geometry has a very small width or height,
				// then check the actual distance. This is to prevent a bug where straight
				// lines would never pass the broad phase (point-in-bounds) check.
				if (outerMargin === 0 && (geometry.bounds.w < 1 || geometry.bounds.h < 1)) {
					distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
				} else {
					// Broad phase
					if (geometry.bounds.containsPoint(pointInShapeSpace, outerMargin)) {
						// Narrow phase (actual distance)
						distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
					} else {
						// Failed the broad phase, geddafugaotta'ere!
						distance = Infinity
					}
				}
			}

			if (geometry.isClosed) {
				// For closed shapes, the distance will be positive if outside of
				// the shape or negative if inside of the shape. If the distance
				// is greater than the margin, then it's a miss. Otherwise...

				// Are we close to the shape's edge?
				if (distance <= outerMargin || (hitInside && distance <= 0 && distance > -innerMargin)) {
					if (geometry.isFilled || (isGroup && geometry.children[0].isFilled)) {
						// If the shape is filled, then it's a hit. Remember, we're
						// starting from the TOP-MOST shape in z-index order, so any
						// other hits would be occluded by the shape.
						return inMarginClosestToEdgeHit || shape
					} else {
						// If the shape is bigger than the viewport, then skip it.
						if (this.getShapePageBounds(shape)!.contains(viewportPageBounds)) continue

						// If we're close to the edge of the shape, and if it's the closest edge among
						// all the edges that we've gotten close to so far, then we will want to hit the
						// shape unless we hit something else or closer in later iterations.
						if (
							hitInside
								? // On hitInside, the distance will be negative for hits inside
									// If the distance is positive, check against the outer margin
									(distance > 0 && distance <= outerMargin) ||
									// If the distance is negative, check against the inner margin
									(distance <= 0 && distance > -innerMargin)
								: // If hitInside is false, then sadly _we do not know_ whether the
									// point is inside or outside of the shape, so we check against
									// the max of the two margins
									Math.abs(distance) <= Math.max(innerMargin, outerMargin)
						) {
							if (Math.abs(distance) < inMarginClosestToEdgeDistance) {
								inMarginClosestToEdgeDistance = Math.abs(distance)
								inMarginClosestToEdgeHit = shape
							}
						} else if (!inMarginClosestToEdgeHit) {
							// If we're not within margin distance to any edge, and if the
							// shape is hollow, then we want to hit the shape with the
							// smallest area. (There's a bug here with self-intersecting
							// shapes, like a closed drawing of an "8", but that's a bigger
							// problem to solve.)
							const { area } = geometry
							if (area < inHollowSmallestArea) {
								inHollowSmallestArea = area
								inHollowSmallestAreaHit = shape
							}
						}
					}
				}
			} else {
				// For open shapes (e.g. lines or draw shapes) always use the margin.
				// If the distance is less than the margin, return the shape as the hit.
				// Use the editor's configurable hit test margin.
				if (distance < this.options.hitTestMargin / zoomLevel) {
					return shape
				}
			}
		}

		// If we haven't hit any filled shapes or frames, then return either
		// the shape who we hit within the margin (and of those, the one that
		// had the shortest distance between the point and the shape edge),
		// or else the hollow shape with the smallest area—or if we didn't hit
		// any margins or any hollow shapes, then null.
		return inMarginClosestToEdgeHit || inHollowSmallestAreaHit || undefined
	}

```

Issues of old tldraw:

1. Another example is arrow bindings to freehand shapes.

- fns
  `distanceToPoint`:
  This is a (new) method in Geometry2d. It calculates the signed distance from a point to the geometry's outline. The distance is positive if the point is outside the shape, and negative if the point is inside a closed, filled shape.
  we can see this method in use in the GeometryDebuggingView, which uses it to calculate the distance from the cursor to each shape's outline, and colors the line goldenrod if it's inside or dodgerblue if outside.
  `isPointInBounds`:
  The broad phase check is a **performance optimization** that quickly tests if a point is within a shape's bounding box (plus margin) before performing the more expensive narrow phase distance calculation. The broad phase uses **`geometry.bounds.containsPoint(pointInShapeSpace, outerMargin)`** to check if the point falls within the shape's axis-aligned bounding box Editor.ts:5193 . This is a very fast operation - just four simple comparisons checking if the point's x and y coordinates are within the min/max bounds.
  `pointInPolygon`:
  Winding number algorithm to find if a point is within a particular polygon. Shoot a ray to the right of the point. First, return true if the point is the same coord as a vertex on the polygon. Check if the point lies exactly on any polygon edge by testing if the sum of distances from the point to both edge endpoints equals the edge length. Then calculate winding numbers: for points not on vertices or edges, count how many times the polygon “winds around” the point.

1. shapesToCheck: filter shapes to determine which ones should be checked for a point intersection
   1. gets either only visible shapes, or all shapes on the current page
   2. excludes shapes that are locked, hidden, or groups
   3. excludes shapes outside of their page mask bounds (we dont want to get shapes where the point is outside the mask)
   4. optional custom filter to add other criteria

1. loop

   check if the shape has a label. if so, prioritize the label hit so the user can edit text

   iterates backwards so topmost shapes are checked first

   gets shape geometry and converts the point to shape’s local coordinate space

1. check if we’ve hit a frame. if so, for the first hit, make sure we dont hit the shapes inside but the frame itself.

   once we’ve hit the frame, we should then be able to hit shapes inside it. we should prioritize topmost shapes, i.e. shapes that were found earlier in the loop

   also, we should distinguish between hitting the frame, or the frame’s margin

   then there are performance optimizations

   and add a special case for thin shapes

   _claude: only return the frame itself in specific cases (margin hits, or when `hitFrameInside` is true)_

1. for closed shapes\* check if the point is inside the shape (distance < 0) or if it’s outside the shape. for open shapes, always use margin-based detection, based on proximity to the shape

   we need to handle overlapping hollow / unfilled closed shapes:

   try picking the shape with the closest edge to the point. if the point is near many edges, pick the edge with the shortest distance to the point.

   if there are no edges close to the point, pick the _smallest_ (hollow) shape near to the point. this handles nested shapes

   note - different margin logic for `hitInside` — when `hitInside` is true: different margins for inside vs outside the shape. when `hitInside` is false: uses the larger of the two margins since we can't tell inside/outside

1. ‘if we haven't hit any filled shapes or frames, then return either the shape who we hit within the margin (and of those, the one that had the shortest distance between the point and the shape edge), or else the hollow shape with the smallest area—or if we didn't hit any margins or any hollow shapes, then null.’

The narrow phase first uses an axis-aligned minimum bounding box (AABB) to find what’s near the pointer. note

Looking at the difference between the triangle in v1 and v2.

- v1: [TriangleUtil](https://github.com/tldraw/tldraw-v1/blob/main/packages/tldraw/src/state/shapes/TriangleUtil/TriangleUtil.tsx)
  binding algorithm. check if near the triangle. then find closest edge distance (how close is point to triangle perimeter). check if there is a ray intersection. select anchor point, where the binding attaches.
  The change also involved arrow bindings moving from being _ray_-based to _distance_-based. This accompanied a design change: pull the end of the arrow itself when the end is unbound. When the ends are bound to a shape, we pull the point itself, rather than the ends of the arrow, which is a friendlier interaction.
- This doesn’t have `hitTestPoint`. v2:
  ```tsx
  	override hitTestPoint(shape: TLGeoShape, point: VecLike): boolean {
  		const outline = this.editor.getOutline(shape)

  		if (shape.props.fill === 'none') {
  			const zoomLevel = this.editor.zoomLevel
  			const offsetDist = STROKE_SIZES[shape.props.size] / zoomLevel
  			// Check the outline
  			for (let i = 0; i < outline.length; i++) {
  				const C = outline[i]
  				const D = outline[(i + 1) % outline.length]
  				if (Vec2d.DistanceToLineSegment(C, D, point) < offsetDist) return true
  			}

  			// Also check lines, if any
  			const lines = getLines(shape.props, 1)
  			if (lines !== undefined) {
  				for (const [C, D] of lines) {
  					if (Vec2d.DistanceToLineSegment(C, D, point) < offsetDist) return true
  				}
  			}

  			return false
  		}

  		return pointInPolygon(point, outline)
  	}
  ```
- cursor
  1. **Performance**: No longer renders 3 separate paths for every shape. Hit areas are integrated with visual rendering.
  2. **Accuracy**: Programmatic hit testing allows for pixel-perfect detection accounting for stroke width, zoom level, and shape geometry.
  3. **Flexibility**: Different shapes can implement custom hit-testing logic (see DrawShapeUtil, ArrowShapeUtil for complex examples).
  4. **Better Edge Cases**: Handles unfilled shapes, thin lines, and small dots more reliably with distance-to-segment calculations.

And in the `pointInBounds` method - new version includes margin,
• Avoids allocating a new bounds object
• Does the math inline during the comparison
• Has less memory overhead

- snippet
  ```
  isPointInBounds(point: VecLike, margin = 0) {
  	const { bounds } = this
  	return !(
  		point.x < bounds.minX - margin ||
  		point.y < bounds.minY - margin ||
  		point.x > bounds.maxX + margin ||
  		point.y > bounds.maxY + margin
  	)
  }
  ```

```tsx
return inMarginClosestToEdgeHit || inHollowSmallestAreaHit || undefined
```

Return either the shape we hit within the margin (with the shortest distance between the point and shape edge), or else the hollow shape with the smallest area. Otherwise, we didn’t hit anything!
