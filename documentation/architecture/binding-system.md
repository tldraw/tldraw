---
title: Binding system
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - bindings
  - bindingutil
  - arrows
  - relationships
  - architecture
---

The binding system enables shapes to maintain persistent relationships with each other. Bindings represent connections like arrows pointing to shapes, organizational relationships, or any other relationship where one shape needs to stay synchronized with another.

## Overview

The binding system consists of three main components:

1. **Binding definitions** - TypeScript interfaces that define a binding's data structure (from `@tldraw/tlschema`)
2. **BindingUtil classes** - Classes that define a binding's behavior and lifecycle (from `@tldraw/editor`)
3. **Binding lifecycle hooks** - Methods that respond to binding and shape changes

This separation allows bindings to:

- Maintain type-safe relationships between shapes
- Automatically update when connected shapes change
- Handle creation, updates, and cleanup gracefully
- Survive shape transformations like move, resize, and rotate

## Binding definitions

Every binding starts with a type definition that extends `TLBaseBinding`:

```typescript
import { TLBaseBinding } from '@tldraw/tlschema'
import { VecModel } from '@tldraw/tlschema'

type MyBinding = TLBaseBinding<
	'myBinding',
	{
		strength: number
		color: string
		enabled: boolean
	}
>
```

The base binding provides standard properties that all bindings inherit:

| Property   | Type          | Purpose                     |
| ---------- | ------------- | --------------------------- |
| `id`       | `TLBindingId` | Unique identifier           |
| `typeName` | `'binding'`   | Record type name            |
| `type`     | `string`      | Binding type name           |
| `fromId`   | `TLShapeId`   | Source shape ID             |
| `toId`     | `TLShapeId`   | Target shape ID             |
| `props`    | `object`      | Binding-specific properties |
| `meta`     | `JsonObject`  | User-defined metadata       |

The `fromId` and `toId` establish the directional relationship between shapes. For arrows, `fromId` is the arrow itself and `toId` is the shape it points to.

### Arrow binding example

The arrow binding is the primary built-in binding type:

```typescript
interface TLArrowBindingProps {
	terminal: 'start' | 'end'
	normalizedAnchor: VecModel
	isExact: boolean
	isPrecise: boolean
	snap: ElbowArrowSnap
}

type TLArrowBinding = TLBaseBinding<'arrow', TLArrowBindingProps>
```

Key properties:

- **terminal** - Which end of the arrow is bound ('start' or 'end')
- **normalizedAnchor** - Position on the target shape (0,0 = top-left, 1,1 = bottom-right)
- **isExact** - Whether the arrow head enters the shape to point at the exact anchor
- **isPrecise** - Whether to bind to the exact anchor or the shape's center
- **snap** - Snapping behavior for elbow arrows ('center', 'edge-point', 'edge', 'none')

Creating an arrow binding:

```typescript
const arrowBinding: TLArrowBinding = {
	id: 'binding:abc123',
	typeName: 'binding',
	type: 'arrow',
	fromId: 'shape:arrow1', // The arrow shape
	toId: 'shape:rectangle1', // The target shape
	props: {
		terminal: 'end',
		normalizedAnchor: { x: 0.5, y: 0.5 },
		isExact: false,
		isPrecise: true,
		snap: 'edge',
	},
	meta: {},
}
```

## The BindingUtil class

The `BindingUtil` class is an abstract base class that defines how bindings behave. Each binding type requires a corresponding BindingUtil implementation.

### Required methods

Every BindingUtil must implement one method:

#### getDefaultProps()

Returns the default property values for new bindings:

```typescript
class MyBindingUtil extends BindingUtil<MyBinding> {
	static override type = 'myBinding' as const

	getDefaultProps(): Partial<MyBinding['props']> {
		return {
			strength: 1.0,
			color: 'black',
			enabled: true,
		}
	}
}
```

### Lifecycle hooks

BindingUtil provides optional lifecycle methods that respond to various events. These hooks enable bindings to update shapes, maintain consistency, and clean up properly.

#### onBeforeCreate(options)

Called before a binding is created. You can modify or validate the binding:

```typescript
onBeforeCreate({ binding }: BindingOnCreateOptions<MyBinding>) {
  // Ensure strength is within valid range
  if (binding.props.strength > 1.0) {
    return {
      ...binding,
      props: { ...binding.props, strength: 1.0 }
    }
  }
}
```

#### onAfterCreate(options)

Called after a binding is created. Use this to update connected shapes or initialize state:

```typescript
onAfterCreate({ binding }: BindingOnCreateOptions<MyBinding>) {
  const arrow = this.editor.getShape(binding.fromId)
  if (!arrow) return

  // Update arrow state based on new binding
  arrowDidUpdate(this.editor, arrow)
}
```

#### onBeforeChange(options)

Called before a binding changes. You can modify the change or enforce constraints:

```typescript
onBeforeChange({ bindingBefore, bindingAfter }: BindingOnChangeOptions<MyBinding>) {
  // Prevent disabling an active binding
  if (bindingBefore.props.enabled && !bindingAfter.props.enabled) {
    return bindingBefore // Cancel the change
  }
}
```

#### onAfterChange(options)

Called after a binding changes:

```typescript
onAfterChange({ bindingAfter }: BindingOnChangeOptions<MyBinding>) {
  const arrow = this.editor.getShape(bindingAfter.fromId)
  if (!arrow) return

  // Propagate binding changes to arrow
  arrowDidUpdate(this.editor, arrow)
}
```

#### onBeforeDelete(options)

Called before a binding is deleted:

```typescript
onBeforeDelete({ binding }: BindingOnDeleteOptions<MyBinding>) {
  // Clean up any related state
  console.log('Binding being deleted:', binding.id)
}
```

#### onAfterDelete(options)

Called after a binding is deleted:

```typescript
onAfterDelete({ binding }: BindingOnDeleteOptions<MyBinding>) {
  // Update shapes that depended on this binding
}
```

### Shape change hooks

These hooks respond to changes in bound shapes, enabling bindings to propagate updates:

#### onAfterChangeFromShape(options)

Called when the shape referenced by `fromId` changes:

```typescript
onAfterChangeFromShape({ binding, shapeAfter }: BindingOnShapeChangeOptions<MyBinding>) {
  // Update binding or other shapes based on the change
  arrowDidUpdate(this.editor, shapeAfter)
}
```

#### onAfterChangeToShape(options)

Called when the shape referenced by `toId` changes:

```typescript
onAfterChangeToShape({
  binding,
  shapeBefore,
  shapeAfter,
  reason
}: BindingOnShapeChangeOptions<MyBinding>) {
  // Reason is either 'self' (shape changed) or 'ancestry' (parent changed)
  if (reason !== 'ancestry' &&
      shapeBefore.parentId === shapeAfter.parentId &&
      shapeBefore.index === shapeAfter.index) {
    return // No significant change
  }

  // Re-parent the arrow to maintain proper hierarchy
  reparentArrow(this.editor, binding.fromId)
}
```

The `reason` parameter helps distinguish between direct shape changes ('self') and indirect changes through parent hierarchy ('ancestry').

### Shape isolation hooks

Isolation occurs when two bound shapes are separated (one deleted, copied, or duplicated without the other). These hooks let bindings update shapes to maintain consistency.

#### onBeforeIsolateFromShape(options)

Called before the `fromId` shape is isolated:

```typescript
onBeforeIsolateFromShape({ binding, removedShape }: BindingOnShapeIsolateOptions<MyBinding>) {
  const arrow = this.editor.getShape(binding.fromId)
  if (!arrow) return

  // Update arrow terminal to fix its position before unbinding
  updateArrowTerminal({
    editor: this.editor,
    arrow,
    terminal: binding.props.terminal,
  })
}
```

#### onBeforeIsolateToShape(options)

Called before the `toId` shape is isolated:

```typescript
onBeforeIsolateToShape({ binding, removedShape }: BindingOnShapeIsolateOptions<MyBinding>) {
  // Update arrow position so it doesn't point to wrong location
}
```

**Isolation vs. deletion:** Use isolation hooks for consistency updates (like fixing arrow positions). Use deletion hooks for actions specific to deletion (like deleting dependent shapes).

### Shape deletion hooks

These hooks fire specifically when shapes are being deleted, not just isolated:

#### onBeforeDeleteFromShape(options)

Called before the `fromId` shape is deleted:

```typescript
onBeforeDeleteFromShape({ binding, shape }: BindingOnShapeDeleteOptions<MyBinding>) {
  // Perform cleanup specific to deletion
}
```

#### onBeforeDeleteToShape(options)

Called before the `toId` shape is deleted:

```typescript
onBeforeDeleteToShape({ binding, shape }: BindingOnShapeDeleteOptions<MyBinding>) {
  // Maybe delete the arrow when the target is deleted
}
```

### Operation complete hook

Called after any store operation involving this binding type completes. Useful for batch processing:

```typescript
class MyBindingUtil extends BindingUtil<MyBinding> {
	changedBindingIds = new Set<TLBindingId>()

	onOperationComplete() {
		// Process all changed bindings in one batch
		doSomethingWithChangedBindings(this.changedBindingIds)
		this.changedBindingIds.clear()
	}

	onAfterChange({ bindingAfter }: BindingOnChangeOptions<MyBinding>) {
		this.changedBindingIds.add(bindingAfter.id)
	}
}
```

## Arrow binding implementation

The arrow binding implementation demonstrates how bindings work in practice.

### ArrowBindingUtil

```typescript
export class ArrowBindingUtil extends BindingUtil<TLArrowBinding> {
	static override type = 'arrow'
	static override props = arrowBindingProps
	static override migrations = arrowBindingMigrations

	getDefaultProps(): Partial<TLArrowBindingProps> {
		return {
			isPrecise: false,
			isExact: false,
			normalizedAnchor: { x: 0.5, y: 0.5 },
			snap: 'none',
		}
	}

	// When binding is created or changed, update arrow
	onAfterCreate({ binding }: BindingOnCreateOptions<TLArrowBinding>) {
		const arrow = this.editor.getShape(binding.fromId) as TLArrowShape
		if (!arrow) return
		arrowDidUpdate(this.editor, arrow)
	}

	onAfterChange({ bindingAfter }: BindingOnChangeOptions<TLArrowBinding>) {
		const arrow = this.editor.getShape(bindingAfter.fromId) as TLArrowShape
		if (!arrow) return
		arrowDidUpdate(this.editor, arrow)
	}

	// When bound shape changes, re-parent arrow if needed
	onAfterChangeToShape({
		binding,
		shapeBefore,
		shapeAfter,
		reason,
	}: BindingOnShapeChangeOptions<TLArrowBinding>) {
		if (
			reason !== 'ancestry' &&
			shapeBefore.parentId === shapeAfter.parentId &&
			shapeBefore.index === shapeAfter.index
		) {
			return
		}
		reparentArrow(this.editor, binding.fromId)
	}

	// When arrow is isolated, fix its terminal position
	onBeforeIsolateFromShape({ binding }: BindingOnShapeIsolateOptions<TLArrowBinding>) {
		const arrow = this.editor.getShape<TLArrowShape>(binding.fromId)
		if (!arrow) return
		updateArrowTerminal({
			editor: this.editor,
			arrow,
			terminal: binding.props.terminal,
		})
	}
}
```

### Creating and managing arrow bindings

Arrows use helper functions to manage their bindings:

```typescript
// Create or update a binding
createOrUpdateArrowBinding(
  editor: Editor,
  arrow: TLArrowShape,
  targetShapeId: TLShapeId,
  props: TLArrowBindingProps
)

// Remove a binding
removeArrowBinding(
  editor: Editor,
  arrow: TLArrowShape,
  terminal: 'start' | 'end'
)

// Get arrow's current bindings
const bindings = getArrowBindings(editor, arrow)
// Returns: { start?: TLArrowBinding, end?: TLArrowBinding }
```

### Arrow terminal updates

When arrows are translated, resized, or isolated, their terminal positions must be updated:

```typescript
function updateArrowTerminal({
	editor,
	arrow,
	terminal,
	unbind = false,
	useHandle = false,
}: {
	editor: Editor
	arrow: TLArrowShape
	terminal: 'start' | 'end'
	unbind?: boolean
	useHandle?: boolean
}) {
	const info = getArrowInfo(editor, arrow)
	if (!info) throw new Error('expected arrow info')

	const startPoint = useHandle ? info.start.handle : info.start.point
	const endPoint = useHandle ? info.end.handle : info.end.point
	const point = terminal === 'start' ? startPoint : endPoint

	// Update arrow terminal position
	editor.updateShape({
		id: arrow.id,
		type: 'arrow',
		props: {
			[terminal]: { x: point.x, y: point.y },
			bend: arrow.props.bend,
		},
	})

	if (unbind) {
		removeArrowBinding(editor, arrow, terminal)
	}
}
```

This ensures arrows maintain visual consistency when bindings are removed.

## Creating custom bindings

Custom bindings follow the same pattern as arrow bindings.

### Define the binding type

```typescript
// packages/tlschema/src/bindings/TLMyBinding.ts
import { TLBaseBinding } from './TLBaseBinding'
import { T } from '@tldraw/validate'
import { RecordProps } from '../recordsWithProps'

export interface TLMyBindingProps {
	connectionType: 'strong' | 'weak'
	label: string
}

export const myBindingProps: RecordProps<TLMyBinding> = {
	connectionType: T.literalEnum('strong', 'weak'),
	label: T.string,
}

export type TLMyBinding = TLBaseBinding<'myBinding', TLMyBindingProps>

// Define migrations
export const myBindingVersions = createBindingPropsMigrationIds('myBinding', {
	AddLabel: 1,
})

export const myBindingMigrations = createBindingPropsMigrationSequence({
	sequence: [
		{
			id: myBindingVersions.AddLabel,
			up: (props) => {
				props.label = ''
			},
			down: (props) => {
				delete props.label
			},
		},
	],
})
```

### Implement the BindingUtil

```typescript
// packages/tldraw/src/lib/bindings/myBinding/MyBindingUtil.ts
import { BindingUtil, BindingOnChangeOptions } from '@tldraw/editor'
import { TLMyBinding, TLMyBindingProps } from '@tldraw/tlschema'

export class MyBindingUtil extends BindingUtil<TLMyBinding> {
	static override type = 'myBinding' as const
	static override props = myBindingProps
	static override migrations = myBindingMigrations

	getDefaultProps(): Partial<TLMyBindingProps> {
		return {
			connectionType: 'strong',
			label: '',
		}
	}

	onAfterCreate({ binding }: BindingOnCreateOptions<TLMyBinding>) {
		// Update source shape when binding is created
		const fromShape = this.editor.getShape(binding.fromId)
		if (!fromShape) return

		// Add visual indicator or update shape state
		this.editor.updateShape({
			id: fromShape.id,
			type: fromShape.type,
			meta: {
				...fromShape.meta,
				hasBinding: true,
			},
		})
	}

	onAfterChangeToShape({ binding, shapeAfter }: BindingOnShapeChangeOptions<TLMyBinding>) {
		// Respond to target shape changes
		const fromShape = this.editor.getShape(binding.fromId)
		if (!fromShape) return

		// Update source shape based on target changes
		this.updateConnection(fromShape, shapeAfter, binding)
	}

	private updateConnection(fromShape: TLShape, toShape: TLShape, binding: TLMyBinding) {
		// Custom logic to maintain binding consistency
	}
}
```

### Register the binding

```typescript
// In your editor setup
import { MyBindingUtil } from './bindings/myBinding/MyBindingUtil'

const editor = new Editor({
	// ... other options
	bindingUtils: [MyBindingUtil],
})
```

## Binding lifecycle

Understanding the complete lifecycle helps when implementing custom bindings:

1. **Creation**
   - User action triggers binding creation
   - `onBeforeCreate` hook fires (can modify binding)
   - Binding record added to store
   - `onAfterCreate` hook fires (update shapes)

2. **Update**
   - Binding props change
   - `onBeforeChange` hook fires (can modify change)
   - Store updates binding record
   - `onAfterChange` hook fires (propagate changes)

3. **Shape changes**
   - Bound shape changes
   - `onAfterChangeFromShape` or `onAfterChangeToShape` fires
   - Binding can update other shapes or itself
   - Changes may trigger additional updates

4. **Isolation**
   - One shape deleted, copied, or duplicated alone
   - `onBeforeIsolateFromShape` or `onBeforeIsolateToShape` fires
   - Binding updates remaining shape for consistency
   - Binding then deleted

5. **Deletion**
   - Binding explicitly deleted or both shapes removed
   - `onBeforeDeleteFromShape` and `onBeforeDeleteToShape` fire
   - `onBeforeDelete` fires
   - Binding record removed from store
   - `onAfterDelete` fires (cleanup)

6. **Operation complete**
   - Store operation finishes
   - `onOperationComplete` fires
   - Batch processing of accumulated changes

## Working with bindings

### Querying bindings

Get bindings from the store:

```typescript
// Get all bindings of a specific type
const arrowBindings = editor.getBindingsFromShape<TLArrowBinding>(shape, 'arrow')

// Get bindings involving a specific shape
const allBindings = editor.getBindingsFromShape(shape)

// Get specific binding
const binding = editor.getBinding<TLArrowBinding>(bindingId)
```

### Creating bindings

```typescript
// Create a new binding
editor.createBinding({
	type: 'arrow',
	fromId: arrowShape.id,
	toId: targetShape.id,
	props: {
		terminal: 'end',
		normalizedAnchor: { x: 0.5, y: 0.5 },
		isExact: false,
		isPrecise: true,
		snap: 'none',
	},
})
```

### Updating bindings

```typescript
// Update binding props
editor.updateBinding({
	...binding,
	props: {
		...binding.props,
		isPrecise: false,
		normalizedAnchor: { x: 0.8, y: 0.5 },
	},
})
```

### Deleting bindings

```typescript
// Delete a specific binding
editor.deleteBinding(binding)

// Delete all bindings from a shape
const bindings = editor.getBindingsFromShape(shape)
editor.deleteBindings(bindings)
```

## Performance considerations

The binding system is designed for efficiency, but keep these practices in mind:

### Batch operations

Use transactions for multiple binding operations:

```typescript
editor.batch(() => {
	// Create multiple bindings
	editor.createBinding(binding1)
	editor.createBinding(binding2)
	editor.createBinding(binding3)
})
```

This fires lifecycle hooks only once per operation rather than per binding.

### Avoid infinite loops

Be careful with circular updates:

```typescript
onAfterChangeToShape({ binding, shapeAfter }: BindingOnShapeChangeOptions) {
  // BAD: This can cause infinite loops
  this.editor.updateShape({
    id: shapeAfter.id,
    type: shapeAfter.type,
    props: { /* changes */ },
  })

  // GOOD: Check if update is needed
  if (needsUpdate(shapeAfter)) {
    this.editor.updateShape({
      id: shapeAfter.id,
      type: shapeAfter.type,
      props: { /* changes */ },
    })
  }
}
```

Always check if an update is necessary before making changes in lifecycle hooks.

### Cache expensive calculations

Store computed values when possible:

```typescript
class MyBindingUtil extends BindingUtil<MyBinding> {
	private cachedConnections = new WeakMap<TLBinding, ConnectionInfo>()

	getConnectionInfo(binding: TLBinding): ConnectionInfo {
		if (!this.cachedConnections.has(binding)) {
			this.cachedConnections.set(binding, computeConnectionInfo(binding))
		}
		return this.cachedConnections.get(binding)!
	}
}
```

### Minimize shape updates

Only update shapes when the binding change requires it:

```typescript
onAfterChangeToShape({
  binding,
  shapeBefore,
  shapeAfter,
  reason,
}: BindingOnShapeChangeOptions) {
  // Skip updates for insignificant changes
  if (reason !== 'ancestry' &&
      shapeBefore.parentId === shapeAfter.parentId &&
      shapeBefore.index === shapeAfter.index) {
    return
  }

  // Only update when necessary
  updateBindingShapes(binding)
}
```

## Common patterns

### Bidirectional bindings

Create bindings in both directions for symmetric relationships:

```typescript
function createBidirectionalBinding(editor: Editor, shape1: TLShape, shape2: TLShape) {
	editor.batch(() => {
		editor.createBinding({
			type: 'myBinding',
			fromId: shape1.id,
			toId: shape2.id,
			props: {
				/* ... */
			},
		})
		editor.createBinding({
			type: 'myBinding',
			fromId: shape2.id,
			toId: shape1.id,
			props: {
				/* ... */
			},
		})
	})
}
```

### Conditional bindings

Only allow bindings under certain conditions:

```typescript
// In ShapeUtil
canBind({ toShapeType, bindingType }: TLShapeUtilCanBindOpts): boolean {
  // Only allow arrow bindings to non-arrow shapes
  return bindingType === 'arrow' && toShapeType !== 'arrow'
}
```

### Cascading deletes

Delete dependent shapes when a binding is removed:

```typescript
onBeforeDeleteToShape({ binding, shape }: BindingOnShapeDeleteOptions) {
  // When target is deleted, also delete the source
  const fromShape = this.editor.getShape(binding.fromId)
  if (fromShape && fromShape.type === 'note') {
    this.editor.deleteShape(fromShape.id)
  }
}
```

### Visual indicators

Update shape appearance based on bindings:

```typescript
// In ShapeUtil component
component(shape: MyShape) {
  const bindings = this.editor.getBindingsFromShape(shape)
  const isBound = bindings.length > 0

  return (
    <SVGContainer>
      <rect
        width={shape.props.w}
        height={shape.props.h}
        fill={isBound ? 'blue' : 'gray'}
        stroke={isBound ? 'darkblue' : 'black'}
      />
    </SVGContainer>
  )
}
```

## Key files

- packages/editor/src/lib/editor/bindings/BindingUtil.ts - BindingUtil base class
- packages/tlschema/src/bindings/TLBaseBinding.ts - Base binding type definition
- packages/tlschema/src/bindings/TLArrowBinding.ts - Arrow binding definition
- packages/tldraw/src/lib/bindings/arrow/ArrowBindingUtil.ts - Arrow binding implementation
- packages/tldraw/src/lib/shapes/arrow/shared.ts - Arrow binding helper functions
- packages/editor/src/lib/editor/Editor.ts - Editor binding methods

## Related

- [Shape system](./shape-system.md) - Understanding shapes that bindings connect
- [Tool system](./tool-system.md) - Tools that create and modify bindings
- packages/editor/CONTEXT.md - Editor architecture overview
- packages/tlschema/CONTEXT.md - Schema and type definitions
