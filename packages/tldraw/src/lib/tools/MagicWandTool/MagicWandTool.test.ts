import { TLDrawShape, TLGeoShape, createShapeId } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

function createBox(x: number, y: number, w = 40, h = 40) {
	const id = createShapeId()
	editor.createShape<TLGeoShape>({ id, type: 'geo', x, y, props: { w, h, geo: 'rectangle' } })
	return id
}

/** Draws a closed square loop spanning roughly (100,100)–(200,200). */
function drawLoopAround() {
	editor.pointerDown(100, 100)
	editor.pointerMove(200, 100)
	editor.pointerMove(200, 200)
	editor.pointerMove(100, 200)
	editor.pointerMove(102, 100)
	editor.pointerUp()
}

describe('MagicWandTool', () => {
	it('is registered and enters its drawing state', () => {
		editor.setCurrentTool('magic-wand')
		editor.expectToBeIn('magic-wand.idle')
		editor.pointerDown(50, 50)
		editor.expectToBeIn('magic-wand.drawing')
		editor.pointerUp(50, 50)
		editor.expectToBeIn('magic-wand.idle')
	})

	it('shows the in-progress stroke as translucent via CSS, not the shape opacity', () => {
		editor.setCurrentTool('magic-wand')
		editor.pointerDown(50, 50)
		editor.pointerMove(60, 60)
		const shape = editor.getCurrentPageShapes().at(-1)!
		// The shape's real opacity is left proper; the translucency is CSS-only.
		expect(shape.opacity).toBe(1)
		const style = editor.getContainer().querySelector('style.tl-magic-wand-ink-style')
		expect(style?.textContent).toContain(shape.id)
		expect(style?.textContent).toContain('opacity:0.5')
	})

	it('leaves the stroke at proper opacity (and clears the CSS) when cancelled', () => {
		editor.setCurrentTool('magic-wand')
		editor.pointerDown(50, 50)
		editor.pointerMove(60, 60)
		editor.pointerMove(70, 70)
		editor.cancel()

		const drawShape = editor.getCurrentPageShapes().find((s) => s.type === 'draw')
		if (drawShape) expect(drawShape.opacity).toBe(1)
		const style = editor.getContainer().querySelector('style.tl-magic-wand-ink-style')
		expect(style?.textContent ?? '').toBe('')
	})

	it('tints the ink the selection colour and fills it while the stroke would lasso, and reverts', () => {
		createBox(130, 130)
		editor.setCurrentTool('magic-wand')
		editor.pointerDown(100, 100)
		editor.pointerMove(200, 100)
		editor.pointerMove(200, 200)
		editor.pointerMove(100, 200)

		const inkId = editor.getCurrentPageShapes().find((s) => s.type === 'draw')!.id
		// Open stroke so far: still the natural colour and fill.
		expect(editor.getShape<TLDrawShape>(inkId)!.props.color).toBe('black')
		expect(editor.getShape<TLDrawShape>(inkId)!.props.fill).toBe('none')

		// Close the loop around the box: ink previews the selection colour, filled.
		editor.pointerMove(102, 100)
		editor.expectToBeIn('magic-wand.drawing')
		expect(editor.getShape<TLDrawShape>(inkId)!.props.color).toBe('blue')
		expect(editor.getShape<TLDrawShape>(inkId)!.props.fill).toBe('solid')

		// Re-open the loop: ink reverts to its natural colour and fill.
		editor.pointerMove(300, 100)
		expect(editor.getShape<TLDrawShape>(inkId)!.props.color).toBe('black')
		expect(editor.getShape<TLDrawShape>(inkId)!.props.fill).toBe('none')

		editor.pointerUp()
	})

	it('previews which shapes would be lasso-selected with a hint, and reverts', () => {
		const boxId = createBox(130, 130)
		editor.setCurrentTool('magic-wand')
		editor.pointerDown(100, 100)
		editor.pointerMove(200, 100)
		editor.pointerMove(200, 200)
		editor.pointerMove(100, 200)
		// Open stroke: nothing hinted yet.
		expect(editor.getHintingShapeIds()).toEqual([])

		// Close the loop around the box: it's hinted.
		editor.pointerMove(102, 100)
		expect(editor.getHintingShapeIds()).toEqual([boxId])

		// Re-open the loop: hint cleared.
		editor.pointerMove(300, 100)
		expect(editor.getHintingShapeIds()).toEqual([])

		editor.pointerUp()
	})

	it('clears the hint and selects the shapes on lasso completion', () => {
		const boxId = createBox(130, 130)
		editor.setCurrentTool('magic-wand')
		drawLoopAround()

		expect(editor.getHintingShapeIds()).toEqual([])
		expect(editor.getSelectedShapeIds()).toEqual([boxId])
	})

	it('draws a normal stroke when the loop does not encircle anything', () => {
		editor.setCurrentTool('magic-wand')
		const before = editor.getCurrentPageShapes().length
		drawLoopAround()

		// A draw shape was left behind, nothing is selected, still in the tool.
		expect(editor.getCurrentPageShapes().length).toBe(before + 1)
		expect(editor.getCurrentPageShapes().at(-1)!.type).toBe('draw')
		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.expectToBeIn('magic-wand.idle')
	})

	it('lasso-selects a shape encircled by a closed stroke', () => {
		const boxId = createBox(130, 130) // center ~(150,150), inside the loop

		editor.setCurrentTool('magic-wand')
		drawLoopAround()

		// The stroke is discarded, the box is selected, and we switch to select.
		expect(editor.getCurrentPageShapes()).toHaveLength(1)
		expect(editor.getCurrentPageShapes()[0].id).toBe(boxId)
		expect(editor.getSelectedShapeIds()).toEqual([boxId])
		editor.expectToBeIn('select.idle')
	})

	it('lasso-selects multiple encircled shapes', () => {
		const a = createBox(120, 120, 20, 20) // center ~(130,130)
		const b = createBox(160, 160, 20, 20) // center ~(170,170)

		editor.setCurrentTool('magic-wand')
		drawLoopAround()

		expect(new Set(editor.getSelectedShapeIds())).toEqual(new Set([a, b]))
		editor.expectToBeIn('select.idle')
	})

	it('does not lasso when the encircling stroke is left open', () => {
		const boxId = createBox(130, 130)

		editor.setCurrentTool('magic-wand')
		// Same path but the endpoint stays far from the start: not a closed loop.
		editor.pointerDown(100, 100)
		editor.pointerMove(200, 100)
		editor.pointerMove(200, 200)
		editor.pointerMove(100, 200)
		editor.pointerUp(100, 200)

		expect(editor.getSelectedShapeIds()).toEqual([])
		expect(editor.getCurrentPageShapes().some((s) => s.type === 'draw')).toBe(true)
		expect(editor.getShape(boxId)).toBeTruthy()
		editor.expectToBeIn('magic-wand.idle')
	})

	it('does not lasso a shape outside the loop', () => {
		createBox(400, 400) // far away, center outside the loop

		editor.setCurrentTool('magic-wand')
		drawLoopAround()

		expect(editor.getSelectedShapeIds()).toEqual([])
		editor.expectToBeIn('magic-wand.idle')
	})
})
