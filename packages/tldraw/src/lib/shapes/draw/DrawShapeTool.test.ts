import { TLDrawShape } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import { Drawing } from './toolStates/Drawing'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

function getDrawingState(): Drawing {
	return editor.root.children!['draw'].children!['drawing'] as Drawing
}

describe('When in the idle state', () => {
	it('Returns to select on cancel', () => {
		editor.setCurrentTool('draw')
		editor.expectToBeIn('draw.idle')
		editor.cancel()
		editor.expectToBeIn('select.idle')
	})

	it('Enters the drawing state on pointer down', () => {
		editor.setCurrentTool('draw')
		editor.pointerDown(50, 50)
		editor.expectToBeIn('draw.drawing')
	})
})

describe('When in the drawing state', () => {
	it('Returns to idle on cancel', () => {
		editor.setCurrentTool('draw')
		editor.pointerDown(50, 50)
		editor.cancel()
		editor.expectToBeIn('draw.idle')
	})

	it('Returns to idle on complete', () => {
		editor.setCurrentTool('draw')
		editor.pointerDown(50, 50)
		editor.pointerUp(50, 50)
		editor.expectToBeIn('draw.idle')

		editor.pointerDown(50, 50)
		editor.pointerMove(55, 55)
		editor.pointerMove(60, 60)
		editor.pointerUp(60, 60)
		editor.expectToBeIn('draw.idle')
	})
})

describe('zoomOnEnter', () => {
	it('Captures the zoom level when entering the drawing state', () => {
		editor.setCamera({ x: 0, y: 0, z: 2 })
		editor.setCurrentTool('draw')
		editor.pointerDown(50, 50)

		const drawing = getDrawingState()
		expect(drawing.zoomOnEnter).toBe(2)
	})

	it('Uses the zoom level at entry, not the current zoom level', () => {
		editor.setCamera({ x: 0, y: 0, z: 3 })
		editor.setCurrentTool('draw')
		editor.pointerDown(50, 50)

		const drawing = getDrawingState()
		expect(drawing.zoomOnEnter).toBe(3)

		// Change zoom mid-stroke
		editor.setCamera({ x: 0, y: 0, z: 1 })
		editor.pointerMove(60, 60)

		// zoomOnEnter should still reflect the zoom at entry
		expect(drawing.zoomOnEnter).toBe(3)
	})

	it('Defaults to 1 when zoom is at default level', () => {
		editor.setCurrentTool('draw')
		editor.pointerDown(50, 50)

		const drawing = getDrawingState()
		expect(drawing.zoomOnEnter).toBe(1)
	})
})

describe('Close threshold with zoom', () => {
	function drawNearlyClosedShape(gap: number) {
		// Draw a shape that loops back near the start point
		// Start at origin, go right, down, left, then almost back to start
		editor.setCurrentTool('draw')
		editor.pointerDown(100, 100)
		editor.pointerMove(200, 100)
		editor.pointerMove(200, 200)
		editor.pointerMove(100, 200)
		// Come back near the start with the specified gap
		editor.pointerMove(100 + gap, 100)
		editor.pointerUp()

		const shapes = editor.getCurrentPageShapes()
		return shapes[shapes.length - 1] as TLDrawShape
	}

	it('Closes a shape when the endpoint is near the start at zoom=1', () => {
		const shape = drawNearlyClosedShape(2)
		expect(shape.props.isClosed).toBe(true)
	})

	it('Does not close a shape when the endpoint is far from the start', () => {
		const shape = drawNearlyClosedShape(50)
		expect(shape.props.isClosed).toBe(false)
	})

	it('Has a larger close threshold at low zoom levels', () => {
		// threshold = 6 + 2*sqrt(strokeWidth*0.8) + 100/(1+(zoom/0.18)^3)
		// At zoom=0.1: threshold ≈ 95 page units
		// At zoom=1:   threshold ≈ 10 page units
		// Note: screen gap * (1/zoom) = page gap

		// At zoom=1, screen gap of 15px = 15 page units > threshold ~10 → NOT closed
		editor.setCamera({ x: 0, y: 0, z: 1 })
		const shapeAtZoom1 = drawNearlyClosedShape(15)
		expect(shapeAtZoom1.props.isClosed).toBe(false)

		// At zoom=0.1, screen gap of 5px = 50 page units < threshold ~95 → CLOSED
		// The larger page-space threshold at low zoom makes closing easier
		editor.setCamera({ x: 0, y: 0, z: 0.1 })
		const shapeAtLowZoom = drawNearlyClosedShape(5)
		expect(shapeAtLowZoom.props.isClosed).toBe(true)
	})

	it('Has a small close threshold at high zoom levels', () => {
		// At zoom=5: threshold ≈ 9.4 page units
		// Screen gap of 60px = 12 page units > threshold → NOT closed
		editor.setCamera({ x: 0, y: 0, z: 5 })
		const shape = drawNearlyClosedShape(60)
		expect(shape.props.isClosed).toBe(false)
	})

	it('Uses a different threshold formula when dynamic resize mode is enabled', () => {
		editor.user.updateUserPreferences({ isDynamicSizeMode: true })

		// In dynamic resize mode, threshold = (strokeWidth + 2) * scale
		// where scale = 1/zoom. At zoom=0.1, scale=10, strokeWidth(m)=3.5
		// threshold = (3.5+2)*10 = 55 page units
		// Screen gap of 3px at zoom=0.1 = 30 page units < 55 → CLOSED
		editor.setCamera({ x: 0, y: 0, z: 0.1 })
		const shapeAtLowZoom = drawNearlyClosedShape(3)
		expect(shapeAtLowZoom.props.isClosed).toBe(true)
	})

	it('Does not close highlight shapes regardless of zoom', () => {
		editor.setCamera({ x: 0, y: 0, z: 0.1 })
		editor.setCurrentTool('highlight')
		editor.pointerDown(100, 100)
		editor.pointerMove(200, 100)
		editor.pointerMove(200, 200)
		editor.pointerMove(100, 200)
		editor.pointerMove(102, 100)
		editor.pointerUp()

		const shapes = editor.getCurrentPageShapes()
		const shape = shapes[shapes.length - 1]
		// Highlight shapes don't have isClosed
		expect((shape as any).props.isClosed).toBeUndefined()
	})
})
