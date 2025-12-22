---
title: Custom bindings
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - bindings
  - relationships
  - custom
  - tutorial
  - guide
status: published
date: 12/19/2025
order: 0
---

Bindings define relationships between two shapes. This guide shows how to define a binding type, implement a `BindingUtil`, and register it with the editor.

## Prerequisites

- A tldraw app using `@tldraw/tldraw`
- Familiarity with custom shapes and IDs

## Steps

### 1. Define the binding type

```typescript
import { BindingUtil, TLBaseBinding, RecordProps, T } from 'tldraw'

type StickerBinding = TLBaseBinding<
	'sticker',
	{
		anchor: { x: number; y: number }
	}
>

const stickerProps: RecordProps<StickerBinding> = {
	anchor: T.object({ x: T.number, y: T.number }),
}
```

### 2. Implement a BindingUtil

```typescript
class StickerBindingUtil extends BindingUtil<StickerBinding> {
	static override type = 'sticker' as const
	static override props = stickerProps

	getDefaultProps() {
		return { anchor: { x: 0.5, y: 0.5 } }
	}

	onAfterChangeToShape({ binding, shapeAfter }) {
		// Update the from-shape when the target changes
		const fromShape = this.editor.getShape(binding.fromId)
		if (!fromShape) return
		// Apply updates as needed
	}
}
```

### 3. Register the binding

```tsx
import { Tldraw } from 'tldraw'

function App() {
	return <Tldraw bindingUtils={[StickerBindingUtil]} />
}
```

## Tips

- Use `canBind` on shapes to control which bindings are allowed.
- Keep hooks side-effect safe to avoid infinite loops.

## Key files

- packages/editor/src/lib/editor/bindings/BindingUtil.ts - Binding utility base class
- packages/tlschema/src/bindings/TLBaseBinding.ts - Base binding type

## Related

- [Binding system](../architecture/binding-system.md)
- [Custom shapes](./custom-shapes.md)
