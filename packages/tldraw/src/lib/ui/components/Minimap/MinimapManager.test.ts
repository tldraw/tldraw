import { Box, TLShapeId, createShapeId } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from '../../../../test/TestEditor'
import { MinimapManager } from './MinimapManager'

// jsdom has no canvas, so record the rects each path is built from instead.
class RecordingPath2D {
	rects: Box[] = []
	rect(x: number, y: number, w: number, h: number) {
		this.rects.push(new Box(x, y, w, h))
	}
}

let editor: TestEditor
let minimap: MinimapManager

const ids = {
	box: createShapeId('box'),
	other: createShapeId('other'),
	arrow: createShapeId('arrow'),
	line: createShapeId('line'),
}

beforeAll(() => {
	vi.stubGlobal('Path2D', RecordingPath2D)
	vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
		() => new Proxy({}, { get: () => () => {} }) as any
	)
})

afterAll(() => {
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
})

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: ids.box, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
		{ id: ids.other, type: 'geo', x: 300, y: 0, props: { w: 100, h: 100 } },
		{ id: ids.arrow, type: 'arrow', x: 0, y: 300 },
	])
	editor.selectNone()
	const container = document.createElement('div')
	const canvas = document.createElement('canvas')
	container.appendChild(canvas)
	minimap = new MinimapManager(editor, canvas, container)
})

afterEach(() => {
	minimap.close()
	editor.dispose()
})

function drawnRects() {
	const { shapes, selected } = (minimap as any).getShapePaths() as Record<string, RecordingPath2D>
	return [...shapes.rects, ...selected.rects].map((rect) => rect.toJson())
}

function expectToDraw(shapeIds: TLShapeId[]) {
	const want = shapeIds.map((id) => editor.getShapeMaskedPageBounds(id)!.toJson())
	expect(drawnRects()).toEqual(expect.arrayContaining(want))
	expect(drawnRects()).toHaveLength(want.length)
}

describe('shapes that hide themselves from the minimap', () => {
	it('leaves out arrows and lines from the start', () => {
		expectToDraw([ids.box, ids.other])
	})

	it('stays correct as hidden shapes are created, moved and deleted', () => {
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

	it('follows a shape whose record changes what its util answers', () => {
		const util = editor.getShapeUtil('geo')
		util.hideInMinimap = (shape) => !!shape.meta.hidden

		editor.updateShape({ id: ids.box, type: 'geo', meta: { hidden: true } })
		expectToDraw([ids.other])

		editor.updateShape({ id: ids.box, type: 'geo', meta: { hidden: false } })
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

describe('closing the minimap', () => {
	const heldBounds = () => (editor as any)._currentPageMaskedBounds.maps?.bounds
	const endOfTask = () => new Promise<void>((resolve) => queueMicrotask(resolve))

	it("frees the editor's bounds map when nothing else reads it", async () => {
		await endOfTask()
		expect(heldBounds().size).toBe(3)

		minimap.close()
		await endOfTask()
		expect(heldBounds()).toBeUndefined()
	})

	it('keeps the map while another minimap is still open', async () => {
		const container = document.createElement('div')
		const canvas = document.createElement('canvas')
		container.appendChild(canvas)
		const other = new MinimapManager(editor, canvas, container)

		minimap.close()
		await endOfTask()
		expect(heldBounds().size).toBe(3)

		other.close()
		await endOfTask()
		expect(heldBounds()).toBeUndefined()
	})
})
