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

	it('still lassos when a long stroke is split into multiple shapes', () => {
		// Force the draw tool to split the stroke after just a few points.
		;(editor.getShapeUtil('draw') as any).options.maxPointsPerShape = 2
		const boxId = createBox(130, 130) // center ~(150,150), inside the loop

		editor.setCurrentTool('magic-wand')
		editor.pointerDown(100, 100)
		editor.pointerMove(200, 100)
		editor.pointerMove(200, 200)
		editor.pointerMove(100, 200)
		// The stroke should have split into more than one draw shape by now.
		expect(editor.getCurrentPageShapes().filter((s) => s.type === 'draw').length).toBeGreaterThan(1)

		editor.pointerMove(102, 100) // close the loop near the start
		editor.pointerUp()

		// Despite the split, the loop still lasso-selects the encircled box.
		expect(editor.getSelectedShapeIds()).toEqual([boxId])
		expect(editor.getCurrentPageShapes().some((s) => s.type === 'draw')).toBe(false)
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

/** Shapes on the page that aren't transient magic-wand ghosts/previews. */
function realShapes() {
	return editor.getCurrentPageShapes().filter((s) => !s.meta?.magicWandGhost)
}

/** Draws a dense closed rectangle sketch (pen left down) from the given corners. */
function drawRectSketch(corners: Array<[number, number]>, perEdge = 6) {
	editor.setCurrentTool('magic-wand')
	const [sx, sy] = corners[0]
	editor.pointerDown(sx, sy)
	let [px, py] = [sx, sy]
	// Walk the corners, then back to ~2px from the start so the loop is closed.
	const path: Array<[number, number]> = [...corners.slice(1), [sx + 2, sy]]
	for (const [cx, cy] of path) {
		for (let j = 1; j <= perEdge; j++) {
			const t = j / perEdge
			editor.pointerMove(px + (cx - px) * t, py + (cy - py) * t)
		}
		;[px, py] = [cx, cy]
	}
}

function rotateAround(
	[x, y]: [number, number],
	[cx, cy]: [number, number],
	angle: number
): [number, number] {
	const dx = x - cx
	const dy = y - cy
	return [
		cx + dx * Math.cos(angle) - dy * Math.sin(angle),
		cy + dx * Math.sin(angle) + dy * Math.cos(angle),
	]
}

describe('MagicWandTool hold-to-morph', () => {
	beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }))
	afterEach(() => vi.useRealTimers())

	const square: Array<[number, number]> = [
		[100, 100],
		[200, 100],
		[200, 200],
		[100, 200],
	]

	it('morphs a held rectangle sketch into a geo rectangle, staying in the tool', () => {
		drawRectSketch(square)

		// Before the hold elapses: still a freehand stroke, no real geo yet.
		vi.advanceTimersByTime(500)
		expect(realShapes().some((s) => s.type === 'draw')).toBe(true)
		expect(realShapes().some((s) => s.type === 'geo')).toBe(false)

		// After the hold: the stroke morphs into one geo rectangle, selected.
		vi.advanceTimersByTime(600)
		const geos = realShapes().filter((s) => s.type === 'geo')
		expect(geos).toHaveLength(1)
		expect((geos[0] as TLGeoShape).props.geo).toBe('rectangle')
		expect(editor.getSelectedShapeIds()).toEqual([geos[0].id])
		expect(realShapes().some((s) => s.type === 'draw')).toBe(false)
		// Still in the tuning state while the pointer is held; idle after release.
		editor.expectToBeIn('magic-wand.morph-tuning')
		editor.pointerUp()
		editor.expectToBeIn('magic-wand.idle')

		const style = editor.getContainer().querySelector('style.tl-magic-wand-ink-style')
		expect(style?.textContent ?? '').toBe('')
	})

	it('does not morph while the pen keeps moving', () => {
		drawRectSketch(square)
		// Nudge the pen past the move tolerance every 500ms; the timer keeps resetting.
		for (let i = 0; i < 6; i++) {
			vi.advanceTimersByTime(500)
			editor.pointerMove(i % 2 ? 100 : 130, 100)
		}
		expect(realShapes().some((s) => s.type === 'geo')).toBe(false)
	})

	it('morphs instead of lasso when held 1s, even while encircling a shape', () => {
		const boxId = createBox(130, 130) // center ~(150,150), inside the square
		drawRectSketch(square)

		vi.advanceTimersByTime(1100) // hold past the morph threshold
		// Morph wins: a new rectangle exists, box untouched, draw stroke gone.
		const geos = realShapes().filter((s) => s.type === 'geo')
		expect(geos.some((s) => s.id !== boxId)).toBe(true)
		expect(realShapes().some((s) => s.type === 'draw')).toBe(false)
		editor.expectToBeIn('magic-wand.morph-tuning')
		editor.pointerUp()
	})

	it('lassos when the loop encircles a shape but is released before 1s', () => {
		const boxId = createBox(130, 130)
		drawRectSketch(square)

		vi.advanceTimersByTime(500) // not yet at morph threshold
		editor.pointerUp() // release early → lasso wins

		expect(editor.getSelectedShapeIds()).toEqual([boxId])
		expect(realShapes().some((s) => s.type === 'draw')).toBe(false)
		editor.expectToBeIn('select.idle')
	})

	it('carries the sketch style onto the morphed rectangle', () => {
		drawRectSketch(square)
		const stroke = realShapes().find((s) => s.type === 'draw') as TLDrawShape
		const expected = {
			color: stroke.props.color,
			fill: stroke.props.fill,
			dash: stroke.props.dash,
			size: stroke.props.size,
		}

		vi.advanceTimersByTime(1100)
		const geo = realShapes().find((s) => s.type === 'geo') as TLGeoShape
		expect({
			color: geo.props.color,
			fill: geo.props.fill,
			dash: geo.props.dash,
			size: geo.props.size,
		}).toEqual(expected)
		// The draw defaults differ from geo defaults (e.g. fill 'none' vs 'solid'),
		// so this confirms the style was actually carried over.
		expect(geo.props.fill).toBe('none')
	})

	it('undo removes the morphed rectangle and redo re-creates it', () => {
		drawRectSketch(square)
		vi.advanceTimersByTime(1100)
		expect(realShapes().filter((s) => s.type === 'geo')).toHaveLength(1)

		editor.undo()
		expect(realShapes().filter((s) => s.type === 'geo')).toHaveLength(0)
		expect(realShapes()).toHaveLength(0)

		editor.redo()
		expect(realShapes().filter((s) => s.type === 'geo')).toHaveLength(1)
	})

	it('does not morph an open (un-closed) stroke', () => {
		editor.setCurrentTool('magic-wand')
		// Three sides only — endpoints stay far apart.
		editor.pointerDown(100, 100)
		for (const [cx, cy] of [
			[200, 100],
			[200, 200],
			[100, 200],
		] as Array<[number, number]>) {
			for (let j = 1; j <= 6; j++)
				editor.pointerMove(100 + ((cx - 100) * j) / 6, 100 + ((cy - 100) * j) / 6)
		}
		vi.advanceTimersByTime(1100)
		expect(realShapes().some((s) => s.type === 'geo')).toBe(false)
		expect(realShapes().some((s) => s.type === 'draw')).toBe(true)
	})

	it('morphs a rotated rectangle sketch at the matching angle', () => {
		const center: [number, number] = [150, 140]
		const angle = Math.PI / 6
		const rotated = [
			[80, 100],
			[220, 100],
			[220, 180],
			[80, 180],
		].map((c) => rotateAround(c as [number, number], center, angle))

		drawRectSketch(rotated)
		vi.advanceTimersByTime(1100)

		const geo = realShapes().find((s) => s.type === 'geo') as TLGeoShape
		expect(geo).toBeTruthy()
		expect(geo.props.geo).toBe('rectangle')
		expect(Math.abs(Math.abs(geo.rotation) - angle)).toBeLessThan(0.2)
	})

	it('enters morph-tuning state after morph while pointer is held', () => {
		drawRectSketch(square)
		vi.advanceTimersByTime(1100)
		editor.expectToBeIn('magic-wand.morph-tuning')
		editor.pointerUp()
		editor.expectToBeIn('magic-wand.idle')
	})

	it('drag after morph scales the rectangle about its center', () => {
		drawRectSketch(square)
		vi.advanceTimersByTime(1100)
		editor.expectToBeIn('magic-wand.morph-tuning')

		const id = realShapes().find((s) => s.type === 'geo')!.id
		const w0 = editor.getShape<TLGeoShape>(id)!.props.w
		const center0 = editor.getShapePageBounds(id)!.center.clone()

		// Drag the pointer farther from the center; the rectangle should scale up
		// while its center stays put (it pivots about the center, not a corner).
		editor.pointerMove(-50, -50)
		expect(editor.getShape<TLGeoShape>(id)!.props.w).toBeGreaterThan(w0 * 1.5)
		const center1 = editor.getShapePageBounds(id)!.center
		expect(center1.x).toBeCloseTo(center0.x, 1)
		expect(center1.y).toBeCloseTo(center0.y, 1)

		editor.pointerUp()
	})

	it('does not jump the rectangle when the drag begins', () => {
		// The sketch helper leaves the pen held at (102, 100) — the morph-time
		// pointer. Moving to exactly that point must leave the shape unchanged.
		drawRectSketch(square)
		vi.advanceTimersByTime(1100)

		const before = realShapes().find((s) => s.type === 'geo') as TLGeoShape
		const snap = {
			x: before.x,
			y: before.y,
			rotation: before.rotation,
			w: before.props.w,
			h: before.props.h,
		}

		editor.pointerMove(102, 100)
		const after = realShapes().find((s) => s.type === 'geo') as TLGeoShape
		expect(after.x).toBeCloseTo(snap.x, 1)
		expect(after.y).toBeCloseTo(snap.y, 1)
		expect(after.rotation).toBeCloseTo(snap.rotation, 3)
		expect(after.props.w).toBeCloseTo(snap.w, 1)
		expect(after.props.h).toBeCloseTo(snap.h, 1)

		editor.pointerUp()
	})

	it('cancel during tuning removes the morphed rectangle', () => {
		drawRectSketch(square)
		vi.advanceTimersByTime(1100)
		editor.expectToBeIn('magic-wand.morph-tuning')

		expect(realShapes().some((s) => s.type === 'geo')).toBe(true)
		editor.cancel()
		expect(realShapes().some((s) => s.type === 'geo')).toBe(false)
		editor.expectToBeIn('magic-wand.idle')
	})

	it('pointer-up during tuning commits the shape at the dragged position', () => {
		drawRectSketch(square)
		vi.advanceTimersByTime(1100)

		const geoBefore = realShapes().find((s) => s.type === 'geo') as TLGeoShape
		editor.pointerMove(-50, -50)
		editor.pointerUp()

		const geoAfter = realShapes().find((s) => s.type === 'geo') as TLGeoShape
		expect(geoAfter.props.w).toBeGreaterThan(geoBefore.props.w * 1.5)

		// Undo should remove the shape entirely (one step for the whole morph+tune).
		editor.undo()
		expect(realShapes().some((s) => s.type === 'geo')).toBe(false)

		// Redo should restore it at the tuned (dragged) position.
		editor.redo()
		const geoRedo = realShapes().find((s) => s.type === 'geo') as TLGeoShape
		expect(geoRedo.props.w).toBeCloseTo(geoAfter.props.w, 0)
	})
})
