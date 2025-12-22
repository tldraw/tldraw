---
title: Three-tier shape format for token efficiency
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - fairies
  - AI
  - multimodal
status: published
date: 12/21/2025
order: 1
---

# Fairies

When we built AI-powered agents for tldraw, we faced a token efficiency problem. Sending every shape on the canvas with full detail would blow through token budgets quickly. But sending just IDs or types wouldn't give the model enough information to make intelligent decisions. The solution is a three-tier format: minimal info for shapes in view, full detail for shapes being edited, and clustered summaries for shapes outside the viewport.

## The token problem

An AI agent needs to see the canvas to manipulate it effectively. A typical whiteboard might have 50 shapes. Each shape has around 40 properties—position, size, color, text content, styling options, rotation, and more. Sending all properties for all shapes means 2000+ data points in every prompt. That adds up fast, especially in multi-turn conversations.

We can't just skip shape data. The model needs coordinates to position new shapes. It needs to know what text exists to reference it. It needs IDs to update or delete shapes. The question is: how much detail does it actually need?

## Three levels of detail

We use different formats depending on where a shape is and what the model needs to do with it:

**BlurryShape** — Shapes visible in the viewport get minimal info:

```typescript
interface BlurryShape {
	shapeId: string
	text?: string
	type: SimpleShape['_type']
	x: number
	y: number
	w: number
	h: number
}
```

That's 6-7 fields. Enough to reference the shape by ID, understand what type it is, see its rough position and size, and read any text it contains. The model can say "move the blue rectangle" or "add an arrow from box-1 to box-2" without knowing every styling detail.

**SimpleShape** — Shapes being actively edited get full properties. Around 40 fields depending on type. This includes everything: colors, fonts, alignment, dash patterns, arrow bindings, text wrapping options. When the model needs to create or update a shape, it gets complete control.

**PeripheralShapeCluster** — Shapes outside the viewport get grouped into spatial clusters:

```typescript
interface PeripheralShapeCluster {
	bounds: BoxModel
	numberOfShapes: number
}
```

A cluster represents multiple shapes as a single bounding box with a count. If there are 20 shapes off to the right side of the canvas, the model sees "cluster at x: 2000, y: 500, containing 20 shapes" instead of 20 individual shape entries. This gives spatial awareness—the model knows there's content in that direction—without listing every shape.

## When to use each format

The three formats map to three contexts:

**BlurryShape** — Used for shapes inside the agent's viewport. These are shapes the model can see in the screenshot and might need to reference. The model doesn't need full detail because the screenshot shows colors, styles, and layout. The JSON just provides IDs and coordinates for precise manipulation.

**SimpleShape** — Used when the model is creating a new shape or editing an existing one. If the model's action references a specific shape, that shape is sent with full properties. This lets the model read the current state and make targeted updates.

**PeripheralShapeCluster** — Used for shapes outside the current viewport. These shapes exist but aren't immediately relevant. Clustering saves tokens while maintaining spatial context. If the model moves the viewport or asks "what's to the right," it can see there's a cluster in that direction.

## Clustering algorithm

Shapes outside the viewport are grouped by proximity. The algorithm expands each shape's bounds by 75 pixels and looks for overlaps. If two expanded bounds intersect, those shapes join the same cluster. The process continues until all shapes are assigned.

```typescript
const expandedBounds = shapes.map((shape) => {
	return {
		shape,
		bounds: editor.getShapeMaskedPageBounds(shape)!.clone().expandBy(75),
	}
})

for (const item of expandedBounds) {
	for (const group of groups) {
		if (group.bounds.includes(item.bounds)) {
			group.shapes.push(item.shape)
			group.bounds.expand(item.bounds)
			group.numberOfShapes++
			break
		}
	}
}
```

The 75-pixel padding means shapes don't need to touch to cluster—they just need to be nearby. A group of shapes with small gaps between them becomes one cluster rather than many tiny ones. This produces more useful spatial groupings.

Each cluster stores only its bounding box and shape count. If there are 47 shapes clustered together, that's one cluster entry instead of 47 shape entries. For large documents, this can reduce the off-viewport portion of the prompt by 90% or more.

## Token savings

The difference is substantial. A viewport with 20 shapes:

- BlurryShape format: ~6 fields × 20 shapes = 120 fields
- SimpleShape format: ~40 fields × 20 shapes = 800 fields
- Reduction: 85% fewer tokens for viewport shapes

For shapes outside the viewport, clustering is even more dramatic. 100 peripheral shapes might collapse into 5-10 clusters, representing hundreds of shapes with dozens of entries.

Combined with coordinate offsetting and rounding (which we'll cover separately), the three-tier format keeps prompt size manageable even for large, complex documents. The model gets enough information to work effectively without wasting tokens on details it doesn't need.

## Multimodal context

The three-tier shape format works in combination with screenshots. The model receives a JPEG of the viewport alongside the JSON shape data. The image shows layout, colors, and styling. The JSON provides precise coordinates and IDs for manipulation.

This hybrid approach solves a problem neither modality handles alone. Screenshots can't give exact coordinates—models struggle to read pixel-precise positions from images. JSON can't capture visual context—colors, fonts, and spatial relationships are verbose to describe in text. Together, they're efficient: the image conveys what's hard to serialize, and the JSON provides what images can't express precisely.

## Where this lives

The shape format definitions are in `templates/agent/shared/format/`:

- `BlurryShape.ts` — Minimal viewport format
- `SimpleShape.ts` — Full detail format with type definitions for all shape types
- `PeripheralShapesCluster.ts` — Clustered out-of-viewport format

Conversion utilities handle transformations between tldraw's internal shape format (TLShape) and the simpler agent formats:

- `convertTldrawShapeToBlurryShape.ts` — Extracts minimal fields
- `convertTldrawShapeToSimpleShape.ts` — Maps full properties
- `convertTldrawShapesToPeripheralShapes.ts` — Performs clustering
- `convertSimpleShapeToTldrawShape.ts` — Converts model output back to tldraw format

The prompt building system (`templates/agent/shared/parts/`) decides which format to use based on shape position and context. `BlurryShapesPartUtil.ts` handles viewport shapes, `PeripheralShapesPartUtil.ts` handles clustering, and individual action utilities request full SimpleShape detail when needed.

## Tradeoffs

The three-tier format optimizes for the common case: an agent working with a few shapes at a time in a specific area of the canvas. This works well for focused tasks like "add a title here" or "connect these two boxes."

It's less efficient for global operations. If the model needs to analyze or modify every shape on the canvas, it would need multiple turns to page through different viewport regions or request shapes individually. We haven't needed that pattern in practice—most agent interactions are local.

The format also assumes the model can handle partial information. When shapes are BlurryShape format, the model only sees type, position, and text. It can't know if a rectangle is filled or dashed, red or blue. That's intentional—the screenshot provides that context. But if screenshots weren't part of the prompt, the format would be insufficient.

These constraints are worth the token savings. The three-tier format lets us pack useful shape data into prompts without overwhelming the model with unnecessary detail.
