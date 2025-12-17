---
title: API conventions
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - api
  - conventions
  - naming
  - patterns
  - style
---

This document describes naming conventions, patterns, and style guidelines used throughout the tldraw codebase.

## Naming conventions

### Type prefixes

Types use the `TL` prefix:

```typescript
// Records and shapes
TLShape
TLPage
TLAsset
TLBinding

// IDs
TLShapeId
TLPageId
TLAssetId

// Events
TLPointerEvent
TLKeyboardEvent

// Utilities and interfaces
TLStore
TLContent
TLExternalContent
```

### Method naming

Editor methods follow consistent patterns:

```typescript
// Getters - return current state
editor.getShape(id)
editor.getSelectedShapes()
editor.getCurrentPage()
editor.getCamera()

// Setters - modify state
editor.setCurrentTool('draw')
editor.setCamera({ x: 0, y: 0, z: 1 })
editor.setSelectedShapes([id1, id2])

// Actions - perform operations
editor.createShape({ type: 'geo', ... })
editor.updateShape({ id, props: { ... } })
editor.deleteShapes([id])

// Queries - boolean checks
editor.isShapeOfType(shape, 'geo')
editor.hasAncestor(shape, parentId)
editor.isPointInShape(shape, point)
```

### ID creation

Use factory functions for type-safe IDs:

```typescript
import { createShapeId, createPageId, createAssetId } from 'tldraw'

const shapeId = createShapeId()        // shape:xxxx
const pageId = createPageId()          // page:xxxx
const assetId = createAssetId()        // asset:xxxx
```

### Class naming

```typescript
// ShapeUtils end with "ShapeUtil"
class GeoShapeUtil extends ShapeUtil<TLGeoShape> {}
class ArrowShapeUtil extends ShapeUtil<TLArrowShape> {}

// BindingUtils end with "BindingUtil"
class ArrowBindingUtil extends BindingUtil<TLArrowBinding> {}

// State nodes use descriptive names
class SelectTool extends StateNode {}
class Brushing extends StateNode {}
class Translating extends StateNode {}
```

## Code patterns

### Reactive state

Use signals for reactive values:

```typescript
import { atom, computed } from '@tldraw/state'

// Atoms for mutable state
const $count = atom('count', 0)

// Computed for derived values
const $doubled = computed('doubled', () => $count.get() * 2)

// Prefix signal variables with $
class MyManager {
  readonly $isActive = atom('isActive', false)
  readonly $items = atom<Item[]>('items', [])
}
```

### Editor access

```typescript
// In React components
function MyComponent() {
  const editor = useEditor()
  // ...
}

// In ShapeUtil methods
class MyShapeUtil extends ShapeUtil<MyShape> {
  component(shape: MyShape) {
    // this.editor is available
    const isSelected = this.editor.getSelectedShapeIds().includes(shape.id)
  }
}

// In StateNode methods
class MyTool extends StateNode {
  onPointerDown(info: TLPointerEventInfo) {
    // this.editor is available
    this.editor.createShape({ ... })
  }
}
```

### Batch operations

Group related changes for efficiency and single undo:

```typescript
editor.batch(() => {
  editor.createShape(shape1)
  editor.createShape(shape2)
  editor.select(shape1.id, shape2.id)
})
```

### History marks

Create undo points for user actions:

```typescript
editor.mark('before-resize')
editor.updateShape({ id, props: { w: newWidth } })
// User can now undo back to the mark
```

## Type patterns

### Shape type definitions

```typescript
// 1. Define props interface
interface MyShapeProps {
  w: number
  h: number
  color: string
}

// 2. Define shape type using TLBaseShape
type MyShape = TLBaseShape<'myShape', MyShapeProps>

// 3. Define migrations if props change over time
const myShapeMigrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: 'myShape/add-color',
      up: (props) => ({ ...props, color: 'black' }),
      down: ({ color, ...props }) => props,
    },
  ],
})

// 4. Define props validation
const myShapeProps: RecordProps<MyShape> = {
  w: T.number,
  h: T.number,
  color: T.string,
}
```

### Generic type parameters

```typescript
// ShapeUtil is generic over the shape type
class MyShapeUtil extends ShapeUtil<MyShape> {
  // Methods receive correctly typed shapes
  component(shape: MyShape) { ... }
  getGeometry(shape: MyShape) { ... }
}

// BindingUtil is generic over the binding type
class MyBindingUtil extends BindingUtil<MyBinding> {
  getDefaultProps(): Partial<MyBinding['props']> { ... }
}
```

## File organization

### Package structure

```
packages/my-package/
├── src/
│   ├── index.ts           # Public exports
│   ├── lib/
│   │   ├── MyClass.ts
│   │   └── MyClass.test.ts
│   └── test/
│       └── testUtils.ts
├── api/
│   └── my-package.api.md  # API report
├── package.json
└── tsconfig.json
```

### Export conventions

```typescript
// index.ts - explicit exports
export { MyClass } from './lib/MyClass'
export type { MyType } from './lib/types'

// No barrel exports (export * from)
// No default exports for classes
```

### Test file naming

```typescript
// Unit tests next to source
MyClass.ts
MyClass.test.ts

// Integration tests in test directory
src/test/
  feature.test.ts
```

## Documentation patterns

### JSDoc comments

```typescript
/**
 * Creates a new shape on the current page.
 *
 * @example
 * ```ts
 * editor.createShape({
 *   type: 'geo',
 *   x: 100,
 *   y: 100,
 *   props: { geo: 'rectangle', w: 200, h: 100 },
 * })
 * ```
 *
 * @param shape - The shape to create.
 * @returns The created shape.
 *
 * @public
 */
createShape(shape: TLShapePartial): TLShape
```

### Visibility markers

```typescript
/** @public */     // Part of public API
/** @internal */   // Used across packages but not public
/** @beta */       // Experimental, may change
```

## Error handling

### Assertions

```typescript
import { assert, assertExists } from '@tldraw/utils'

// Throw if condition is false
assert(shapes.length > 0, 'Expected at least one shape')

// Throw if value is null/undefined
const shape = assertExists(editor.getShape(id), 'Shape not found')
```

### Result types

For operations that can fail:

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

function parseJson(text: string): Result<unknown, Error> {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (e) {
    return { ok: false, error: e as Error }
  }
}
```

## Performance patterns

### Memoization

```typescript
// Use computed for derived values
const $bounds = computed('bounds', () => {
  return calculateBounds(this.editor.getSelectedShapes())
})

// React memoization for components
const MyComponent = memo(function MyComponent({ shape }) {
  // ...
})
```

### Avoid unnecessary work

```typescript
// Bad - recalculates on every render
function MyComponent() {
  const shapes = editor.getCurrentPageShapes()
  const filtered = shapes.filter(s => s.type === 'geo') // Every render
}

// Good - use reactive queries
function MyComponent() {
  const geoShapes = useValue('geoShapes', () =>
    editor.getCurrentPageShapes().filter(s => s.type === 'geo'),
    [editor]
  )
}
```

## Related

- [Glossary](./glossary.md) - Key terms
- [TypeScript configuration](../tooling/typescript.md) - Type setup
- [Code quality](../tooling/code-quality.md) - Linting and formatting
