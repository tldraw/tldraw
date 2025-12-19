---
title: Custom shapes
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - custom
  - shapes
  - shapeutil
  - tutorial
  - guide
---

This guide explains how to create custom shapes in tldraw. You'll learn to define shape types, implement ShapeUtil classes, and register them with the editor.

## Overview

Creating a custom shape involves three steps:

1. Define the shape type (TypeScript interface)
2. Implement a ShapeUtil class
3. Register the shape with the editor

## Defining a shape type

Every shape starts with a type definition:

```typescript
import { TLBaseShape, TLDefaultColorStyle } from '@tldraw/tldraw'

type CardShape = TLBaseShape<
	'card',
	{
		w: number
		h: number
		color: TLDefaultColorStyle
		title: string
		description: string
	}
>
```

The `TLBaseShape` generic takes:

- A unique type name (`'card'`)
- An object type for shape-specific props

## Implementing ShapeUtil

The `ShapeUtil` class defines how your shape behaves:

```typescript
import { ShapeUtil, Rectangle2d, HTMLContainer } from '@tldraw/tldraw'

class CardShapeUtil extends ShapeUtil<CardShape> {
  static override type = 'card' as const

  // Default properties for new shapes
  getDefaultProps(): CardShape['props'] {
    return {
      w: 200,
      h: 150,
      color: 'black',
      title: 'Card',
      description: '',
    }
  }

  // Geometry for hit testing and bounds
  getGeometry(shape: CardShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  // Visual rendering
  component(shape: CardShape) {
    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            backgroundColor: 'white',
            border: `2px solid ${shape.props.color}`,
            borderRadius: 8,
            padding: 12,
          }}
        >
          <h3>{shape.props.title}</h3>
          <p>{shape.props.description}</p>
        </div>
      </HTMLContainer>
    )
  }

  // Selection indicator
  indicator(shape: CardShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={8}
        ry={8}
      />
    )
  }
}
```

## Registering the shape

Pass your shape util to the Tldraw component:

```typescript
import { Tldraw } from '@tldraw/tldraw'

const customShapeUtils = [CardShapeUtil]

function App() {
  return <Tldraw shapeUtils={customShapeUtils} />
}
```

## Required methods

Every ShapeUtil must implement these methods:

### getDefaultProps()

Returns default property values for new shapes:

```typescript
getDefaultProps(): CardShape['props'] {
  return {
    w: 200,
    h: 150,
    color: 'black',
    title: 'Card',
    description: '',
  }
}
```

### getGeometry(shape)

Returns geometry for hit testing and bounds:

```typescript
getGeometry(shape: CardShape) {
  return new Rectangle2d({
    width: shape.props.w,
    height: shape.props.h,
    isFilled: true,
  })
}
```

Available geometry classes:

- `Rectangle2d` - Rectangles
- `Ellipse2d` - Circles and ellipses
- `Polygon2d` - Arbitrary polygons
- `Polyline2d` - Open paths
- `Group2d` - Groups of geometries

### component(shape)

React component for rendering:

```typescript
component(shape: CardShape) {
  return (
    <HTMLContainer>
      {/* Your shape UI */}
    </HTMLContainer>
  )
}
```

### indicator(shape)

SVG element shown when shape is selected:

```typescript
indicator(shape: CardShape) {
  return (
    <rect
      width={shape.props.w}
      height={shape.props.h}
    />
  )
}
```

## Optional methods

### canResize(shape)

Whether the shape can be resized:

```typescript
canResize(shape: CardShape) {
  return true // default
}
```

### canEdit(shape)

Whether double-click enables edit mode:

```typescript
canEdit(shape: CardShape) {
  return true
}
```

### onResize(shape, info)

Handle resize interactions:

```typescript
onResize(shape: CardShape, info: TLResizeInfo<CardShape>) {
  return {
    props: {
      w: Math.max(100, info.initialBounds.width * info.scaleX),
      h: Math.max(75, info.initialBounds.height * info.scaleY),
    },
  }
}
```

### onDoubleClick(shape)

Handle double-click:

```typescript
onDoubleClick(shape: CardShape) {
  // Enter edit mode, etc.
}
```

### onEditEnd(shape)

Called when editing ends:

```typescript
onEditEnd(shape: CardShape) {
  // Save changes, etc.
}
```

## Using styles

Use built-in style props for consistency:

```typescript
import { DefaultColorStyle, DefaultSizeStyle, StyleProp } from '@tldraw/tldraw'

class StyledShapeUtil extends ShapeUtil<MyShape> {
	static override props = {
		w: T.number,
		h: T.number,
		color: DefaultColorStyle,
		size: DefaultSizeStyle,
	}
}
```

## Creating shapes programmatically

```typescript
const editor = useEditor()

editor.createShape({
	type: 'card',
	x: 100,
	y: 100,
	props: {
		title: 'My Card',
		description: 'A custom shape',
	},
})
```

## Adding a tool

To let users create shapes via toolbar:

```typescript
import { StateNode, createShapeId } from '@tldraw/tldraw'

class CardTool extends StateNode {
  static override id = 'card'

  override onPointerDown(info: TLPointerEventInfo) {
    const { currentPagePoint } = this.editor.inputs

    this.editor.createShape({
      id: createShapeId(),
      type: 'card',
      x: currentPagePoint.x,
      y: currentPagePoint.y,
    })
  }
}

// Register the tool
const customTools = [CardTool]

<Tldraw
  shapeUtils={customShapeUtils}
  tools={customTools}
/>
```

## Example: Sticky note shape

```typescript
import { ShapeUtil, Rectangle2d, HTMLContainer, T } from '@tldraw/tldraw'

type StickyShape = TLBaseShape<'sticky', {
  w: number
  h: number
  color: string
  text: string
}>

class StickyShapeUtil extends ShapeUtil<StickyShape> {
  static override type = 'sticky' as const

  static override props = {
    w: T.number,
    h: T.number,
    color: T.string,
    text: T.string,
  }

  getDefaultProps() {
    return {
      w: 200,
      h: 200,
      color: '#ffeb3b',
      text: '',
    }
  }

  getGeometry(shape: StickyShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  canEdit() {
    return true
  }

  component(shape: StickyShape) {
    const isEditing = this.editor.getEditingShapeId() === shape.id

    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            backgroundColor: shape.props.color,
            padding: 16,
            boxShadow: '2px 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {isEditing ? (
            <textarea
              value={shape.props.text}
              onChange={(e) => {
                this.editor.updateShape({
                  id: shape.id,
                  type: 'sticky',
                  props: { text: e.target.value },
                })
              }}
              style={{ width: '100%', height: '100%' }}
              autoFocus
            />
          ) : (
            <p>{shape.props.text || 'Double-click to edit'}</p>
          )}
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: StickyShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
```

## Key files

- packages/editor/src/lib/editor/shapes/ShapeUtil.ts - Base class
- packages/editor/src/lib/primitives/geometry/ - Geometry classes
- packages/tldraw/src/lib/shapes/ - Built-in shapes

## Related

- [Shape system](../architecture/shape-system.md) - Architecture overview
- [Custom tools](./custom-tools.md) - Creating tools
- [Style system](../architecture/style-system.md) - Using styles
