---
title: Top-left origin
created_at: 01/10/2026
updated_at: 01/10/2026
keywords:
  - coordinates
  - origin
  - browser
  - canvas
---

Unlike most game engines and graphics libraries, tldraw's origin sits at the top left corner of the viewport. Our y-axis points downward too—positive values are below the origin, negative values above.

This feels wrong if you're coming from game development or remember your high school math. Cartesian coordinates put the origin at the center, with y increasing as you go up. It's the coordinate system from every graph you've ever plotted.

So why didn't we use it?

## The browser already picked

The DOM uses top-left origin coordinates everywhere. Mouse events give you `clientX` and `clientY` measured from the top-left corner of the viewport. CSS positioning works the same way—`top: 100px` pushes an element down, not up. Element bounding boxes, scroll positions, touch events—all top-left, all y-down.

If we'd chosen Cartesian coordinates, every interaction with the browser would require a conversion. Click handler? Flip the y. Position a tooltip? Flip it back. Debug in DevTools? Mentally flip while reading. The boundary between "our coordinate system" and "browser coordinate system" would run through almost every piece of code that touches the DOM.

By matching the browser's conventions, there's no boundary at all. A click at `clientY: 200` goes straight into our system as y=200 (adjusted for scroll and zoom, but never flipped). The numbers in our state match what you'd see in DevTools. When something looks wrong, you can inspect it directly without mental translation.

## The costs

We won't pretend there aren't tradeoffs. Rotation math gets confusing—positive angles rotate clockwise in our system, which is backwards from the mathematical convention. Trigonometry formulas often assume y-up, so you'll occasionally see a sign flip or a `Math.PI * 2 -` that exists purely to convert conventions.

And yes, if you ask an LLM to plot a sine wave on the canvas, it'll probably render upside down. The model learned from Cartesian examples.

But we interact with the browser constantly. We interact with trigonometry occasionally. The choice of where to put the conversion overhead was clear.

## Source files

- Coordinate transformations: `/packages/editor/src/lib/editor/Editor.ts` (screenToPage, pageToScreen methods around line 3820)
- Vec primitives: `/packages/editor/src/lib/primitives/Vec.ts`
