---
name: write-unit-tests
description: Writing unit and integration tests for the tldraw SDK. Use when creating new tests, adding test coverage, or fixing failing tests in packages/editor or packages/tldraw. Covers Vitest patterns, TestEditor usage, and test file organization.
---

# Writing tests

Unit and integration tests use Vitest. Tests run from workspace directories, not the repo root.

## Test file locations

**Unit tests** - alongside source files:

```
packages/editor/src/lib/primitives/Vec.ts
packages/editor/src/lib/primitives/Vec.test.ts  # Same directory
```

**Integration tests** - in `src/test/` directory:

```
packages/tldraw/src/test/SelectTool.test.ts
packages/tldraw/src/test/commands/createShape.test.ts
```

**Shape/tool tests** - alongside the implementation:

```
packages/tldraw/src/lib/shapes/arrow/ArrowShapeUtil.test.ts
packages/tldraw/src/lib/shapes/arrow/ArrowShapeTool.test.ts
```

## Which workspace to test in

- **packages/editor**: Core primitives, geometry, managers, base editor functionality
- **packages/tldraw**: Anything needing default shapes/tools (most integration tests)

```bash
cd packages/tldraw && yarn test run
cd packages/tldraw && yarn test run --grep "SelectTool"
```

## TestEditor vs Editor

Use `TestEditor` for integration tests (includes default shapes/tools):

```typescript
import { createShapeId } from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
})

afterEach(() => {
	editor?.dispose()
})
```

Use raw `Editor` when testing editor setup or custom configurations:

```typescript
import { Editor, createTLStore } from '@tldraw/editor'

beforeEach(() => {
	editor = new Editor({
		shapeUtils: [CustomShape],
		bindingUtils: [],
		tools: [CustomTool],
		store: createTLStore({ shapeUtils: [CustomShape], bindingUtils: [] }),
		getContainer: () => document.body,
	})
})
```

## Common TestEditor methods

```typescript
// Pointer simulation
editor.pointerDown(x, y, options?)
editor.pointerMove(x, y, options?)
editor.pointerUp(x, y, options?)
editor.click(x, y, shapeId?)
editor.doubleClick(x, y, shapeId?)

// Keyboard simulation
editor.keyDown(key, options?)
editor.keyUp(key, options?)

// State assertions
editor.expectToBeIn('select.idle')
editor.expectToBeIn('select.crop.idle')

// Shape assertions
editor.expectShapeToMatch({ id, x, y, props: { ... } })

// Shape operations
editor.createShapes([{ id, type, x, y, props }])
editor.updateShapes([{ id, type, props }])
editor.getShape(id)
editor.select(id1, id2)
editor.selectAll()
editor.selectNone()
editor.getSelectedShapeIds()
editor.getOnlySelectedShape()

// Tool operations
editor.setCurrentTool('arrow')
editor.getCurrentToolId()

// Undo/redo
editor.undo()
editor.redo()
```

## Pointer event options

```typescript
editor.pointerDown(100, 100, {
	target: 'shape', // 'canvas' | 'shape' | 'handle' | 'selection'
	shape: editor.getShape(id),
})

editor.pointerDown(150, 300, {
	target: 'selection',
	handle: 'bottom', // 'top' | 'bottom' | 'left' | 'right' | corners
})

editor.doubleClick(550, 550, {
	target: 'selection',
	handle: 'bottom_right',
})
```

## Setup patterns

### Standard setup with shape IDs

```typescript
const ids = {
	box1: createShapeId('box1'),
	box2: createShapeId('box2'),
	arrow1: createShapeId('arrow1'),
}

vi.useFakeTimers()

beforeEach(() => {
	editor = new TestEditor()
	editor.selectAll().deleteShapes(editor.getSelectedShapeIds())
	editor.createShapes([
		{ id: ids.box1, type: 'geo', x: 100, y: 100, props: { w: 100, h: 100 } },
		{ id: ids.box2, type: 'geo', x: 300, y: 300, props: { w: 100, h: 100 } },
	])
})

afterEach(() => {
	editor?.dispose()
})
```

### Reusable props

```typescript
const imageProps = {
	assetId: null,
	playing: true,
	url: '',
	w: 1200,
	h: 800,
}

editor.createShapes([
	{ id: ids.imageA, type: 'image', x: 100, y: 100, props: imageProps },
	{ id: ids.imageB, type: 'image', x: 500, y: 500, props: { ...imageProps, w: 600, h: 400 } },
])
```

### Helper functions

```typescript
function arrow(id = ids.arrow1) {
	return editor.getShape(id) as TLArrowShape
}

function bindings(id = ids.arrow1) {
	return getArrowBindings(editor, arrow(id))
}
```

## Mocking with vi.spyOn

```typescript
// Mock return value
vi.spyOn(editor, 'getIsReadonly').mockReturnValue(true)

// Mock implementation
const isHiddenSpy = vi.spyOn(editor, 'isShapeHidden')
isHiddenSpy.mockImplementation((shape) => shape.id === ids.hiddenShape)

// Verify calls
const spy = vi.spyOn(editor, 'setSelectedShapes')
editor.selectAll()
expect(spy).toHaveBeenCalled()
expect(spy).not.toHaveBeenCalled()

// Always restore
isHiddenSpy.mockRestore()
```

## Fake timers

```typescript
vi.useFakeTimers()

// Mock animation frame
window.requestAnimationFrame = (cb) => setTimeout(cb, 1000 / 60)
window.cancelAnimationFrame = (id) => clearTimeout(id)

it('handles animation', () => {
	editor.alignShapes(editor.getSelectedShapeIds(), 'right')
	vi.advanceTimersByTime(1000)
	// Assert after animation completes
})
```

## Assertions

### Shape matching

```typescript
// Partial matching (most common)
expect(editor.getShape(id)).toMatchObject({
	type: 'geo',
	x: 100,
	props: { w: 100 },
})

editor.expectShapeToMatch({
	id: ids.box1,
	x: 350,
	y: 350,
})

// Floating point matching (custom matcher)
expect(result).toCloselyMatchObject({
	props: { normalizedAnchor: { x: 0.5, y: 0.75 } },
})
```

### Array assertions

```typescript
expect(editor.getSelectedShapeIds()).toMatchObject([ids.box1])
expect(Array.from(selectedIds).sort()).toEqual([id1, id2, id3].sort())
expect(shapes).toContain('geo')
expect(shapes).not.toContain(ids.lockedShape)
```

### State assertions

```typescript
editor.expectToBeIn('select.idle')
editor.expectToBeIn('select.brushing')
editor.expectToBeIn('select.crop.idle')
```

## Testing undo/redo

```typescript
it('handles undo/redo', () => {
	editor.doubleClick(550, 550, ids.image)
	editor.expectToBeIn('select.crop.idle')

	editor.updateShape({ id: ids.image, type: 'image', props: { crop: newCrop } })

	editor.undo()
	editor.expectToBeIn('select.crop.idle')
	expect(editor.getShape(ids.image)!.props.crop).toMatchObject(originalCrop)

	editor.redo()
	expect(editor.getShape(ids.image)!.props.crop).toMatchObject(newCrop)
})
```

## Testing TypeScript types

```typescript
it('Uses typescript generics', () => {
	expect(() => {
		// @ts-expect-error - wrong props type
		editor.createShape({ id, type: 'geo', props: { w: 'OH NO' } })

		// @ts-expect-error - unknown prop
		editor.createShape({ id, type: 'geo', props: { foo: 'bar' } })

		// Valid
		editor.createShape<TLGeoShape>({ id, type: 'geo', props: { w: 100 } })
	}).toThrow()
})
```

## Testing custom shapes

```typescript
declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		'my-custom-shape': { w: number; h: number; text: string | undefined }
	}
}

class CustomShape extends ShapeUtil<ICustomShape> {
	static override type = 'my-custom-shape'
	static override props: RecordProps<ICustomShape> = {
		w: T.number,
		h: T.number,
		text: T.string.optional(),
	}
	getDefaultProps() {
		return { w: 200, h: 200, text: '' }
	}
	getGeometry(shape) {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h })
	}
	indicator() {}
	component() {}
}
```

## Testing side effects

```typescript
beforeEach(() => {
	editor = new TestEditor()
	editor.sideEffects.registerAfterChangeHandler('instance_page_state', (prev, next) => {
		if (prev.croppingShapeId !== next.croppingShapeId) {
			// Handle state change
		}
	})
})
```

## Testing events

```typescript
it('emits wheel events', () => {
	const handler = vi.fn()
	editor.on('event', handler)

	editor.dispatch({
		type: 'wheel',
		name: 'wheel',
		delta: { x: 0, y: 10, z: 0 },
		point: { x: 100, y: 100, z: 1 },
		shiftKey: false,
		// ... other modifiers
	})
	editor.emit('tick', 16) // Flush batched events

	expect(handler).toHaveBeenCalledWith(expect.objectContaining({ name: 'wheel' }))
})
```

## Method chaining

```typescript
editor
	.expectToBeIn('select.idle')
	.select(ids.imageA, ids.imageB)
	.doubleClick(550, 550, { target: 'selection', handle: 'bottom_right' })
	.expectToBeIn('select.idle')

editor.setCurrentTool('arrow').pointerDown(0, 0).pointerMove(100, 100).pointerUp()
```

## Running tests

```bash
cd packages/tldraw && yarn test run
cd packages/tldraw && yarn test run --grep "arrow"
cd packages/editor && yarn test run --grep "Vec"

# Watch mode
cd packages/tldraw && yarn test
```

## Key patterns summary

- Use `createShapeId()` for shape IDs
- Use `vi.useFakeTimers()` for time-dependent behavior
- Clear shapes in `beforeEach`, dispose in `afterEach`
- Test in `packages/tldraw` for shapes/tools
- Use `expectToBeIn()` for state machine assertions
- Use `toMatchObject()` for partial matching
- Use `toCloselyMatchObject()` for floating point values
- Mock with `vi.spyOn()` and always `mockRestore()`
