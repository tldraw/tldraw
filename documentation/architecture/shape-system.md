---
title: Shape system
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - shapes
  - shapeutil
  - geometry
  - rendering
  - architecture
---

The shape system is tldraw's core extension mechanism. A shape is a typed record defined in `@tldraw/tlschema`, rendered and interacted with via a `ShapeUtil` in `@tldraw/editor`, and hit-tested using `Geometry2d` classes. This separation keeps data, rendering, and geometry decoupled while still working together.

## Key components

### Shape definitions

Shape records extend `TLBaseShape` and declare their props and styles:

```typescript
import { TLBaseShape, TLDefaultColorStyle } from '@tldraw/tlschema'

type MyShape = TLBaseShape<
	'myShape',
	{
		w: number
		h: number
		color: TLDefaultColorStyle
	}
>
```

### ShapeUtil

A `ShapeUtil` defines default props, geometry, rendering, and interaction behavior. At minimum, it supplies default props, geometry, a React component, and a selection indicator:

```typescript
class MyShapeUtil extends ShapeUtil<MyShape> {
	static override type = 'myShape' as const
	static override props = myShapeProps

	getDefaultProps(): MyShape['props'] {
		return { w: 100, h: 100, color: 'black' }
	}

	getGeometry(shape: MyShape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}

	component(shape: MyShape) {
		return <div style={{ width: shape.props.w, height: shape.props.h }} />
	}

	indicator(shape: MyShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}
```

Shape utilities can also implement optional capability methods (resize, edit, bind), interaction hooks (resize, rotate, drag), and export methods (SVG).

### Geometry2d

`Geometry2d` classes represent mathematical shapes used for hit testing, bounds, snapping, and collision detection. Common implementations include rectangles, circles, polygons, polylines, and grouped geometry.

## Data flow

1. A tool or the Editor creates a shape with default props.
2. The record is validated and stored in the Store.
3. The ShapeUtil renders the component and indicator.
4. Geometry is computed for hit testing, snapping, and selection bounds.
5. Interaction events drive ShapeUtil hooks to update the record.

## Extension points

- Define custom shapes in `@tldraw/tlschema` with validators and migrations.
- Implement a `ShapeUtil` for rendering and interaction behavior.
- Add custom styles and export logic.
- Use bindings to connect shapes in the binding system.

## Key files

- packages/editor/src/lib/editor/shapes/ShapeUtil.ts - ShapeUtil base class
- packages/editor/src/lib/editor/shapes/BaseBoxShapeUtil.ts - Base box behavior
- packages/editor/src/lib/editor/shapes/geometry/Geometry2d.ts - Geometry base class
- packages/tlschema/src/shapes/TLBaseShape.ts - Base shape type definition
- packages/tldraw/src/lib/shapes/ - Default shape implementations

## Related

- [Binding system](./binding-system.md) - Relationships between shapes
- [Tool system](./tool-system.md) - Tools that create and edit shapes
- [Style system](./style-system.md) - Shared style props used by shapes
