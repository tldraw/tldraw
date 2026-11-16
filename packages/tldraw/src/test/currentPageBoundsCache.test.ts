import {
	BaseBoxShapeUtil,
	Box,
	CurrentPageBoundsCache,
	PageRecordType,
	Rectangle2d,
	TLBaseBoxShape,
	TLShape,
	TLShapeId,
	atom,
	createShapeId,
	react,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

let editor: TestEditor
let cache: CurrentPageBoundsCache
let stop: () => void
let invalidations: number

const ids = {
	box: createShapeId('box'),
	frame: createShapeId('frame'),
	child: createShapeId('child'),
	arrow: createShapeId('arrow'),
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
	const want = expected()
	expect(new Set(actual.keys())).toEqual(new Set(want.keys()))
	for (const [id, bounds] of want) {
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
	cache = new CurrentPageBoundsCache(editor, 'test cache', (shape: TLShape) =>
		shape.meta.skip ? undefined : editor.getShapeMaskedPageBounds(shape.id)
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

describe('CurrentPageBoundsCache', () => {
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
		expect(invalidations).toBe(1)
	})

	it('drops the children of a deleted frame', () => {
		editor.deleteShapes([ids.frame])
		expect([...cache.get().keys()]).toEqual([ids.box])
	})

	it('drops the children of a frame removed without them', () => {
		editor.store.remove([ids.frame])
		expect(editor.store.has(ids.child)).toBe(true)
		expect([...cache.get().keys()]).toEqual([ids.box])
	})

	it('drops a shape that leaves the current page without a page change', () => {
		const pageId = PageRecordType.createId('other')
		editor.createPage({ id: pageId, name: 'Other' })
		editor.store.put([{ ...editor.getShape(ids.frame)!, parentId: pageId }])
		expect([...cache.get().keys()]).toEqual([ids.box])
	})

	it('keeps a shape that is removed and added again before the next read', () => {
		const box = editor.getShape(ids.box)!
		editor.run(() => {
			editor.store.remove([ids.box])
			editor.store.put([{ ...box, x: 700 }])
		})
		expect(cache.get().get(ids.box)!.x).toBe(700)
		expectCacheToMatch()
	})

	it('rebuilds when the theme resizes shapes', () => {
		const text = createShapeId('text')
		editor.createShape({ id: text, type: 'text', x: 0, y: 500, props: { autoSize: true } })
		const before = cache.get().get(text)!.clone()

		editor.updateTheme({ ...editor.getTheme('default')!, fontSize: 64 })
		expect(cache.get().get(text)!.h).toBeGreaterThan(before.h)
		expectCacheToMatch()
	})

	it('reclips a child when its frame is resized', () => {
		editor.updateShape({ id: ids.frame, type: 'frame', props: { w: 400 } })
		expect(cache.get().get(ids.child)!.toJson()).toEqual({ x: 350, y: 50, w: 100, h: 100 })
		expectCacheToMatch()
	})

	it('reclips siblings when a clip path derived from children changes', () => {
		// A clipping container whose geometry spans its first child, so moving that child changes
		// the clip for the others without touching the container's record.
		class FitClipShapeUtil extends BaseBoxShapeUtil<TLBaseBoxShape> {
			static override type = 'fit-clip' as const
			override getDefaultProps() {
				return { w: 1, h: 1 }
			}
			override getGeometry(shape: TLBaseBoxShape) {
				const [firstId] = this.editor.getSortedChildIdsForParent(shape.id)
				const first = firstId && this.editor.getShape(firstId)
				if (!first) return new Rectangle2d({ width: 1, height: 1, isFilled: true })
				const bounds = this.editor.getShapeGeometry(first).bounds
				return new Rectangle2d({
					width: first.x + bounds.maxX,
					height: first.y + bounds.maxY,
					isFilled: true,
				})
			}
			override getClipPath(shape: TLBaseBoxShape) {
				return this.editor.getShapeGeometry(shape).vertices
			}
			override component() {
				return null
			}
			override indicator() {
				return null
			}
			override getIndicatorPath(): undefined {
				return undefined
			}
		}

		stop()
		editor.dispose()
		editor = new TestEditor({ shapeUtils: [FitClipShapeUtil] })
		const container = createShapeId('container')
		const a = createShapeId('a')
		const b = createShapeId('b')
		editor.createShapes([
			{ id: container, type: 'fit-clip' as any, x: 0, y: 0 },
			{ id: a, type: 'geo', parentId: container, x: 0, y: 0, props: { w: 100, h: 100 } },
			// Clipped to the container's 100px height until `a` moves down.
			{ id: b, type: 'geo', parentId: container, x: 0, y: 0, props: { w: 100, h: 300 } },
		])
		cache = new CurrentPageBoundsCache(editor, 'test cache', (shape: TLShape) =>
			editor.getShapeMaskedPageBounds(shape.id)
		)
		stop = react('read cache', () => cache.get())
		expectCacheToMatch()

		editor.updateShape({ id: a, type: 'geo', y: 400 })
		expect(cache.get().get(b)!.toJson()).toEqual({ x: 0, y: 0, w: 100, h: 300 })
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
		// Still clipped to the same sliver of the frame.
		editor.updateShape({ id: ids.child, type: 'geo', props: { w: 300 } })
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

	it('leaves out hidden shapes, and follows visibility that changes without a shape change', () => {
		const hideFrames = atom('hide frames', true)
		editor.dispose()
		editor = new TestEditor({
			getShapeVisibility: (shape) =>
				shape.type === 'frame' && hideFrames.get() ? 'hidden' : 'inherit',
		})
		editor.createShapes([
			{ id: ids.box, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: ids.frame, type: 'frame', x: 200, y: 0, props: { w: 200, h: 200 } },
		])
		expect(editor.getCurrentPageBounds()!.toJson()).toEqual({ x: 0, y: 0, w: 100, h: 100 })

		hideFrames.set(false)
		expect(editor.getCurrentPageBounds()!.toJson()).toEqual({ x: 0, y: 0, w: 400, h: 200 })
	})
})
