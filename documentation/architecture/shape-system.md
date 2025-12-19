---
title: Shape system
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - shapes
  - shapeutil
  - geometry
  - rendering
  - architecture
---

The shape system is the core extension mechanism in tldraw. It defines how shapes behave, render, and interact on the canvas. Every shape type in tldraw—from simple rectangles to complex arrows—is powered by this system.

## Overview

The shape system consists of three main components:

1. **Shape definitions** - TypeScript interfaces that define a shape's data structure (from `@tldraw/tlschema`)
2. **ShapeUtil classes** - Classes that define a shape's behavior, rendering, and interactions (from `@tldraw/editor`)
3. **Geometry2d classes** - Mathematical representations used for hit testing, bounds, and collisions (from `@tldraw/editor`)

This separation allows shapes to have:

- Type-safe data structures with validation
- Custom rendering logic (HTML, SVG, or both)
- Precise geometric calculations for interactions
- Migration paths for schema evolution

## Shape definitions

Every shape starts with a type definition that extends `TLBaseShape`:

```typescript
import { TLBaseShape, TLDefaultColorStyle } from '@tldraw/tlschema'

type MyShape = TLBaseShape<
	'myShape',
	{
		w: number
		h: number
		color: TLDefaultColorStyle
		text: string
	}
>
```

The base shape provides standard properties that all shapes inherit:

| Property   | Type            | Purpose                   |
| ---------- | --------------- | ------------------------- |
| `id`       | `TLShapeId`     | Unique identifier         |
| `type`     | `string`        | Shape type name           |
| `x`        | `number`        | X position on page        |
| `y`        | `number`        | Y position on page        |
| `rotation` | `number`        | Rotation in radians       |
| `index`    | `IndexKey`      | Z-order position          |
| `parentId` | `TLParentId`    | Parent page or shape      |
| `isLocked` | `boolean`       | Whether shape is locked   |
| `opacity`  | `TLOpacityType` | Shape opacity (0-1)       |
| `meta`     | `JsonObject`    | User-defined metadata     |
| `props`    | `object`        | Shape-specific properties |

Shape props can include:

- **Style properties** - Shared across shapes (color, size, font, etc.)
- **Regular properties** - Shape-specific (width, height, text, etc.)
- **Complex properties** - Validated structures (rich text, URLs, etc.)

Props are validated at runtime using the `@tldraw/validate` library and can include migration sequences for schema evolution.

## The ShapeUtil class

The `ShapeUtil` class is an abstract base class that defines how shapes behave. Each shape type requires a corresponding ShapeUtil implementation.

### Required methods

Every ShapeUtil must implement these four methods:

#### getDefaultProps()

Returns the default property values for new shapes:

```typescript
getDefaultProps(): MyShape['props'] {
  return {
    w: 100,
    h: 100,
    color: 'black',
    text: '',
  }
}
```

#### getGeometry(shape)

Returns a `Geometry2d` object that represents the shape's mathematical form. This is used for hit testing, bounds calculation, and collision detection:

```typescript
getGeometry(shape: MyShape) {
  return new Rectangle2d({
    width: shape.props.w,
    height: shape.props.h,
    isFilled: true,
  })
}
```

Available geometry classes include:

- `Rectangle2d` - Axis-aligned rectangles
- `Circle2d` - Circles
- `Ellipse2d` - Ellipses
- `Polygon2d` - Custom polygons
- `Polyline2d` - Multi-point lines
- `Group2d` - Composite geometries
- `Edge2d` - Single line segments
- `Stadium2d` - Rounded rectangles

#### component(shape)

Returns a React component that renders the shape's visual appearance. This can return any React element, typically wrapped in `HTMLContainer` or `SVGContainer`:

```typescript
component(shape: MyShape) {
  return (
    <HTMLContainer>
      <div
        style={{
          width: shape.props.w,
          height: shape.props.h,
          backgroundColor: shape.props.color,
        }}
      >
        {shape.props.text}
      </div>
    </HTMLContainer>
  )
}
```

Components can use:

- **HTMLContainer** - For HTML-based rendering (text, inputs, etc.)
- **SVGContainer** - For SVG-based rendering (shapes, paths, etc.)
- **Both** - Mix HTML and SVG (common for shapes with text labels)

#### indicator(shape)

Returns an SVG element that shows the shape's selection outline. This is always rendered as SVG and should match the shape's visual bounds:

```typescript
indicator(shape: MyShape) {
  return (
    <rect
      width={shape.props.w}
      height={shape.props.h}
      fill="none"
      stroke="currentColor"
    />
  )
}
```

The indicator receives its color and stroke width from the editor's theme and selection state.

### Capability methods

These methods define what interactions a shape supports:

#### canEdit(shape, info)

Controls whether a shape can enter edit mode (typically for text editing):

```typescript
canEdit(shape: MyShape, info: TLEditStartInfo): boolean {
  return true // Allow double-click to edit
}
```

The `info` parameter provides context about how editing was initiated:

- `'press_enter'` - User pressed Enter key
- `'click'` - Single click
- `'double-click'` - Double click on shape
- `'double-click-edge'` - Double click on edge
- `'double-click-corner'` - Double click on corner
- `'click-header'` - Click on frame header
- `'unknown'` - Other trigger

#### canResize(shape)

Controls whether resize handles appear:

```typescript
canResize(shape: MyShape): boolean {
  return true // Show resize handles
}
```

#### canBind(opts)

Controls whether other shapes can create bindings (like arrows) to this shape:

```typescript
canBind(opts: TLShapeUtilCanBindOpts): boolean {
  // Only allow arrow bindings
  return opts.bindingType === 'arrow'
}
```

#### canCrop(shape)

Controls whether the shape supports cropping:

```typescript
canCrop(shape: MyShape): boolean {
  return false // Most shapes don't support cropping
}
```

#### Other capability methods

- `canScroll(shape)` - Whether shape can scroll while editing
- `canBeLaidOut(shape, info)` - Whether shape participates in layout operations
- `canReceiveNewChildrenOfType(shape, type)` - Whether shape accepts child shapes
- `canResizeChildren(shape)` - Whether resizing affects children
- `canEditInReadonly(shape)` - Whether shape can be edited in read-only mode
- `canEditWhileLocked(shape)` - Whether shape can be edited when locked
- `canSnap(shape)` - Whether other shapes can snap to this one
- `canTabTo(shape)` - Whether shape can be tabbed to
- `canCull(shape)` - Whether shape can be culled when off-screen

### Visual behavior methods

#### hideResizeHandles(shape)

Hides resize handles even when shape is selected:

```typescript
hideResizeHandles(shape: MyShape): boolean {
  return false
}
```

#### hideRotateHandle(shape)

Hides the rotation handle:

```typescript
hideRotateHandle(shape: MyShape): boolean {
  return false
}
```

#### hideSelectionBoundsBg(shape) / hideSelectionBoundsFg(shape)

Hides parts of the selection box:

```typescript
hideSelectionBoundsBg(shape: MyShape): boolean {
  return false // Show selection background
}
```

#### isAspectRatioLocked(shape)

Locks the aspect ratio during resize:

```typescript
isAspectRatioLocked(shape: MyShape): boolean {
  return true // Maintain aspect ratio
}
```

#### expandSelectionOutlinePx(shape)

Expands the selection outline by a number of pixels:

```typescript
expandSelectionOutlinePx(shape: MyShape): number {
  return 4 // Expand by 4 pixels
}
```

### Export and rendering methods

#### toSvg(shape, ctx)

Generates an SVG representation for export. Can return a Promise for async operations:

```typescript
toSvg(shape: MyShape, ctx: SvgExportContext): ReactElement {
  return (
    <rect
      width={shape.props.w}
      height={shape.props.h}
      fill={shape.props.color}
    />
  )
}
```

The `SvgExportContext` provides:

- `addExportDef(def)` - Add SVG definitions (gradients, patterns, etc.)
- Access to theme colors for export
- Asset resolution utilities

#### toBackgroundSvg(shape, ctx)

Generates SVG for the shape's background layer (rendered behind other shapes):

```typescript
toBackgroundSvg(shape: MyShape, ctx: SvgExportContext): ReactElement | null {
  return null // Most shapes don't have backgrounds
}
```

#### backgroundComponent(shape)

Renders an HTML background component (rendered behind all shapes on canvas):

```typescript
backgroundComponent(shape: MyShape): ReactElement {
  return <div className="my-background" />
}
```

#### getCanvasSvgDefs()

Provides SVG definitions that can be referenced by the shape's component:

```typescript
getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[] {
  return [
    {
      key: 'my-pattern',
      component: MyPatternDef,
    },
  ]
}
```

### Interaction event handlers

ShapeUtil provides lifecycle hooks for various interactions:

#### Resize events

```typescript
onResizeStart(shape: MyShape): TLShapePartial<MyShape> | void {
  // Called when resize begins
}

onResize(shape: MyShape, info: TLResizeInfo<MyShape>) {
  // Called during resize
  return {
    props: {
      w: info.initialShape.props.w * info.scaleX,
      h: info.initialShape.props.h * info.scaleY,
    },
  }
}

onResizeEnd(initial: MyShape, current: MyShape): TLShapePartial<MyShape> | void {
  // Called when resize completes
}

onResizeCancel(initial: MyShape, current: MyShape): void {
  // Called when resize is cancelled
}
```

The `TLResizeInfo` object contains:

- `newPoint` - New position after resize
- `handle` - Which handle is being dragged
- `mode` - Either `'scale_shape'` or `'resize_bounds'`
- `scaleX` / `scaleY` - Scale factors
- `initialBounds` - Original bounds
- `initialShape` - Shape at resize start

#### Rotation events

```typescript
onRotateStart(shape: MyShape): TLShapePartial<MyShape> | void {
  // Called when rotation begins
}

onRotate(initial: MyShape, current: MyShape): TLShapePartial<MyShape> | void {
  // Called during rotation
}

onRotateEnd(initial: MyShape, current: MyShape): TLShapePartial<MyShape> | void {
  // Called when rotation completes
}

onRotateCancel(initial: MyShape, current: MyShape): void {
  // Called when rotation is cancelled
}
```

#### Translation events

```typescript
onTranslateStart(shape: MyShape): TLShapePartial<MyShape> | void {
  // Called when move begins
}

onTranslate(initial: MyShape, current: MyShape): TLShapePartial<MyShape> | void {
  // Called during move
}

onTranslateEnd(initial: MyShape, current: MyShape): TLShapePartial<MyShape> | void {
  // Called when move completes
}

onTranslateCancel(initial: MyShape, current: MyShape): void {
  // Called when move is cancelled
}
```

#### Handle drag events

For shapes with custom handles (like arrows):

```typescript
onHandleDragStart(shape: MyShape, info: TLHandleDragInfo<MyShape>) {
  // Called when handle drag begins
}

onHandleDrag(shape: MyShape, info: TLHandleDragInfo<MyShape>) {
  // Called during handle drag
  return {
    props: {
      // Update shape based on handle position
    },
  }
}

onHandleDragEnd(shape: MyShape, info: TLHandleDragInfo<MyShape>) {
  // Called when handle drag completes
}

onHandleDragCancel(shape: MyShape, info: TLHandleDragInfo<MyShape>) {
  // Called when handle drag is cancelled
}
```

#### Click and edit events

```typescript
onClick(shape: MyShape): TLShapePartial<MyShape> | void {
  // Called on single click
}

onDoubleClick(shape: MyShape): TLShapePartial<MyShape> | void {
  // Called on double click
}

onDoubleClickEdge(shape: MyShape, info: TLClickEventInfo) {
  // Called on double click on edge
}

onDoubleClickCorner(shape: MyShape, info: TLClickEventInfo) {
  // Called on double click on corner
}

onDoubleClickHandle(shape: MyShape, handle: TLHandle) {
  // Called on double click on handle
}

onEditStart(shape: MyShape): void {
  // Called when edit mode begins
}

onEditEnd(shape: MyShape): void {
  // Called when edit mode ends
}
```

#### Drag and drop events

For shapes that can contain other shapes:

```typescript
onDragShapesIn(shape: MyShape, shapes: TLShape[], info: TLDragShapesInInfo): void {
  // Called when shapes are first dragged over this shape
}

onDragShapesOver(shape: MyShape, shapes: TLShape[], info: TLDragShapesOverInfo): void {
  // Called continuously while shapes are dragged over
  // Common use: reparent shapes
  this.editor.reparentShapes(shapes.map(s => s.id), shape.id)
}

onDragShapesOut(shape: MyShape, shapes: TLShape[], info: TLDragShapesOutInfo): void {
  // Called when shapes are dragged out
}

onDropShapesOver(shape: MyShape, shapes: TLShape[], info: TLDropShapesOverInfo): void {
  // Called when shapes are dropped
}
```

#### Lifecycle events

```typescript
onBeforeCreate(next: MyShape): MyShape | void {
  // Called just before shape is created
  // Last chance to modify the shape
  return {
    ...next,
    props: {
      ...next.props,
      // Modify props
    },
  }
}

onBeforeUpdate(prev: MyShape, next: MyShape): MyShape | void {
  // Called just before shape is updated
  // Last chance to modify the update
}

onChildrenChange(shape: MyShape): TLShapePartial[] | void {
  // Called when shape's children change
  // Return updates to apply
}
```

### Snapping geometry

Control how other shapes snap to this shape:

#### getBoundsSnapGeometry(shape)

Defines snap points and lines for bounds-based snapping:

```typescript
getBoundsSnapGeometry(shape: MyShape): BoundsSnapGeometry {
  return {
    points: this.getGeometry(shape).bounds.cornersAndCenter,
  }
}
```

#### getHandleSnapGeometry(shape)

Defines snap points for handle-based snapping:

```typescript
getHandleSnapGeometry(shape: MyShape): HandleSnapGeometry {
  const geometry = this.getGeometry(shape)
  return {
    points: geometry.bounds.cornersAndCenter,
    outline: geometry,
  }
}
```

### Advanced methods

#### getHandles(shape)

Returns custom handles for the shape:

```typescript
getHandles(shape: MyShape): TLHandle[] {
  return [
    {
      id: 'start',
      type: 'vertex',
      index: 'a1',
      x: 0,
      y: 0,
    },
    {
      id: 'end',
      type: 'vertex',
      index: 'a2',
      x: shape.props.w,
      y: shape.props.h,
    },
  ]
}
```

Handle types:

- `'vertex'` - Movable point
- `'virtual'` - Helper point (not draggable)
- `'create'` - Used during creation

#### getInterpolatedProps(startShape, endShape, t)

Interpolates between two shape states for animations:

```typescript
getInterpolatedProps(
  startShape: MyShape,
  endShape: MyShape,
  t: number
): MyShape['props'] {
  return {
    ...endShape.props,
    w: lerp(startShape.props.w, endShape.props.w, t),
    h: lerp(startShape.props.h, endShape.props.h, t),
  }
}
```

#### getText(shape)

Extracts text content for search and accessibility:

```typescript
getText(shape: MyShape): string | undefined {
  return shape.props.text
}
```

#### getAriaDescriptor(shape)

Provides accessibility description:

```typescript
getAriaDescriptor(shape: MyShape): string | undefined {
  return `${shape.type} shape with text: ${shape.props.text}`
}
```

#### getFontFaces(shape)

Returns font faces needed for rendering:

```typescript
getFontFaces(shape: MyShape): TLFontFace[] {
  return [
    {
      family: 'MyFont',
      url: '/fonts/myfont.woff2',
    },
  ]
}
```

## The geometry system

The geometry system provides mathematical representations of shapes for hit testing, bounds calculation, and collision detection.

### Geometry2d base class

All geometry classes extend `Geometry2d` and provide:

#### Core properties

- `isFilled` - Whether the geometry represents a filled area
- `isClosed` - Whether the geometry forms a closed loop
- `vertices` - Array of points defining the geometry
- `bounds` - Axis-aligned bounding box
- `center` - Center point of bounds
- `area` - Total area (for closed geometries)
- `length` - Perimeter length

#### Hit testing methods

```typescript
// Check if point is within margin distance
hitTestPoint(point: VecLike, margin: number, hitInside: boolean): boolean

// Get distance from point (negative if inside filled geometry)
distanceToPoint(point: VecLike, hitInside: boolean): number

// Check if line segment intersects or is within distance
hitTestLineSegment(A: VecLike, B: VecLike, distance: number): boolean
```

#### Intersection methods

```typescript
// Get intersection points with line segment
intersectLineSegment(A: VecLike, B: VecLike): VecLike[]

// Get intersection points with circle
intersectCircle(center: VecLike, radius: number): VecLike[]

// Get intersection points with polygon
intersectPolygon(polygon: VecLike[]): VecLike[]

// Get intersection points with polyline
intersectPolyline(polyline: VecLike[]): VecLike[]
```

#### Edge interpolation

```typescript
// Get point at position t (0-1) along the edge
interpolateAlongEdge(t: number): Vec

// Get position t (0-1) of nearest point on edge
uninterpolateAlongEdge(point: VecLike): number
```

#### Other methods

```typescript
// Get nearest point on geometry to target point
nearestPoint(point: VecLike): Vec

// Check if geometry overlaps polygon
overlapsPolygon(polygon: VecLike[]): boolean

// Apply matrix transformation
transform(matrix: MatModel): Geometry2d
```

### Common geometry types

#### Rectangle2d

Axis-aligned rectangles:

```typescript
new Rectangle2d({
	x: 0, // Optional x offset
	y: 0, // Optional y offset
	width: 100,
	height: 50,
	isFilled: true,
})
```

#### Circle2d

Perfect circles:

```typescript
new Circle2d({
	x: 50, // Center x
	y: 50, // Center y
	radius: 25,
	isFilled: true,
})
```

#### Ellipse2d

Ellipses:

```typescript
new Ellipse2d({
	width: 100,
	height: 50,
	isFilled: true,
})
```

#### Polygon2d

Custom closed polygons:

```typescript
new Polygon2d({
	points: [
		{ x: 0, y: 0 },
		{ x: 100, y: 0 },
		{ x: 100, y: 100 },
		{ x: 0, y: 100 },
	],
	isFilled: true,
})
```

#### Polyline2d

Multi-point lines (not closed):

```typescript
new Polyline2d({
	points: [
		{ x: 0, y: 0 },
		{ x: 50, y: 50 },
		{ x: 100, y: 0 },
	],
})
```

#### Stadium2d

Rounded rectangles (pill shapes):

```typescript
new Stadium2d({
	width: 100,
	height: 50,
	isFilled: true,
})
```

#### Group2d

Composite geometry from multiple geometries:

```typescript
new Group2d({
	children: [
		new Rectangle2d({ width: 100, height: 100, isFilled: true }),
		new Rectangle2d({
			x: 10,
			y: 10,
			width: 80,
			height: 20,
			isFilled: true,
			isLabel: true, // Mark as label area
		}),
	],
})
```

Group2d is useful for shapes with multiple hit test regions, like shapes with text labels.

#### Edge2d

Single line segment:

```typescript
new Edge2d({
	start: { x: 0, y: 0 },
	end: { x: 100, y: 100 },
})
```

### Geometry options

All geometries accept these optional flags:

```typescript
{
  isLabel: false,              // Whether geometry represents a text label
  isEmptyLabel: false,         // Whether label is empty
  isInternal: false,           // Whether geometry is internal structure
  excludeFromShapeBounds: false, // Exclude from bounds calculation
  debugColor: 'red',           // Debug visualization color
  ignore: false,               // Ignore in hit testing
}
```

These flags control:

- Hit testing behavior
- Bounds calculation
- Visual debugging
- Label-specific logic

## Creating custom shapes

Here's a complete walkthrough for creating a custom shape:

### Step 1: Define the shape type

Create the TypeScript interface in your schema:

```typescript
import { TLBaseShape, TLDefaultColorStyle } from '@tldraw/tlschema'

export type MyShape = TLBaseShape<
	'myShape',
	{
		w: number
		h: number
		color: TLDefaultColorStyle
		text: string
	}
>
```

### Step 2: Define props and validation

Create the props validation object:

```typescript
import { T, DefaultColorStyle } from '@tldraw/tlschema'

export const myShapeProps = {
	w: T.number,
	h: T.number,
	color: DefaultColorStyle,
	text: T.string,
}
```

### Step 3: Add migrations

Define the migration sequence:

```typescript
import { createShapePropsMigrationSequence } from '@tldraw/tlschema'

export const myShapeMigrations = createShapePropsMigrationSequence({
	sequence: [
		// Migrations go here as schema evolves
	],
})
```

### Step 4: Create the ShapeUtil

Implement the shape utility:

```typescript
import { ShapeUtil, Rectangle2d, HTMLContainer } from '@tldraw/editor'

export class MyShapeUtil extends ShapeUtil<MyShape> {
  static override type = 'myShape' as const
  static override props = myShapeProps
  static override migrations = myShapeMigrations

  getDefaultProps(): MyShape['props'] {
    return {
      w: 100,
      h: 100,
      color: 'black',
      text: '',
    }
  }

  getGeometry(shape: MyShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  component(shape: MyShape) {
    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            backgroundColor: shape.props.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {shape.props.text}
        </div>
      </HTMLContainer>
    )
  }

  indicator(shape: MyShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
```

### Step 5: Add editing support

Enable text editing:

```typescript
export class MyShapeUtil extends ShapeUtil<MyShape> {
  // ... previous methods ...

  override canEdit() {
    return true
  }

  override getText(shape: MyShape) {
    return shape.props.text
  }

  component(shape: MyShape) {
    const isEditing = useValue(
      'isEditing',
      () => this.editor.getEditingShapeId() === shape.id,
      [this.editor]
    )

    return (
      <HTMLContainer>
        <div style={{ /* ... */ }}>
          {isEditing ? (
            <input
              value={shape.props.text}
              onChange={(e) => {
                this.editor.updateShape({
                  id: shape.id,
                  type: 'myShape',
                  props: { text: e.target.value },
                })
              }}
              autoFocus
            />
          ) : (
            shape.props.text
          )}
        </div>
      </HTMLContainer>
    )
  }
}
```

### Step 6: Add resize support

Make the shape resizable:

```typescript
export class MyShapeUtil extends ShapeUtil<MyShape> {
	// ... previous methods ...

	override canResize() {
		return true
	}

	override onResize(shape: MyShape, info: TLResizeInfo<MyShape>) {
		return {
			props: {
				w: Math.max(1, info.initialShape.props.w * info.scaleX),
				h: Math.max(1, info.initialShape.props.h * info.scaleY),
			},
		}
	}
}
```

### Step 7: Register the shape

Add the shape to the editor:

```typescript
import { Tldraw } from '@tldraw/tldraw'
import { MyShapeUtil } from './MyShapeUtil'

function App() {
  return (
    <Tldraw
      shapeUtils={[MyShapeUtil]}
    />
  )
}
```

### Step 8: Add SVG export

Enable SVG export:

```typescript
export class MyShapeUtil extends ShapeUtil<MyShape> {
  // ... previous methods ...

  override toSvg(shape: MyShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        fill={shape.props.color}
      />
    )
  }
}
```

## Default shapes overview

The `@tldraw/tldraw` package includes a comprehensive set of default shapes:

### Basic shapes

**Geo shapes** - Geometric primitives with text labels:

- Rectangle, ellipse, triangle, diamond, pentagon, hexagon, octagon
- Star, rhombus, trapezoid, cloud, heart
- Arrow variants (up, down, left, right)
- Checkbox and X-box
- All support rich text labels, fills, and various styles

**Text** - Rich text with formatting:

- Multiple font families (draw, sans, serif, mono)
- Text alignment and sizing
- Auto-sizing and fixed-width modes
- Inline styles (bold, italic, links)

**Note** - Sticky note shapes:

- Colored backgrounds
- Auto-sizing text
- Fixed aspect ratio

**Frame** - Container shapes:

- Can contain other shapes
- Clipping support
- Named frames with headers
- Export boundary control

**Group** - Shape grouping:

- Logical grouping without visual container
- Maintains relative positions
- Supports nested groups

### Drawing shapes

**Draw** - Freehand drawing:

- Pressure-sensitive strokes
- Stroke smoothing and simplification
- Multiple dash styles
- Variable size and color

**Highlight** - Highlighter tool:

- Semi-transparent strokes
- Optimized for annotation
- Appears behind other content

**Line** - Multi-point lines:

- Straight line segments
- Multiple control points
- Various stroke styles
- Handles for point manipulation

### Complex shapes

**Arrow** - Smart arrows with bindings:

- Automatic binding to shapes
- Start and end decorations (arrow, dot, diamond, bar)
- Label support
- Intelligent routing
- Updates when connected shapes move

**Embed** - Embedded web content:

- YouTube, Figma, Google Maps, etc.
- Live preview support
- Configurable dimensions
- URL validation

**Bookmark** - Web page bookmarks:

- Automatic metadata fetching (title, description, favicon)
- Preview images
- Link opening
- Fallback states

**Image** - Raster images:

- PNG, JPEG, GIF, WebP support
- Cropping support
- Aspect ratio preservation
- Asset management integration

**Video** - Video playback:

- MP4, WebM support
- Playback controls
- Thumbnail generation
- Asset management integration

### Shape inheritance

Many shapes extend base utilities:

**BaseBoxShapeUtil** - For rectangular shapes:

- Provides default geometry (Rectangle2d)
- Standard resize behavior
- Common handle snapping
- Interpolation support

Used by: Geo, Text, Note, Video, Image, Bookmark, Embed

This inheritance reduces code duplication and ensures consistent behavior across similar shapes.

## Performance considerations

### Geometry caching

Geometry calculations are automatically cached by the `Geometry2d` class. The cache is invalidated when shape props change:

```typescript
getGeometry(shape: MyShape) {
  // This is cached - expensive calculations are safe
  return this.calculateComplexGeometry(shape)
}
```

The caching happens at the geometry instance level, with computed properties for:

- `vertices` - Calculated once and cached
- `bounds` - Calculated from vertices
- `area` - Calculated from vertices
- `length` - Calculated from vertices

### Component re-rendering

Shape components should use React hooks efficiently:

```typescript
component(shape: MyShape) {
  // Use useValue to subscribe to specific editor state
  const isSelected = useValue(
    'isSelected',
    () => this.editor.getSelectedShapeIds().includes(shape.id),
    [this.editor, shape.id]
  )

  // Avoid expensive calculations in render
  const geometry = useMemo(
    () => this.getGeometry(shape),
    [shape.props.w, shape.props.h]
  )

  return <div>...</div>
}
```

Best practices:

- Use `useValue` for reactive editor state
- Memoize expensive calculations
- Avoid inline function definitions
- Keep component trees shallow

### Viewport culling

Shapes outside the viewport are automatically culled (display: none). Control this behavior:

```typescript
override canCull(shape: MyShape): boolean {
  // Disable culling for shapes that need to stay mounted
  return false
}
```

Culled shapes:

- Remain in the DOM
- Don't render visually
- Still participate in hit testing
- Improve render performance

### Hit testing optimization

The geometry system optimizes hit testing by:

1. Checking bounds first (cheap)
2. Only testing detailed geometry if within bounds
3. Caching vertex calculations

For complex shapes, provide accurate but simple bounds:

```typescript
getGeometry(shape: MyShape) {
  // Use simplified geometry for hit testing
  return new Polygon2d({
    points: simplifyPoints(shape.props.points),
    isFilled: true,
  })
}
```

### Indicator performance

Indicators render on every selection change. Keep them lightweight:

```typescript
indicator(shape: MyShape) {
  // Good: Simple SVG primitive
  return <rect width={shape.props.w} height={shape.props.h} />

  // Avoid: Complex calculations or React components
  return this.renderComplexIndicator(shape) // Too expensive
}
```

### Memory management

Shape utilities are singleton instances. Avoid storing shape-specific state in the util:

```typescript
// Bad: State in util
class MyShapeUtil extends ShapeUtil<MyShape> {
	private cache = new Map() // Leaks memory!
}

// Good: State in editor or React state
class MyShapeUtil extends ShapeUtil<MyShape> {
	component(shape: MyShape) {
		const [state, setState] = useState()
		// Component-local state
	}
}
```

## Key files

Core shape system implementation:

- packages/editor/src/lib/editor/shapes/ShapeUtil.ts - Base ShapeUtil class with all methods
- packages/editor/src/lib/editor/shapes/BaseBoxShapeUtil.tsx - Base class for rectangular shapes
- packages/editor/src/lib/primitives/geometry/Geometry2d.ts - Base geometry class
- packages/editor/src/lib/primitives/geometry/Rectangle2d.ts - Rectangle geometry
- packages/editor/src/lib/primitives/geometry/Circle2d.ts - Circle geometry
- packages/editor/src/lib/primitives/geometry/Polygon2d.ts - Polygon geometry
- packages/editor/src/lib/primitives/geometry/Group2d.ts - Composite geometry

Default shape implementations:

- packages/tldraw/src/lib/shapes/geo/GeoShapeUtil.tsx - Geometric shapes with labels
- packages/tldraw/src/lib/shapes/text/TextShapeUtil.tsx - Text shapes
- packages/tldraw/src/lib/shapes/arrow/ArrowShapeUtil.tsx - Arrow shapes with bindings
- packages/tldraw/src/lib/shapes/draw/DrawShapeUtil.tsx - Freehand drawing
- packages/tldraw/src/lib/shapes/line/LineShapeUtil.tsx - Multi-point lines
- packages/tldraw/src/lib/shapes/frame/FrameShapeUtil.tsx - Container frames
- packages/tldraw/src/lib/shapes/image/ImageShapeUtil.tsx - Image shapes with cropping
- packages/tldraw/src/lib/shapes/video/VideoShapeUtil.tsx - Video playback
- packages/tldraw/src/lib/shapes/note/NoteShapeUtil.tsx - Sticky notes
- packages/tldraw/src/lib/shapes/embed/EmbedShapeUtil.tsx - Embedded content
- packages/tldraw/src/lib/shapes/bookmark/BookmarkShapeUtil.tsx - Web bookmarks
- packages/tldraw/src/lib/shapes/highlight/HighlightShapeUtil.tsx - Highlighter strokes
- packages/tldraw/src/lib/defaultShapeUtils.ts - Aggregates all default shapes

Schema definitions:

- packages/tlschema/src/shapes/ - All shape type definitions
- packages/tlschema/src/shapes/TLBaseShape.ts - Base shape interface
- packages/tlschema/src/records/TLShape.ts - Shape record type

## Related

- [Editor package](../packages/editor.md) - Core editor that uses shape system
- [Store package](../packages/store.md) - Shape data persistence
- [TLSchema package](../packages/tlschema.md) - Shape type definitions
- [Bindings system](./bindings-system.md) - Shape relationships
- [Tool system](./tool-system.md) - Shape creation and manipulation tools
