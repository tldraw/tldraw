import { TLShapeId, createShapeId, react } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../../../../test/TestEditor'
import { MinimapShapeLayer, MinimapShapeLayerView } from './MinimapShapeLayer'

// jsdom has no canvas, so the layer paints into a context that records what it was asked to do.
class RecordingPath2D {
	rects: number[][] = []
	rect(x: number, y: number, w: number, h: number) {
		this.rects.push([x, y, w, h])
	}
}

interface Paint {
	clip: number[][] | null
	shapes: number[][]
	selected: number[][]
}

let editor: TestEditor
let layer: MinimapShapeLayer
let paints: Paint[]
let stopReading: () => void
let blits: number[][]

const fills = { shape: 'grey', selected: 'blue' }
// 320x160 device pixels showing page (0, 0) to (3200, 1600): ten page units per pixel.
const view: MinimapShapeLayerView = { width: 320, height: 160, minX: 0, minY: 0, scale: 0.1 }

function createLayerContext() {
	let clip: number[][] | null = null
	let fillStyle = ''
	let paint: Paint | undefined
	return new Proxy(
		{},
		{
			set(_, key, value) {
				if (key === 'fillStyle') fillStyle = value
				return true
			},
			get(_, key) {
				if (key === 'clip') return (path: RecordingPath2D) => (clip = path.rects)
				if (key === 'restore') return () => (clip = null)
				if (key === 'clearRect')
					return () => paints.push((paint = { clip, shapes: [], selected: [] }))
				if (key === 'fill') {
					return (path: RecordingPath2D) => {
						if (fillStyle === fills.shape) paint!.shapes = path.rects
						else paint!.selected = path.rects
					}
				}
				return () => {}
			},
		}
	)
}

const target = new Proxy(
	{},
	{
		set: () => true,
		get: (_, key) =>
			key === 'drawImage' ? (_c: unknown, ...args: number[]) => blits.push(args) : () => {},
	}
) as CanvasRenderingContext2D

function draw(v = view) {
	paints = []
	blits = []
	layer.draw(target, v, fills)
	return paints
}

function createGrid(count: number) {
	const ids: TLShapeId[] = []
	editor.createShapes(
		Array.from({ length: count }, (_, i) => {
			ids.push(createShapeId())
			return {
				id: ids[i],
				type: 'geo' as const,
				x: (i % 32) * 100,
				y: Math.floor(i / 32) * 100,
				props: { w: 50, h: 50 },
			}
		})
	)
	return ids
}

beforeEach(() => {
	vi.stubGlobal('Path2D', RecordingPath2D)
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
		() => createLayerContext() as any
	)
	editor = new TestEditor({ options: { maxShapesPerPage: Infinity } })
	layer = new MinimapShapeLayer(editor, document)
	// The editor frees its bounds map unless a reaction is reading it, as the minimap's render
	// does. Without one, every draw in a new task would start from a rebuild.
	stopReading = react('read bounds', () => editor.getCurrentPageShapeMaskedBounds())
})

afterEach(() => {
	stopReading()
	layer.dispose()
	editor.dispose()
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

describe('MinimapShapeLayer', () => {
	it('paints every shape once, then only draws the layer', () => {
		createGrid(64)
		expect(draw()).toMatchObject([{ clip: null, shapes: { length: 64 }, selected: [] }])
		expect(blits).toEqual([[0, 0]])

		expect(draw()).toEqual([])
		expect(blits).toEqual([[0, 0]])
	})

	it('repaints only the tiles a moved shape leaves and enters', () => {
		const ids = createGrid(64)
		draw()

		// From the top left tile to one near the right edge.
		editor.updateShape({ id: ids[0], type: 'geo', x: 3000, y: 10 })
		const [paint, ...rest] = draw()
		expect(rest).toEqual([])
		expect(paint.clip).toEqual([
			[0, 0, 16, 16],
			[288, 0, 32, 16],
		])
		// The moved shape, plus its neighbours in those tiles.
		expect(paint.shapes).toContainEqual([3000, 10, 50, 50])
		expect(paint.shapes.length).toBeLessThan(20)
	})

	it('repaints a shape in the selected fill when it is selected, and back again', () => {
		const ids = createGrid(64)
		draw()

		editor.select(ids[40])
		expect(draw()).toMatchObject([{ clip: [[64, 0, 32, 16]], selected: [[800, 100, 50, 50]] }])

		editor.selectNone()
		expect(draw()).toMatchObject([{ clip: [[64, 0, 32, 16]], selected: [] }])
	})

	describe('with shapes that hide in the minimap', () => {
		const ids = {
			box: createShapeId('box'),
			other: createShapeId('other'),
			arrow: createShapeId('arrow'),
			line: createShapeId('line'),
		}
		let nudge = 0

		// What a repaint of the whole layer draws. A new view forces one on a small page.
		function expectToDraw(shapeIds: TLShapeId[]) {
			const [paint, ...rest] = draw({ ...view, minY: -++nudge })
			expect(rest).toEqual([])
			expect(paint.clip).toBeNull()
			const want = shapeIds.map((id) => {
				const { x, y, w, h } = editor.getShapeMaskedPageBounds(id)!
				return [x, y, w, h]
			})
			const drawn = [...paint.shapes, ...paint.selected]
			expect(drawn).toEqual(expect.arrayContaining(want))
			expect(drawn).toHaveLength(want.length)
		}

		beforeEach(() => {
			editor.createShapes([
				{ id: ids.box, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
				{ id: ids.other, type: 'geo', x: 300, y: 0, props: { w: 100, h: 100 } },
				{ id: ids.arrow, type: 'arrow', x: 0, y: 300 },
			])
			editor.selectNone()
		})

		it('leaves out arrows and lines from the start', () => {
			expectToDraw([ids.box, ids.other])
		})

		it('stays correct as hidden shapes are created, moved and deleted', () => {
			draw()
			editor.createShape({ id: ids.line, type: 'line', x: 500, y: 500 })
			expectToDraw([ids.box, ids.other])

			editor.updateShape({ id: ids.arrow, type: 'arrow', x: 700, y: 700 })
			editor.updateShape({ id: ids.box, type: 'geo', x: -200 })
			expectToDraw([ids.box, ids.other])

			editor.markHistoryStoppingPoint()
			editor.deleteShapes([ids.arrow, ids.line])
			expectToDraw([ids.box, ids.other])

			editor.undo()
			expect(editor.getShape(ids.arrow)).toBeDefined()
			expectToDraw([ids.box, ids.other])
		})

		it('repaints the tiles of a shape whose record changes what its util answers', () => {
			const util = editor.getShapeUtil('geo')
			util.hideInMinimap = (shape) => !!shape.meta.hidden
			draw()

			// The bounds don't change, so only the hidden set says to repaint.
			editor.updateShape({ id: ids.box, type: 'geo', meta: { hidden: true } })
			expect(draw()).toMatchObject([{ clip: [[0, 0, 16, 16]], shapes: [] }])
			expectToDraw([ids.other])

			editor.updateShape({ id: ids.box, type: 'geo', meta: { hidden: false } })
			expect(draw({ ...view, minY: -nudge })).toMatchObject([{ shapes: [[0, 0, 100, 100]] }])
			expectToDraw([ids.box, ids.other])
		})

		it('keeps hidden shapes out after switching pages and back', () => {
			const firstPage = editor.getCurrentPageId()
			editor.createPage({ name: 'Other' })
			editor.setCurrentPage(editor.getPages()[1].id)
			expectToDraw([])

			editor.setCurrentPage(firstPage)
			expectToDraw([ids.box, ids.other])
		})
	})

	it('repaints everything when a change touches most of the layer', () => {
		const ids = createGrid(512)
		draw()
		editor.updateShapes(ids.map((id) => ({ id, type: 'geo', props: { w: 60 } })))
		expect(draw()).toMatchObject([{ clip: null, shapes: { length: 512 } }])
	})

	it('repaints straight away for a new view on a small page', () => {
		createGrid(64)
		draw()
		expect(draw({ ...view, minX: -100 })).toMatchObject([{ clip: null, shapes: { length: 64 } }])
		expect(blits).toEqual([[0, 0]])
	})

	describe('on a large page', () => {
		let ids: TLShapeId[]
		const zoomedOut = { ...view, minX: -1600, minY: -800, scale: 0.05 }

		beforeEach(() => {
			ids = createGrid(2400)
			draw()
		})

		it('draws the old layer scaled while the view changes, and repaints once it holds still', () => {
			expect(draw(zoomedOut)).toEqual([])
			// The layer's page area, placed where it falls in the new view.
			expect(blits).toEqual([[80, 40, 160, 80]])

			// Still the old layer until the view has held still for a moment.
			vi.advanceTimersByTime(50)
			expect(draw(zoomedOut)).toEqual([])

			vi.advanceTimersByTime(200)
			expect(draw(zoomedOut)).toMatchObject([{ clip: null, shapes: { length: 2400 } }])
			expect(blits).toEqual([[0, 0]])
		})

		it('keeps painting changes into the old layer in the meantime', () => {
			draw(zoomedOut)
			editor.updateShape({ id: ids[0], type: 'geo', x: 20 })
			expect(draw(zoomedOut)).toMatchObject([{ clip: [[0, 0, 16, 16]] }])
			expect(blits).toEqual([[80, 40, 160, 80]])
		})

		it('repaints straight away when a shape lands outside the old layer', () => {
			draw(zoomedOut)
			editor.updateShape({ id: ids[0], type: 'geo', x: -1000 })
			expect(draw(zoomedOut)).toMatchObject([{ clip: null, shapes: { length: 2400 } }])
		})

		it('repaints straight away when the old layer would be scaled too far', () => {
			expect(draw({ ...view, scale: 0.04 })).toMatchObject([{ clip: null }])
			expect(draw({ ...view, scale: 0.09 })).toMatchObject([{ clip: null }])
		})

		it('repaints straight away when the page changes', () => {
			draw(zoomedOut)
			editor.createPage({ name: 'Other' })
			editor.setCurrentPage(editor.getPages()[1].id)
			expect(draw(zoomedOut)).toMatchObject([{ clip: null, shapes: [] }])
		})
	})
})
