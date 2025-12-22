---
title: Custom shapes
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - custom
  - shapes
  - shapeutil
  - tutorial
  - guide
status: published
date: 12/19/2025
order: 1
---

This guide shows how to add a custom shape to tldraw by defining a shape type, implementing a `ShapeUtil`, and registering it with the editor.

## Prerequisites

- A tldraw app using `@tldraw/tldraw` or `@tldraw/editor`
- Familiarity with React and TypeScript

## Steps

### 1. Define the shape type

```typescript
import { TLBaseShape, TLDefaultColorStyle } from 'tldraw'

type CardShape = TLBaseShape<
	'card',
	{
		w: number
		h: number
		color: TLDefaultColorStyle
		title: string
	}
>
```

### 2. Implement a ShapeUtil

```typescript
import { ShapeUtil, Rectangle2d, HTMLContainer } from 'tldraw'

class CardShapeUtil extends ShapeUtil<CardShape> {
	static override type = 'card' as const

	getDefaultProps(): CardShape['props'] {
		return { w: 200, h: 120, color: 'black', title: 'Card' }
	}

	getGeometry(shape: CardShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	component(shape: CardShape) {
		return (
			<HTMLContainer>
				<div style={{ width: shape.props.w, height: shape.props.h }}>
					{shape.props.title}
				</div>
			</HTMLContainer>
		)
	}

	indicator(shape: CardShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}
```

### 3. Register the shape

```tsx
import { Tldraw } from 'tldraw'

function App() {
	return <Tldraw shapeUtils={[CardShapeUtil]} />
}
```

## Next steps

- Add migrations if you plan to evolve props.
- Provide custom styles if your shape needs shared style props.

## Key files

- packages/editor/src/lib/editor/shapes/ShapeUtil.ts - Shape utility base class
- packages/tlschema/src/shapes/TLBaseShape.ts - Base shape type

## Related

- [Shape system](../architecture/shape-system.md)
- [Custom tools](./custom-tools.md)
- [Custom bindings](./custom-bindings.md)
