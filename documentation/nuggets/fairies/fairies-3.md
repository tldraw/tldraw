---
title: Fairies
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - fairies
  - AI
  - multimodal
---

# Fairies

When we added AI features to tldraw, we needed to send coordinate data to multimodal models. The naive approach would be to send the absolute page coordinates—wherever shapes happen to be placed. But we noticed models performed better with small integers than large floating-point numbers. A shape at position (47, 109) is easier for a model to work with than one at (12847.2341, -3291.8472).

The solution: transform coordinates into a simpler space before sending them to the model, then transform them back when applying the model's changes.

## Offsetting relative to viewport

Every chat session has a "chat origin"—the top-left corner of the viewport when the chat started. We store this as an atom in the agent:

```typescript
$chatOrigin = atom<VecModel>('chatOrigin', { x: 0, y: 0 })
```

When the chat resets, we capture the current viewport position:

```typescript
reset() {
    const viewport = this.editor.getViewportPageBounds()
    this.$chatOrigin.set({ x: viewport.x, y: viewport.y })
}
```

Now when we send coordinates to the model, we apply an offset that moves the origin to (0, 0):

```typescript
applyOffsetToVec(position: VecModel): VecModel {
    return {
        x: position.x + this.offset.x,
        y: position.y + this.offset.y,
    }
}
```

The offset is just the negation of the chat origin. A shape at page position (12847, -3291) becomes (0, 0) if that's where the viewport was when the chat started. A shape 100 pixels to the right becomes (100, 0).

When the model returns coordinates, we reverse the transformation:

```typescript
removeOffsetFromVec(position: VecModel): VecModel {
    return {
        x: position.x - this.offset.x,
        y: position.y - this.offset.y,
    }
}
```

This means the model always works in a coordinate space where (0, 0) is the top-left of the initial viewport, regardless of where the user has panned on the infinite canvas.

## Rounding with precision recovery

Offsetting makes numbers smaller, but they're still floats. The second transformation is rounding to integers.

Before sending a shape to the model, we round every coordinate:

```typescript
roundShape(shape: SimpleShape): SimpleShape {
    if ('x1' in shape) {
        shape = this.roundProperty(shape, 'x1')
        shape = this.roundProperty(shape, 'y1')
        shape = this.roundProperty(shape, 'x2')
        shape = this.roundProperty(shape, 'y2')
    } else if ('x' in shape) {
        shape = this.roundProperty(shape, 'x')
        shape = this.roundProperty(shape, 'y')
    }

    if ('w' in shape) {
        shape = this.roundProperty(shape, 'w')
        shape = this.roundProperty(shape, 'h')
    }

    return shape
}
```

The trick is we don't just round—we track how much we rounded by:

```typescript
roundAndSaveNumber(number: number, key: string): number {
    const roundedNumber = Math.round(number)
    const diff = roundedNumber - number
    this.roundingDiffMap.set(key, diff)
    return roundedNumber
}
```

The key is `${shape.shapeId}_${property}`, like `"rectangle-1_x"`. If a shape's x coordinate is 47.823 and we round it to 48, we store the diff of 0.177 in a map.

When the model returns that same shape with a rounded coordinate, we can restore the original precision:

```typescript
unroundAndRestoreNumber(number: number, key: string): number {
    const diff = this.roundingDiffMap.get(key)
    if (diff === undefined) return number
    return number + diff
}
```

If the model moves the shape from x: 48 to x: 100, we apply the stored diff and get 100.177. The fractional part is preserved through the round trip.

## Why this matters

Models are trained on text tokens, and certain numeric patterns appear more frequently in training data. Small integers like "42" or "100" have clearer semantic associations than arbitrary decimals like "12847.2341". The model doesn't understand coordinates—it predicts token sequences. Making the numbers simpler makes the prediction task easier.

The rounding also reduces payload size. JSON with integers compresses better than JSON with floats, and every token counts when you're sending context to a language model.

The precision recovery ensures we don't accumulate rounding errors. If the user places a shape at x: 47.5 and the model moves it 50 pixels right, it should end up at x: 97.5, not x: 98. Without tracking the rounding diff, we'd lose that half-pixel every time.

## Where this lives

The coordinate transformation helpers are in `templates/agent/shared/AgentHelpers.ts`. The chat origin atom is in `templates/agent/client/agent/TldrawAgent.ts`.

Every prompt part that includes shape data applies these transformations before serializing to JSON. Every action utility reverses them when converting the model's response back to tldraw shapes. The system is transparent to the utilities—they just call `helpers.applyOffsetToShape()` and `helpers.removeOffsetFromShape()` without knowing what those functions do.
