import { TLDrawShape, TLGeoShape, TLLineShape, createShapeId, sortByIndex } from '@tldraw/editor'
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

/** Draws a dense closed ellipse sketch (pen left down) around the given center. */
function drawEllipseSketch(cx: number, cy: number, rx: number, ry: number, steps = 32) {
	editor.setCurrentTool('magic-wand')
	editor.pointerDown(cx + rx, cy)
	for (let i = 1; i <= steps; i++) {
		const t = (i / steps) * Math.PI * 2
		editor.pointerMove(cx + rx * Math.cos(t), cy + ry * Math.sin(t))
	}
}

/** Draws a near-straight open stroke (pen left down) from (x1,y1) to (x2,y2). */
function drawLineSketch(x1: number, y1: number, x2: number, y2: number, steps = 12) {
	editor.setCurrentTool('magic-wand')
	editor.pointerDown(x1, y1)
	for (let i = 1; i <= steps; i++) {
		const t = i / steps
		editor.pointerMove(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)
	}
}

/** The two page-space endpoints of a morphed line, ordered by point index. */
function linePageEndpoints(line: TLLineShape) {
	const [a, b] = Object.values(line.props.points).sort(sortByIndex)
	return {
		start: { x: line.x + a.x, y: line.y + a.y },
		end: { x: line.x + b.x, y: line.y + b.y },
	}
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
		vi.advanceTimersByTime(300)
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
		// Nudge the pen past the move tolerance before the hold elapses; the timer
		// keeps resetting, so the morph never fires.
		for (let i = 0; i < 6; i++) {
			vi.advanceTimersByTime(300)
			editor.pointerMove(i % 2 ? 100 : 130, 100)
		}
		expect(realShapes().some((s) => s.type === 'geo')).toBe(false)
	})

	it('morphs instead of lasso when held, even while encircling a shape', () => {
		const boxId = createBox(130, 130) // center ~(150,150), inside the square
		drawRectSketch(square)

		vi.advanceTimersByTime(600) // hold past the morph threshold
		// Morph wins: a new rectangle exists, box untouched, draw stroke gone.
		const geos = realShapes().filter((s) => s.type === 'geo')
		expect(geos.some((s) => s.id !== boxId)).toBe(true)
		expect(realShapes().some((s) => s.type === 'draw')).toBe(false)
		editor.expectToBeIn('magic-wand.morph-tuning')
		editor.pointerUp()
	})

	it('lassos when the loop encircles a shape but is released before the hold', () => {
		const boxId = createBox(130, 130)
		drawRectSketch(square)

		vi.advanceTimersByTime(300) // not yet at morph threshold
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

		vi.advanceTimersByTime(600)
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
		vi.advanceTimersByTime(600)
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
		vi.advanceTimersByTime(600)
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
		vi.advanceTimersByTime(600)

		const geo = realShapes().find((s) => s.type === 'geo') as TLGeoShape
		expect(geo).toBeTruthy()
		expect(geo.props.geo).toBe('rectangle')
		expect(Math.abs(Math.abs(geo.rotation) - angle)).toBeLessThan(0.2)
	})

	it('morphs a held circle sketch into a geo ellipse, staying in the tool', () => {
		drawEllipseSketch(150, 150, 60, 60)

		// Before the hold elapses: still a freehand stroke, no geo yet.
		vi.advanceTimersByTime(300)
		expect(realShapes().some((s) => s.type === 'geo')).toBe(false)

		// After the hold: the stroke morphs into one geo ellipse, selected.
		vi.advanceTimersByTime(600)
		const geos = realShapes().filter((s) => s.type === 'geo')
		expect(geos).toHaveLength(1)
		expect((geos[0] as TLGeoShape).props.geo).toBe('ellipse')
		expect(editor.getSelectedShapeIds()).toEqual([geos[0].id])
		expect(realShapes().some((s) => s.type === 'draw')).toBe(false)
		editor.expectToBeIn('magic-wand.morph-tuning')
		editor.pointerUp()
	})

	it('drag-tunes a morphed ellipse about its center', () => {
		drawEllipseSketch(150, 150, 60, 40)
		vi.advanceTimersByTime(600)
		editor.expectToBeIn('magic-wand.morph-tuning')

		const id = realShapes().find((s) => s.type === 'geo')!.id
		const w0 = editor.getShape<TLGeoShape>(id)!.props.w
		const center0 = editor.getShapePageBounds(id)!.center.clone()

		editor.pointerMove(-50, -50)
		expect(editor.getShape<TLGeoShape>(id)!.props.w).toBeGreaterThan(w0)
		const center1 = editor.getShapePageBounds(id)!.center
		expect(center1.x).toBeCloseTo(center0.x, 1)
		expect(center1.y).toBeCloseTo(center0.y, 1)

		editor.pointerUp()
	})

	it('snaps a near-square sketch to a clean square (equal sides)', () => {
		const nearSquare: Array<[number, number]> = [
			[100, 100],
			[210, 100],
			[210, 200],
			[100, 200],
		] // 110 × 100, ratio 1.1 < 1.2
		drawRectSketch(nearSquare)
		vi.advanceTimersByTime(600)

		const geo = realShapes().find((s) => s.type === 'geo') as TLGeoShape
		expect(geo.props.geo).toBe('rectangle')
		expect(geo.props.w).toBeCloseTo(geo.props.h, 6)
		editor.pointerUp()
	})

	it('keeps distinct sides for a clearly non-square sketch', () => {
		const wide: Array<[number, number]> = [
			[100, 100],
			[280, 100],
			[280, 200],
			[100, 200],
		] // 180 × 100, ratio 1.8 > 1.2
		drawRectSketch(wide)
		vi.advanceTimersByTime(600)

		const geo = realShapes().find((s) => s.type === 'geo') as TLGeoShape
		expect(Math.abs(geo.props.w - geo.props.h)).toBeGreaterThan(40)
		editor.pointerUp()
	})

	it('snaps a near-circular sketch to a clean circle (equal axes)', () => {
		drawEllipseSketch(150, 150, 60, 66) // ratio 1.1 < 1.2
		vi.advanceTimersByTime(600)

		const geo = realShapes().find((s) => s.type === 'geo') as TLGeoShape
		expect(geo.props.geo).toBe('ellipse')
		expect(geo.props.w).toBeCloseTo(geo.props.h, 6)
		editor.pointerUp()
	})

	it('snaps a near-axis-aligned sketch to an axis-aligned rectangle', () => {
		const center: [number, number] = [150, 150]
		const angle = (5 * Math.PI) / 180 // within the snap zone
		const tilted = square.map((c) => rotateAround(c, center, angle))

		drawRectSketch(tilted)
		vi.advanceTimersByTime(600)

		const geo = realShapes().find((s) => s.type === 'geo') as TLGeoShape
		expect(geo).toBeTruthy()
		expect(geo.rotation).toBe(0)
		editor.pointerUp()
	})

	it('enters morph-tuning state after morph while pointer is held', () => {
		drawRectSketch(square)
		vi.advanceTimersByTime(600)
		editor.expectToBeIn('magic-wand.morph-tuning')
		editor.pointerUp()
		editor.expectToBeIn('magic-wand.idle')
	})

	it('drag after morph scales the rectangle about its center', () => {
		drawRectSketch(square)
		vi.advanceTimersByTime(600)
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
		vi.advanceTimersByTime(600)

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

	it('snaps rotation to the nearest 15° while shift is held during tuning', () => {
		drawRectSketch(square)
		vi.advanceTimersByTime(600)
		editor.expectToBeIn('magic-wand.morph-tuning')
		const id = realShapes().find((s) => s.type === 'geo')!.id
		const fifteen = Math.PI / 12

		// Drag to an awkward angle with no shift: rotation lands off a 15° step.
		editor.pointerMove(260, 230)
		const free = editor.getShape<TLGeoShape>(id)!.rotation
		const freeRemainder = Math.abs(free / fifteen - Math.round(free / fifteen))
		expect(freeRemainder).toBeGreaterThan(0.05)

		// Same pointer with shift held: rotation snaps to an exact 15° multiple.
		editor.pointerMove(260, 230, { shiftKey: true })
		const snapped = editor.getShape<TLGeoShape>(id)!.rotation
		const snappedRemainder = Math.abs(snapped / fifteen - Math.round(snapped / fifteen))
		expect(snappedRemainder).toBeLessThan(1e-6)

		editor.pointerUp()
	})

	it('cancel during tuning removes the morphed rectangle', () => {
		drawRectSketch(square)
		vi.advanceTimersByTime(600)
		editor.expectToBeIn('magic-wand.morph-tuning')

		expect(realShapes().some((s) => s.type === 'geo')).toBe(true)
		editor.cancel()
		expect(realShapes().some((s) => s.type === 'geo')).toBe(false)
		editor.expectToBeIn('magic-wand.idle')
	})

	it('pointer-up during tuning commits the shape at the dragged position', () => {
		drawRectSketch(square)
		vi.advanceTimersByTime(600)

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

	it('morphs a held straight sketch into a line at the exact endpoints', () => {
		drawLineSketch(100, 100, 300, 140)

		// Before the hold elapses: still a freehand stroke, no line yet.
		vi.advanceTimersByTime(300)
		expect(realShapes().some((s) => s.type === 'line')).toBe(false)

		// After the hold: the stroke morphs into one line, selected.
		vi.advanceTimersByTime(300)
		const lines = realShapes().filter((s) => s.type === 'line')
		expect(lines).toHaveLength(1)
		expect(realShapes().some((s) => s.type === 'draw')).toBe(false)
		expect(editor.getSelectedShapeIds()).toEqual([lines[0].id])
		// Pointer still held: the line is now fine-tunable.
		editor.expectToBeIn('magic-wand.line-tuning')

		// The line spans the exact freehand endpoints (not a fitted approximation).
		const { start, end } = linePageEndpoints(lines[0] as TLLineShape)
		expect(start.x).toBeCloseTo(100, 0)
		expect(start.y).toBeCloseTo(100, 0)
		expect(end.x).toBeCloseTo(300, 0)
		expect(end.y).toBeCloseTo(140, 0)

		editor.pointerUp()
		editor.expectToBeIn('magic-wand.idle')
	})

	it('carries the sketch style onto the morphed line', () => {
		drawLineSketch(100, 100, 280, 100)
		const stroke = realShapes().find((s) => s.type === 'draw') as TLDrawShape
		const expected = {
			color: stroke.props.color,
			dash: stroke.props.dash,
			size: stroke.props.size,
		}
		vi.advanceTimersByTime(600)
		const line = realShapes().find((s) => s.type === 'line') as TLLineShape
		expect({ color: line.props.color, dash: line.props.dash, size: line.props.size }).toEqual(
			expected
		)
	})

	it('does not morph a clearly curved open sketch into a line', () => {
		editor.setCurrentTool('magic-wand')
		// A pronounced arc: chord 200 wide, bowing up ~70 (sagitta well past straight).
		editor.pointerDown(100, 200)
		const steps = 16
		for (let i = 1; i <= steps; i++) {
			const t = i / steps
			editor.pointerMove(100 + 200 * t, 200 - Math.sin(t * Math.PI) * 70)
		}
		vi.advanceTimersByTime(600)
		expect(realShapes().some((s) => s.type === 'line')).toBe(false)
		expect(realShapes().some((s) => s.type === 'draw')).toBe(true)
	})

	it('undo removes the morphed line and redo re-creates it', () => {
		drawLineSketch(100, 100, 300, 100)
		vi.advanceTimersByTime(600)
		expect(realShapes().filter((s) => s.type === 'line')).toHaveLength(1)

		editor.undo()
		expect(realShapes()).toHaveLength(0)

		editor.redo()
		expect(realShapes().filter((s) => s.type === 'line')).toHaveLength(1)
	})

	it('drag-tunes a morphed line by moving its end vertex, start fixed', () => {
		drawLineSketch(100, 100, 300, 100)
		vi.advanceTimersByTime(600)
		editor.expectToBeIn('magic-wand.line-tuning')
		const id = realShapes().find((s) => s.type === 'line')!.id

		// Drag the pointer; the end follows it while the start stays put.
		editor.pointerMove(300, 250)
		const { start, end } = linePageEndpoints(editor.getShape<TLLineShape>(id)!)
		expect(start.x).toBeCloseTo(100, 0)
		expect(start.y).toBeCloseTo(100, 0)
		expect(end.x).toBeCloseTo(300, 0)
		expect(end.y).toBeCloseTo(250, 0)

		editor.pointerUp()
		editor.expectToBeIn('magic-wand.idle')
	})

	it('does not jump the line end when the drag begins', () => {
		drawLineSketch(100, 100, 300, 140)
		vi.advanceTimersByTime(600)
		const id = realShapes().find((s) => s.type === 'line')!.id
		const before = linePageEndpoints(editor.getShape<TLLineShape>(id)!)

		// Moving the pointer to exactly the morph-time pointer (the end) is a no-op.
		editor.pointerMove(300, 140)
		const after = linePageEndpoints(editor.getShape<TLLineShape>(id)!)
		expect(after.end.x).toBeCloseTo(before.end.x, 1)
		expect(after.end.y).toBeCloseTo(before.end.y, 1)

		editor.pointerUp()
	})

	it('snaps the line angle to 15° while shift is held during tuning', () => {
		drawLineSketch(100, 100, 300, 100)
		vi.advanceTimersByTime(600)
		const id = realShapes().find((s) => s.type === 'line')!.id
		const fifteen = Math.PI / 12

		// Drag to an awkward angle, no shift: not a 15° multiple.
		editor.pointerMove(300, 180)
		let ends = linePageEndpoints(editor.getShape<TLLineShape>(id)!)
		const free = Math.atan2(ends.end.y - ends.start.y, ends.end.x - ends.start.x)
		expect(Math.abs(free / fifteen - Math.round(free / fifteen))).toBeGreaterThan(0.05)

		// Same pointer with shift held: the angle snaps to a 15° multiple.
		editor.pointerMove(300, 180, { shiftKey: true })
		ends = linePageEndpoints(editor.getShape<TLLineShape>(id)!)
		const snapped = Math.atan2(ends.end.y - ends.start.y, ends.end.x - ends.start.x)
		expect(Math.abs(snapped / fifteen - Math.round(snapped / fifteen))).toBeLessThan(1e-6)

		editor.pointerUp()
	})

	it('cancel during line tuning removes the morphed line', () => {
		drawLineSketch(100, 100, 300, 100)
		vi.advanceTimersByTime(600)
		editor.expectToBeIn('magic-wand.line-tuning')

		expect(realShapes().some((s) => s.type === 'line')).toBe(true)
		editor.cancel()
		expect(realShapes().some((s) => s.type === 'line')).toBe(false)
		editor.expectToBeIn('magic-wand.idle')
	})

	it('pointer-up during line tuning commits the dragged end as one undo step', () => {
		drawLineSketch(100, 100, 300, 100)
		vi.advanceTimersByTime(600)
		const id = realShapes().find((s) => s.type === 'line')!.id

		editor.pointerMove(300, 250)
		editor.pointerUp()
		const after = linePageEndpoints(editor.getShape<TLLineShape>(id)!)
		expect(after.end.y).toBeCloseTo(250, 0)

		// Undo removes the whole morph+tune; redo restores the dragged position.
		editor.undo()
		expect(realShapes().some((s) => s.type === 'line')).toBe(false)
		editor.redo()
		const redo = linePageEndpoints(editor.getShape<TLLineShape>(id)!)
		expect(redo.end.y).toBeCloseTo(250, 0)
	})
})
