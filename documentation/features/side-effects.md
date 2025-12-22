---
title: Side effects
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - side effects
  - store
  - hooks
  - validation
  - cleanup
---

The side effects system maintains store consistency and enforces business rules when records change. Side effects are lifecycle hooks that run when records are created, updated, or deleted. They serve two distinct purposes: "before" handlers intercept and modify records during operations, allowing validation and transformation, while "after" handlers react to completed changes, enabling cleanup and relationship maintenance.

The editor relies heavily on side effects to maintain correctness. Deleting a shape triggers cleanup of related bindings. Changing bindings notifies connected shapes to update. Modifying instance state synchronizes UI focus. These hooks keep the data model consistent without coupling unrelated components.

## How it works

### Before and after handlers

Side effects provide six handler types organized around three operations: create, change, and delete. Each operation has a "before" and "after" phase.

Before handlers run during the operation and can modify or block changes. The `beforeCreate` handler transforms records before creation, useful for adding computed properties or normalizing data. The `beforeChange` handler modifies updates in flight—returning the previous record blocks the change entirely. The `beforeDelete` handler can return `false` to prevent deletion.

After handlers run once the operation completes and cannot modify the primary record. The `afterCreate` handler reacts to new records by updating related data elsewhere. The `afterChange` handler responds to updates by maintaining relationships between records. The `afterDelete` handler cleans up orphaned references and cascades deletions to dependent records.

The key distinction: before handlers modify the record being operated on, while after handlers update other records in response.

### Source tracking

Every handler receives a `source` parameter indicating whether the change came from user interaction (`'user'`) or remote synchronization (`'remote'`). This allows different behavior for local versus synced changes. For example, you might auto-save only after user operations or skip validation for trusted remote data.

```typescript
editor.sideEffects.registerAfterCreateHandler('shape', (shape, source) => {
	if (source === 'user') {
		logUserAction('created shape', shape.type)
	}
})
```

### Registration and cleanup

Register side effects using type-specific methods on the `StoreSideEffects` instance:

```typescript
const cleanup = editor.sideEffects.registerAfterDeleteHandler('shape', (shape) => {
	// Clean up arrows connected to deleted shape
	const connectedArrows = editor
		.getCurrentPageShapes()
		.filter((s) => s.type === 'arrow' && (s.props.start === shape.id || s.props.end === shape.id))
	editor.deleteShapes(connectedArrows.map((a) => a.id))
})
```

Each registration method returns a cleanup function. Call this function to remove the handler:

```typescript
// Later, when no longer needed
cleanup()
```

For complex setups with multiple handlers, use the `register` method to register all handlers at once and get a single cleanup function:

```typescript
const cleanup = editor.sideEffects.register({
	shape: {
		afterDelete: (shape) => {
			/* ... */
		},
		beforeChange: (prev, next) => {
			/* ... */
		},
	},
	binding: {
		afterCreate: (binding) => {
			/* ... */
		},
	},
})
```

### Execution order

Handlers execute in registration order. If you register three `afterCreate` handlers for shapes, they run in the sequence they were registered. This matters when handlers depend on each other's effects.

Side effects run within store transactions. All before handlers complete before any after handlers run. The `operationComplete` handler runs last, after all individual record handlers finish.

## Use cases

### Maintaining referential integrity

Side effects enforce relationships between records. When a shape is deleted, the editor uses `beforeDelete` to remove its bindings first:

```typescript
editor.sideEffects.register({
	shape: {
		beforeDelete: (shape) => {
			const bindingIds = editor.getBindingsInvolvingShape(shape).map((b) => b.id)
			if (bindingIds.length) {
				editor.deleteBindings(bindingIds)
			}
		},
	},
})
```

### Updating derived state

After handlers keep derived data synchronized. When a shape changes, the editor notifies its parent to recalculate children:

```typescript
editor.sideEffects.register({
	shape: {
		afterChange: (prev, next) => {
			if (prev.parentId && isShapeId(prev.parentId)) {
				const parent = editor.getShape(prev.parentId)
				if (parent) {
					const util = editor.getShapeUtil(parent)
					const changes = util.onChildrenChange?.(parent)
					if (changes) editor.updateShapes(changes)
				}
			}
		},
	},
})
```

### Validating operations

Before handlers enforce constraints. This example prevents shapes from leaving the canvas:

```typescript
editor.sideEffects.registerBeforeChangeHandler('shape', (prev, next) => {
	if (next.x < 0 || next.y < 0) {
		return prev // Block the change
	}
	return next
})
```

### Batch processing

The `operationComplete` handler runs once after all changes in a transaction finish. Use this for expensive operations that should happen once per batch:

```typescript
editor.sideEffects.registerOperationCompleteHandler((source) => {
	if (source === 'user') {
		// Trigger autosave after user edits complete
		scheduleAutosave()
	}
})
```

## Examples

- **[Before create/update shape](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/before-create-update-shape)** - Intercept shape creation and updates to transform records, demonstrated by locking shapes to a circle.
- **[Before delete shape](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/before-delete-shape)** - Intercept shape deletion to prevent or modify delete operations.
- **[After create/update shape](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/after-create-update-shape)** - React to shape creation and updates by modifying other records, ensuring only one red shape exists.
- **[After delete shape](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/after-delete-shape)** - React to shape deletion by cleaning up related records, deleting frames when their last shape is removed.
- **[Shape meta (on create)](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/meta-on-create)** - Add custom metadata to shapes when they're created, tracking creation time and author.
- **[Shape meta (on change)](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/meta-on-change)** - Update shape metadata whenever shapes change, tracking modification history.

## Key files

- packages/store/src/lib/StoreSideEffects.ts - Side effect registration and execution
- packages/editor/src/lib/editor/Editor.ts - Editor-level side effect setup

## Related

- [Store](../packages/store.md)
- [History system](./history-system.md)
