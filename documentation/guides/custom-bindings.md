---
title: Custom bindings
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - bindings
  - relationships
  - custom
  - tutorial
  - guide
---

This guide explains how to create custom bindings in tldraw. Bindings define relationships between shapes, like how arrows connect to other shapes.

## Overview

Bindings are relationships between two shapes:

- **From shape**: The shape that "owns" the binding (e.g., an arrow)
- **To shape**: The shape being bound to (e.g., a rectangle)

When bound shapes move, the binding system automatically updates related shapes.

## Basic binding structure

```typescript
import { BindingUtil, TLBaseBinding, RecordProps, T } from 'tldraw'

// Define binding type
type StickerBinding = TLBaseBinding<'sticker', {
  anchor: { x: number; y: number }
}>

// Create binding util
class StickerBindingUtil extends BindingUtil<StickerBinding> {
  static override type = 'sticker' as const

  static override props: RecordProps<StickerBinding> = {
    anchor: T.object({
      x: T.number,
      y: T.number,
    }),
  }

  override getDefaultProps() {
    return {
      anchor: { x: 0.5, y: 0.5 },
    }
  }
}
```

## Lifecycle callbacks

Bindings have callbacks for different events:

### Binding lifecycle

```typescript
class MyBindingUtil extends BindingUtil<MyBinding> {
  // Called before binding is created
  override onBeforeCreate({ binding }: BindingOnCreateOptions<MyBinding>) {
    // Return modified binding or undefined
    return binding
  }

  // Called after binding is created
  override onAfterCreate({ binding }: BindingOnCreateOptions<MyBinding>) {
    // Perform side effects
  }

  // Called before binding changes
  override onBeforeChange({ bindingBefore, bindingAfter }: BindingOnChangeOptions<MyBinding>) {
    return bindingAfter
  }

  // Called after binding changes
  override onAfterChange({ bindingBefore, bindingAfter }: BindingOnChangeOptions<MyBinding>) {
    // Perform side effects
  }

  // Called before binding is deleted
  override onBeforeDelete({ binding }: BindingOnDeleteOptions<MyBinding>) {
    // Can prevent deletion by returning false
  }

  // Called after binding is deleted
  override onAfterDelete({ binding }: BindingOnDeleteOptions<MyBinding>) {
    // Cleanup
  }
}
```

### Shape change callbacks

React to bound shapes moving:

```typescript
class MyBindingUtil extends BindingUtil<MyBinding> {
  // Called when the "from" shape changes
  override onAfterChangeFromShape({
    binding,
    shapeBefore,
    shapeAfter,
  }: BindingOnShapeChangeOptions<MyBinding>) {
    // Update based on from shape moving
  }

  // Called when the "to" shape changes
  override onAfterChangeToShape({
    binding,
    shapeBefore,
    shapeAfter,
  }: BindingOnShapeChangeOptions<MyBinding>) {
    // Update the "from" shape to follow the "to" shape
    const fromShape = this.editor.getShape(binding.fromId)
    if (!fromShape) return

    const toShape = shapeAfter
    const anchor = binding.props.anchor

    // Calculate new position
    const newX = toShape.x + toShape.props.w * anchor.x
    const newY = toShape.y + toShape.props.h * anchor.y

    this.editor.updateShape({
      id: fromShape.id,
      type: fromShape.type,
      x: newX,
      y: newY,
    })
  }
}
```

### Isolation callbacks

Handle shapes being separated (delete, copy, duplicate):

```typescript
class MyBindingUtil extends BindingUtil<MyBinding> {
  // Called when "from" shape is isolated (deleted/copied without binding)
  override onBeforeIsolateFromShape({
    binding,
    removedShape,
  }: BindingOnShapeIsolateOptions<MyBinding>) {
    // Update shape to maintain consistency after binding removed
  }

  // Called when "to" shape is isolated
  override onBeforeIsolateToShape({
    binding,
    removedShape,
  }: BindingOnShapeIsolateOptions<MyBinding>) {
    // E.g., for arrows: store the endpoint position before binding removed
    const fromShape = this.editor.getShape(binding.fromId)
    if (!fromShape) return

    // Update arrow to have explicit endpoint instead of binding
    this.editor.updateShape({
      id: fromShape.id,
      type: fromShape.type,
      props: {
        end: { type: 'point', x: removedShape.x, y: removedShape.y },
      },
    })
  }
}
```

### Delete callbacks

Handle bound shapes being deleted:

```typescript
class StickerBindingUtil extends BindingUtil<StickerBinding> {
  // Called when "to" shape is deleted - delete the sticker too
  override onBeforeDeleteToShape({
    binding,
    shape,
  }: BindingOnShapeDeleteOptions<StickerBinding>) {
    this.editor.deleteShape(binding.fromId)
  }
}
```

## Registering bindings

```typescript
import { Tldraw } from 'tldraw'

const bindingUtils = [StickerBindingUtil]

function App() {
  return <Tldraw bindingUtils={bindingUtils} />
}
```

## Creating bindings programmatically

```typescript
const editor = useEditor()

// Create a binding
editor.createBinding({
  id: createBindingId(),
  type: 'sticker',
  fromId: stickerShapeId,
  toId: targetShapeId,
  props: {
    anchor: { x: 0.5, y: 0.5 },
  },
})

// Delete bindings
editor.deleteBindings([bindingId])

// Get bindings for a shape
const bindings = editor.getBindingsFromShape(shapeId, 'sticker')
const bindingsTo = editor.getBindingsToShape(shapeId, 'sticker')
```

## Example: Sticker binding

Complete example of a sticker that attaches to shapes:

```typescript
import {
  BindingUtil,
  TLBaseBinding,
  RecordProps,
  T,
  createBindingId,
  createShapeId,
} from 'tldraw'

type StickerBinding = TLBaseBinding<'sticker', {
  anchor: { x: number; y: number }
}>

class StickerBindingUtil extends BindingUtil<StickerBinding> {
  static override type = 'sticker' as const

  static override props: RecordProps<StickerBinding> = {
    anchor: T.object({ x: T.number, y: T.number }),
  }

  override getDefaultProps() {
    return { anchor: { x: 0.5, y: 0.5 } }
  }

  // Move sticker when target shape moves
  override onAfterChangeToShape({
    binding,
    shapeAfter,
  }: BindingOnShapeChangeOptions<StickerBinding>) {
    const sticker = this.editor.getShape(binding.fromId)
    if (!sticker) return

    const bounds = this.editor.getShapeGeometry(shapeAfter).bounds
    const newX = shapeAfter.x + bounds.w * binding.props.anchor.x
    const newY = shapeAfter.y + bounds.h * binding.props.anchor.y

    this.editor.updateShape({
      id: sticker.id,
      type: sticker.type,
      x: newX - 25, // Center the sticker
      y: newY - 25,
    })
  }

  // Delete sticker when target is deleted
  override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<StickerBinding>) {
    this.editor.deleteShape(binding.fromId)
  }
}

// Usage: Attach sticker to a shape
function attachSticker(editor: Editor, stickerId: TLShapeId, targetId: TLShapeId) {
  const target = editor.getShape(targetId)
  if (!target) return

  const bounds = editor.getShapeGeometry(target).bounds

  editor.createBinding({
    id: createBindingId(),
    type: 'sticker',
    fromId: stickerId,
    toId: targetId,
    props: {
      anchor: { x: 0.5, y: 0 }, // Top center
    },
  })
}
```

## Key files

- packages/editor/src/lib/editor/bindings/BindingUtil.ts - Base class
- packages/tldraw/src/lib/bindings/arrow/ArrowBindingUtil.ts - Arrow example

## Related

- [Bindings architecture](../architecture/bindings.md) - System overview
- [Custom shapes](./custom-shapes.md) - Creating shapes
- [Editor API](../packages/editor.md) - Binding methods
