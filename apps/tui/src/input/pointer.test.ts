import { createShapeId, type TLGeoShape } from '@tldraw/editor'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CELL_H, CELL_W } from '../editor/constants'
import type { MouseEvent } from '../terminal/InputParser'
import { createTestContext, defaultLayout, type TestContext } from '../test/testContext'
import type { Cell } from '../ui/UiState'
import { NO_MODIFIERS } from './modifiers'
import {
	WHEEL_MAX_TICKS,
	WHEEL_TICK_PX,
	WheelAccumulator,
	canvasCenterCell,
	cellToScreen,
	clampToCanvas,
	isInCanvas,
	pointerEvent,
	screenToCell,
	snapToHandle,
	wheelEvent,
	type WheelBatch,
} from './pointer'

function wheel(dy: number, extra: Partial<MouseEvent> = {}): MouseEvent {
	return {
		type: 'mouse',
		action: 'wheel',
		button: -1,
		col: 10,
		row: 5,
		dx: 0,
		dy,
		shift: false,
		ctrl: false,
		alt: false,
		...extra,
	}
}

function emptyBatch(): WheelBatch {
	return {
		col: 0,
		row: 0,
		ticksX: 0,
		ticksY: 0,
		zoomTicks: 0,
		shift: false,
		alt: false,
		ctrl: false,
	}
}

describe('cell conversions', () => {
	const layout = defaultLayout(100, 30)

	it('maps cell centres to screen px and back', () => {
		const p = cellToScreen(layout, 0, 1, { x: 0, y: 0 })
		expect(p).toEqual({ x: CELL_W / 2, y: CELL_H / 2 })
		expect(cellToScreen(layout, 10, 5, p)).toEqual({ x: 10.5 * CELL_W, y: 4.5 * CELL_H })
		const cell: Cell = { col: 0, row: 0 }
		expect(screenToCell(layout, p.x, p.y, cell)).toEqual({ col: 10, row: 5 })
	})

	it('knows the canvas rect', () => {
		expect(isInCanvas(layout, 0, 0)).toBe(false)
		expect(isInCanvas(layout, 0, 1)).toBe(true)
		expect(isInCanvas(layout, 99, 28)).toBe(true)
		expect(isInCanvas(layout, 99, 29)).toBe(false)
		expect(isInCanvas(layout, 100, 10)).toBe(false)
		expect(clampToCanvas(layout, { col: -5, row: 40 })).toEqual({ col: 0, row: 28 })
		expect(canvasCenterCell(layout)).toEqual({ col: 50, row: 15 })
	})
})

describe('event builders', () => {
	it('builds pointer events like the driver', () => {
		expect(
			pointerEvent('pointer_down', 12, 24, 0, { shift: true, alt: false, ctrl: true })
		).toEqual({
			type: 'pointer',
			name: 'pointer_down',
			point: { x: 12, y: 24 },
			pointerId: 1,
			button: 0,
			isPen: false,
			target: 'canvas',
			shiftKey: true,
			altKey: false,
			ctrlKey: true,
			metaKey: false,
			accelKey: true,
		})
	})

	it('builds wheel events with negated deltas and a ctrl-only z', () => {
		const pan = wheelEvent(10, 20, 0, 3, NO_MODIFIERS)
		expect(pan.delta).toEqual({ x: 0, y: -3 * WHEEL_TICK_PX, z: 0 })
		expect(pan.point).toEqual({ x: 10, y: 20 })
		const zoom = wheelEvent(10, 20, 0, -2, { shift: false, alt: false, ctrl: true })
		expect(zoom.delta).toEqual({ x: 0, y: 2 * WHEEL_TICK_PX, z: 0.1 })
		expect(zoom.ctrlKey).toBe(true)
		expect(zoom.accelKey).toBe(true)
		const horizontal = wheelEvent(0, 0, -1, 0, NO_MODIFIERS)
		expect(horizontal.delta).toEqual({ x: WHEEL_TICK_PX, y: 0, z: 0 })
	})
})

describe('WheelAccumulator', () => {
	it('sums ticks per frame and caps them', () => {
		const acc = new WheelAccumulator()
		const batch = emptyBatch()
		expect(acc.take(batch)).toBe(false)
		for (let i = 0; i < 8; i++) acc.add(wheel(1, { col: 3 + i }), NO_MODIFIERS)
		expect(acc.isPending()).toBe(true)
		expect(acc.take(batch)).toBe(true)
		expect(batch.ticksY).toBe(WHEEL_MAX_TICKS)
		expect(batch.ticksX).toBe(0)
		expect(batch.col).toBe(10)
		expect(acc.take(batch)).toBe(false)
	})

	it('routes alt to zoom, shift and dx to horizontal', () => {
		const acc = new WheelAccumulator()
		const batch = emptyBatch()
		acc.add(wheel(-1), { shift: false, alt: true, ctrl: false })
		acc.add(wheel(-1), { shift: false, alt: true, ctrl: false })
		acc.take(batch)
		expect(batch).toMatchObject({ zoomTicks: -2, ticksX: 0, ticksY: 0, alt: true })

		acc.add(wheel(1), { shift: true, alt: false, ctrl: false })
		acc.add(wheel(0, { dx: 1 }), NO_MODIFIERS)
		acc.take(batch)
		expect(batch).toMatchObject({ ticksX: 2, ticksY: 0, zoomTicks: 0 })

		acc.add(wheel(-1), { shift: false, alt: false, ctrl: true })
		acc.take(batch)
		expect(batch).toMatchObject({ ticksY: -1, ctrl: true })
	})
})

describe('snapToHandle', () => {
	let ctx: TestContext

	beforeEach(() => {
		ctx = createTestContext()
	})

	afterEach(() => ctx.dispose())

	it('moves a click near a selection handle onto it and leaves other clicks alone', () => {
		const { editor } = ctx
		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 80, y: 80, props: { w: 200, h: 100 } })
		editor.select(id)
		const entries = editor.overlays.getActiveOverlayEntries()
		const corner = entries
			.flatMap((e) => e.overlays)
			.find((o) => (o.props as { handle?: string }).handle === 'bottom_right')!
		expect(corner).toBeDefined()
		const centre = editor.overlays.getOverlayGeometry(corner)!.bounds.center
		expect(centre.x).toBeCloseTo(280, 0)
		expect(centre.y).toBeCloseTo(180, 0)

		// The centre of the cell the handle sits in is up to half a cell away.
		const cellCentre = {
			x: (Math.floor(centre.x / CELL_W) + 0.5) * CELL_W,
			y: (Math.floor(centre.y / CELL_H) + 0.5) * CELL_H,
		}
		expect(snapToHandle(editor, cellCentre)).toBe(true)
		expect(cellCentre.x).toBeCloseTo(centre.x, 5)
		expect(cellCentre.y).toBeCloseTo(centre.y, 5)
		expect(editor.overlays.getOverlayAtPoint(editor.screenToPage(cellCentre))).toBe(corner)

		const inside = { x: 180, y: 130 }
		expect(snapToHandle(editor, inside)).toBe(false)
		expect(inside).toEqual({ x: 180, y: 130 })

		const far = { x: 600, y: 400 }
		expect(snapToHandle(editor, far)).toBe(false)
	})

	it('does nothing without a selection', () => {
		const p = { x: 100, y: 100 }
		expect(snapToHandle(ctx.editor, p)).toBe(false)
		expect(p).toEqual({ x: 100, y: 100 })
	})
})
