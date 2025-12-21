---
title: Hybrid multimodal context for AI agents
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - fairies
  - AI
  - multimodal
---

# Fairies

When we built tldraw's AI agent, we needed to give vision models precise control over canvas shapes—not just the ability to see them, but to manipulate them. Vision models can look at a screenshot and understand what's there, but they can't tell you exact pixel coordinates. Structured data like JSON provides perfect coordinates, but lacks visual context. We use both.

## The problem with screenshots alone

Vision models excel at understanding images. Show Claude a screenshot of a canvas with shapes, and it can describe what it sees: rectangles, arrows, text labels. But ask it to place a new shape 50 pixels to the right of an existing rectangle, and you hit a wall.

The model can see the rectangle, but it doesn't know its exact position. It can guess based on the image—"that rectangle looks like it's around x=200, y=150"—but these guesses are approximate at best. Pixel-precise manipulation requires exact coordinates, not visual estimates.

Screenshots also have a viewport problem. Only shapes within the current view appear in the image. If you've scrolled away from part of your canvas, those shapes are invisible to the model. The agent has no spatial awareness beyond what fits in the screenshot.

## The problem with JSON alone

Coordinates are straightforward in JSON:

```json
{
	"shapeId": "rectangle-1",
	"type": "rectangle",
	"x": 847,
	"y": 1923,
	"w": 200,
	"h": 150
}
```

The position is exact. But without visual context, this data is hard to reason about. Is this rectangle near other shapes? Is there text inside it? What color is it? The JSON might include these properties, but the model has to mentally reconstruct the spatial layout from lists of coordinates.

For a canvas with dozens of shapes, this becomes a significant cognitive load. The model processes coordinates as abstract numbers, not as a visual scene it can understand at a glance.

## The hybrid approach

We send both. The agent prompt includes a screenshot of the current viewport and JSON data for shapes. The screenshot provides visual understanding—what shapes exist, their spatial relationships, their appearance. The JSON provides precise coordinates for manipulation.

When the model needs to understand the canvas, it looks at the screenshot. When it needs to create or move shapes, it uses the coordinates from JSON. Each format compensates for the other's weakness.

This isn't redundant. The model uses different information from each source. The screenshot answers questions like "is this region crowded?" or "what color should I use to match?" The JSON answers questions like "where exactly should I place this arrow's endpoint?"

## Three tiers of shape data

Not all shapes need the same level of detail. We use three formats depending on how the model will interact with each shape.

**BlurryShape** — Shapes in the viewport that the model can see in the screenshot:

```typescript
{
  shapeId: "rectangle-1",
  type: "rectangle",
  x: 47,
  y: 109,
  w: 200,
  h: 150,
  text: "diagram"
}
```

This minimal format includes just enough to reference the shape by ID. The model already sees what it looks like in the screenshot. We include text content because OCR from screenshots is unreliable.

**SimpleShape** — Shapes the model is actively manipulating:

```typescript
{
  _type: "rectangle",
  shapeId: "rectangle-1",
  x: 47,
  y: 109,
  w: 200,
  h: 150,
  color: "blue",
  fill: "solid",
  text: "diagram",
  textAlign: "middle",
  note: ""
}
```

Full detail with all editable properties. When the model creates or updates shapes, it needs access to colors, fills, text alignment, and other styling options.

**PeripheralShapeCluster** — Shapes outside the viewport:

```typescript
{
  bounds: { x: -500, y: 2000, w: 400, h: 300 },
  numberOfShapes: 7
}
```

Shapes outside the current view get clustered. The model knows "there are 7 shapes to the south" without needing coordinates for each one. This provides spatial awareness beyond the viewport while keeping token costs down.

Shapes within 75 pixels of each other cluster together. A canvas might have hundreds of shapes, but once clustered, that compresses to a handful of regions: "12 shapes to the northwest, 7 shapes to the south, 23 shapes to the east."

## Coordinate offsetting

Large coordinates are harder for models to work with. A shape at `(12847, -3291)` requires more cognitive load than one at `(47, 109)`. We normalize coordinates to small integers by treating the current viewport origin as `(0, 0)`.

When a chat session starts, we record the viewport's top-left corner. That becomes the origin. All coordinates sent to the model are relative to this origin. A shape at world position `(12847, -3291)` might become `(47, 109)` if the viewport's top-left is at `(12800, -3400)`.

Before sending shapes to the model, we apply the offset:

```typescript
applyOffsetToVec(position: VecModel): VecModel {
  return {
    x: position.x + this.offset.x,
    y: position.y + this.offset.y,
  }
}
```

When the model returns updated shapes, we reverse the offset to get back to world coordinates:

```typescript
removeOffsetFromVec(position: VecModel): VecModel {
  return {
    x: position.x - this.offset.x,
    y: position.y - this.offset.y,
  }
}
```

This doesn't just make coordinates smaller—it makes them more intuitive. The model sees the top-left of its view as `(0, 0)`, matching how humans think about canvas space when looking at a viewport.

## Coordinate rounding

We take this further by rounding coordinates to integers. The model receives `x: 47` instead of `x: 47.234`. This reduces decimal noise in the data and gives the model cleaner numbers to reason about.

But we can't just discard the fractional parts. When the model moves a shape, we need to apply that movement to the original precise coordinates. If a shape was at `x: 47.234` and the model moves it 100 pixels right to `x: 147`, we want the result at `x: 147.234`, not `x: 147.000`.

Before rounding, we save the difference:

```typescript
roundAndSaveNumber(number: number, key: string): number {
  const roundedNumber = Math.round(number)
  const diff = roundedNumber - number
  this.roundingDiffMap.set(key, diff)
  return roundedNumber
}
```

For each shape property, we store the rounding delta using a key like `rectangle-1_x`. Later, when the model returns modified coordinates, we restore the original precision:

```typescript
unroundAndRestoreNumber(number: number, key: string): number {
  const diff = this.roundingDiffMap.get(key)
  if (diff === undefined) return number
  return number + diff
}
```

If the shape started at `47.234`, we stored `diff = 0.234`. When the model returns `147`, we add back the `0.234` to get `147.234`.

## Screenshot generation

Screenshots capture only shapes that fit entirely within the viewport bounds:

```typescript
const shapes = editor.getCurrentPageShapesSorted().filter((shape) => {
	const bounds = editor.getShapeMaskedPageBounds(shape)
	return contextBoundsBox.includes(bounds)
})
```

Partially visible shapes are excluded. This keeps the correspondence between screenshot and JSON data clean—everything the model sees in the image has matching JSON data, and vice versa.

We render screenshots as JPEG with a maximum dimension of 8000 pixels:

```typescript
const largestDimension = Math.max(bounds.w, bounds.h)
const scale = largestDimension > 8000 ? 8000 / largestDimension : 1

const result = await editor.toImage(shapes, {
	format: 'jpeg',
	background: true,
	bounds: Box.From(bounds),
	scale,
})
```

JPEG compression reduces token costs. Vision models don't need lossless image data to understand canvas layouts. The background is included so the model sees the canvas as a complete scene, not floating shapes on transparency.

## Why this works

The hybrid approach lets the model think visually while acting precisely. When planning what to do, it looks at the screenshot to understand the canvas layout. When executing actions, it uses exact coordinates from JSON.

This mirrors how you'd work with a design tool if someone were giving you instructions. "Add a label next to that blue box" requires you to look at the screen (visual context) and then click at specific coordinates (precise action). The model needs both types of information for the same reasons.

The three-tier shape format keeps token costs manageable while preserving necessary detail. Shapes in view get minimal data because the screenshot provides visual context. Shapes being edited get full data because the model needs to specify exact properties. Shapes out of view get clustered because the model only needs rough spatial awareness.

Coordinate offsetting and rounding make the numbers easier for the model to process. Smaller integers are cognitively simpler than large decimals. The model performs better with coordinates like `(50, 100)` than `(12847.234, -3291.857)`, even though they represent the same positions after transformation.

## Source files

The hybrid multimodal system is implemented across several utilities in the agent template:

- `templates/agent/shared/AgentHelpers.ts` — Coordinate offsetting, rounding, and restoration
- `templates/agent/shared/parts/ScreenshotPartUtil.ts` — Viewport screenshot generation
- `templates/agent/shared/parts/BlurryShapesPartUtil.ts` — Minimal shape format for viewport shapes
- `templates/agent/shared/parts/PeripheralShapesPartUtil.ts` — Clustering for out-of-viewport shapes
- `templates/agent/shared/format/BlurryShape.ts` — Minimal shape type definition
- `templates/agent/shared/format/SimpleShape.ts` — Full shape type definition
- `templates/agent/shared/format/PeripheralShapesCluster.ts` — Cluster type definition
