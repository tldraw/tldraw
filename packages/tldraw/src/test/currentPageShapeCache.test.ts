import {
	Box,
	CurrentPageShapeCache,
	PageRecordType,
	TLShape,
	TLShapeId,
	createShapeId,
	react,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor
let cache: CurrentPageShapeCache<Box>
let stop: () => void
let invalidations: number

const ids = {
	box: createShapeId('box'),
	frame: createShapeId('frame'),
	child: createShapeId('child'),
	arrow: createShapeId('arrow'),
	hidden: createShapeId('hidden'),
}

// What a computed that reads every shape would produce.
function expected() {
	const result = new Map<TLShapeId, Box>()
	for (const id of editor.getCurrentPageShapeIdsSorted()) {
		const shape = editor.getShape(id)!
		const bounds = shape.meta.skip ? undefined : editor.getShapeMaskedPageBounds(id)
		if (bounds) result.set(id, bounds)
	}
	return result
}

function expectCacheToMatch() {
	const actual = new Map(cache.get())
	expect(new Set(actual.keys())).toEqual(new Set(expected().keys()))
	for (const [id, bounds] of expected()) {
		expect(actual.get(id)!.toJson()).toEqual(bounds.toJson())
	}
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: ids.box, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
		{ id: ids.frame, type: 'frame', x: 200, y: 0, props: { w: 200, h: 200 } },
		// Half way out of the frame, so its masked bounds are clipped.
		{ id: ids.child, type: 'geo', parentId: ids.frame, x: 150, y: 50, props: { w: 100, h: 100 } },
	])
	cache = new CurrentPageShapeCache<Box>(
		editor,
		'test cache',
		(shape: TLShape) => (shape.meta.skip ? undefined : editor.getShapeMaskedPageBounds(shape.id)),
		Box.Equals
	)
	invalidations = -1
	stop = react('count invalidations', () => {
		cache.get()
		invalidations++
	})
})

afterEach(() => {
	stop()
	editor.dispose()
})

describe('CurrentPageShapeCache', () => {
	it('starts with every shape on the page', () => {
		expect(cache.get().size).toBe(3)
		expect(cache.get().get(ids.child)!.toJson()).toEqual({ x: 350, y: 50, w: 50, h: 100 })
		expectCacheToMatch()
	})

	it('follows shapes being moved, created and deleted', () => {
		editor.updateShape({ id: ids.box, type: 'geo', x: -500 })
		expectCacheToMatch()

		editor.createShape({ type: 'geo', x: 900, y: 900, props: { w: 10, h: 10 } })
		expectCacheToMatch()

		editor.deleteShapes([ids.box])
		expectCacheToMatch()

		editor.undo()
		expectCacheToMatch()
		expect(invalidations).toBe(4)
	})

	it('follows a child when its parent moves', () => {
		editor.updateShape({ id: ids.frame, type: 'frame', x: 1000, y: 1000 })
		expect(cache.get().get(ids.child)!.toJson()).toEqual({ x: 1150, y: 1050, w: 50, h: 100 })
		expectCacheToMatch()
	})

	it('reclips a child when its frame is resized', () => {
		editor.updateShape({ id: ids.frame, type: 'frame', props: { w: 400 } })
		expect(cache.get().get(ids.child)!.toJson()).toEqual({ x: 350, y: 50, w: 100, h: 100 })
		expectCacheToMatch()
	})

	it('follows reparenting in and out of a frame', () => {
		editor.reparentShapes([ids.child], editor.getCurrentPageId())
		expectCacheToMatch()
		editor.reparentShapes([ids.box], ids.frame)
		expectCacheToMatch()
	})

	it('follows an arrow when the shape it is bound to moves', () => {
		editor.createShape({ id: ids.arrow, type: 'arrow', x: 0, y: 300 })
		editor.createBinding({
			type: 'arrow',
			fromId: ids.arrow,
			toId: ids.box,
			props: {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
			},
		})
		expectCacheToMatch()

		const before = cache.get().get(ids.arrow)!.clone()
		editor.updateShape({ id: ids.box, type: 'geo', x: 600, y: -300 })
		expect(cache.get().get(ids.arrow)!.toJson()).not.toEqual(before.toJson())
		expectCacheToMatch()
	})

	it('follows a group when one of its children moves', () => {
		const other = createShapeId('other')
		editor.createShape({ id: other, type: 'geo', x: 0, y: 300, props: { w: 100, h: 100 } })
		editor.groupShapes([ids.box, other])
		expectCacheToMatch()

		editor.updateShape({ id: other, type: 'geo', x: 50 })
		expectCacheToMatch()
	})

	it('leaves out shapes whose value is undefined, and picks them up again', () => {
		editor.updateShape({ id: ids.box, type: 'geo', meta: { skip: true } })
		expect(cache.get().has(ids.box)).toBe(false)

		editor.updateShape({ id: ids.box, type: 'geo', meta: { skip: false } })
		expect(cache.get().has(ids.box)).toBe(true)
		expectCacheToMatch()
	})

	it('rebuilds when the current page changes', () => {
		const pageId = PageRecordType.createId('other')
		editor.createPage({ id: pageId, name: 'Other' })
		editor.setCurrentPage(pageId)
		expect(cache.get().size).toBe(0)

		editor.createShape({ type: 'geo', x: 0, y: 0, props: { w: 10, h: 10 } })
		expectCacheToMatch()

		editor.moveShapesToPage([editor.getCurrentPageShapes()[0].id], editor.getPages()[0].id)
		expectCacheToMatch()
		expect(cache.get().size).toBe(4)
	})

	it('does not invalidate dependents when no value changed', () => {
		editor.updateShape({ id: ids.box, type: 'geo', props: { color: 'red' } })
		editor.select(ids.box)
		editor.setCamera({ x: 100, y: 100, z: 2 })
		expect(invalidations).toBe(0)
	})
})

describe('editor.getCurrentPageBounds', () => {
	it('stays current as shapes change', () => {
		expect(editor.getCurrentPageBounds()!.toJson()).toEqual({ x: 0, y: 0, w: 400, h: 200 })

		editor.updateShape({ id: ids.box, type: 'geo', x: -100 })
		expect(editor.getCurrentPageBounds()!.toJson()).toEqual({ x: -100, y: 0, w: 500, h: 200 })

		editor.updateShape({ id: ids.frame, type: 'frame', y: 300 })
		expect(editor.getCurrentPageBounds()!.toJson()).toEqual({ x: -100, y: 0, w: 500, h: 500 })

		editor.deleteShapes([ids.frame])
		expect(editor.getCurrentPageBounds()!.toJson()).toEqual({ x: -100, y: 0, w: 100, h: 100 })

		editor.deleteShapes([ids.box])
		expect(editor.getCurrentPageBounds()).toBeUndefined()
	})
})
