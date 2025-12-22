---
title: Binding system
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - bindings
  - bindingutil
  - relationships
  - architecture
status: published
date: 12/19/2025
order: 1
---

The binding system maintains persistent relationships between shapes. A binding is a record that points from one shape (`fromId`) to another (`toId`) and carries relationship-specific data. The system powers arrow attachments and any feature where shapes need to stay synchronized.

## Key components

### Binding records

Bindings are stored as records with a directional relationship:

```typescript
interface TLBaseBinding<Type, Props> {
	id: TLBindingId
	typeName: 'binding'
	type: Type
	fromId: TLShapeId
	toId: TLShapeId
	props: Props
	meta: JsonObject
}
```

### BindingUtil

Each binding type defines a `BindingUtil` that supplies defaults and reacts to lifecycle events:

```typescript
class MyBindingUtil extends BindingUtil<MyBinding> {
	static override type = 'myBinding' as const
	static override props = myBindingProps

	getDefaultProps(): Partial<MyBinding['props']> {
		return { strength: 1.0 }
	}

	onAfterChangeToShape({ binding, shapeAfter }) {
		// Update the owner shape when the target changes
	}
}
```

### Editor APIs

The Editor exposes methods to query, create, update, and delete bindings. These operations drive the binding lifecycle hooks and keep related shapes in sync.

## Data flow

1. A binding record is created and validated.
2. `BindingUtil` hooks run before and after the record is written.
3. When either bound shape changes, the binding hooks respond.
4. If shapes are separated or deleted, isolation and deletion hooks run before the binding is removed.

## Extension points

- Define custom binding types in `@tldraw/tlschema`.
- Implement a `BindingUtil` for behavior and lifecycle hooks.
- Use `canBind` in a `ShapeUtil` to control which shapes accept bindings.

## Key files

- packages/editor/src/lib/editor/bindings/BindingUtil.ts - BindingUtil base class
- packages/tlschema/src/bindings/TLBaseBinding.ts - Base binding type definition
- packages/tlschema/src/bindings/TLArrowBinding.ts - Arrow binding definition
- packages/tldraw/src/lib/bindings/arrow/ArrowBindingUtil.ts - Arrow binding implementation
- packages/editor/src/lib/editor/Editor.ts - Editor binding methods

## Related

- [Shape system](./shape-system.md) - Shapes that bindings connect
- [Tool system](./tool-system.md) - Tools that create and modify bindings
- [Migrations](./migrations.md) - Schema versioning for bindings
