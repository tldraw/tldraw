import { createShapeId } from '@tldraw/editor'
import { TestEditor } from '../TestEditor'

let editor: TestEditor

const ids = {
	inViewport: createShapeId('inViewport'),
	alsoInViewport: createShapeId('alsoInViewport'),
	offscreen: createShapeId('offscreen'),
	locked: createShapeId('locked'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: ids.inViewport, type: 'geo', x: 100, y: 100, props: { w: 50, h: 50 } },
		{ id: ids.alsoInViewport, type: 'geo', x: 200, y: 200, props: { w: 50, h: 50 } },
		{ id: ids.offscreen, type: 'geo', x: 5000, y: 5000, props: { w: 50, h: 50 } },
		{
			id: ids.locked,
			type: 'geo',
			x: 300,
			y: 300,
			props: { w: 50, h: 50 },
			isLocked: true,
		},
	])
})

afterEach(() => {
	editor?.dispose()
})

describe('selectAllInViewport', () => {
	it('selects only shapes visible in the viewport', () => {
		editor.selectAllInViewport()
		const selected = editor.getSelectedShapeIds()
		expect(selected).toContain(ids.inViewport)
		expect(selected).toContain(ids.alsoInViewport)
		expect(selected).not.toContain(ids.offscreen)
	})

	it('does not select locked shapes', () => {
		editor.selectAllInViewport()
		expect(editor.getSelectedShapeIds()).not.toContain(ids.locked)
	})

	it('selects nothing when no shapes are in the viewport', () => {
		editor.setCamera({ x: -9000, y: -9000, z: 1 })
		editor.selectAllInViewport()
		expect(editor.getSelectedShapeIds()).toEqual([])
	})

	it('selects shapes that come into view after panning', () => {
		// Pan so only the offscreen shape is visible
		editor.setCamera({ x: -4900, y: -4900, z: 1 })
		editor.selectAllInViewport()
		const selected = editor.getSelectedShapeIds()
		expect(selected).toContain(ids.offscreen)
		expect(selected).not.toContain(ids.inViewport)
		expect(selected).not.toContain(ids.alsoInViewport)
	})
})
