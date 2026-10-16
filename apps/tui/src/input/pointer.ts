import type { Editor, TLPointerEventInfo, TLWheelEventInfo } from '@tldraw/editor'
import type { ChromeLayout } from '../app/context'
import { CELL_H, CELL_W } from '../editor/constants'
import type { MouseEvent } from '../terminal/InputParser'
import type { Cell } from '../ui/UiState'
import type { ModifierFlags } from './modifiers'

export interface ScreenPoint {
	x: number
	y: number
}

export type PointerName = 'pointer_down' | 'pointer_move' | 'pointer_up'

/** Screen px per wheel tick: two rows. */
export const WHEEL_TICK_PX = 2 * CELL_H
/** Ticks coalesced into one frame are capped so a trackpad flick cannot throw the camera. */
export const WHEEL_MAX_TICKS = 5
/** Zoom per ctrl+wheel flush, matching normalizeWheel.ts (a 10 px notch → 0.1). */
export const WHEEL_ZOOM_STEP = 0.1
/** Handles wider than this (screen px) are long edge targets: snap onto them, not to their centre. */
const SMALL_HANDLE_PX = 32
/**
 * A rotate handle sits a few px outside its resize corner, so both land in the same cell. Resizing
 * is the common gesture; rotating from the mouse needs the next cell out (the only candidate there).
 */
const ROTATE_HANDLE_PENALTY = 1e12

function negate(n: number): number {
	return n === 0 ? 0 : -n
}

export function isInCanvas(layout: ChromeLayout, col: number, row: number): boolean {
	const { canvas } = layout
	return (
		col >= canvas.x && col < canvas.x + canvas.w && row >= canvas.y && row < canvas.y + canvas.h
	)
}

/** Centre of a terminal cell in viewport screen px (spec §2). */
export function cellToScreen(
	layout: ChromeLayout,
	col: number,
	row: number,
	out: ScreenPoint
): ScreenPoint {
	out.x = (col - layout.canvas.x + 0.5) * CELL_W
	out.y = (row - layout.canvas.y + 0.5) * CELL_H
	return out
}

/** The cell containing a viewport screen point (not clamped to the canvas). */
export function screenToCell(layout: ChromeLayout, x: number, y: number, out: Cell): Cell {
	out.col = layout.canvas.x + Math.floor(x / CELL_W)
	out.row = layout.canvas.y + Math.floor(y / CELL_H)
	return out
}

export function clampToCanvas(layout: ChromeLayout, cell: Cell): Cell {
	const { canvas } = layout
	cell.col = Math.min(canvas.x + canvas.w - 1, Math.max(canvas.x, cell.col))
	cell.row = Math.min(canvas.y + canvas.h - 1, Math.max(canvas.y, cell.row))
	return cell
}

export function canvasCenterCell(layout: ChromeLayout): Cell {
	const { canvas } = layout
	return { col: canvas.x + Math.floor(canvas.w / 2), row: canvas.y + Math.floor(canvas.h / 2) }
}

/**
 * A canvas-target mouse event like `Driver.getPointerEventInfo` builds. No `z`: the editor reads
 * `point.z ?? 0.5` (Editor.ts:4318), the pressure of a mouse.
 */
export function pointerEvent(
	name: PointerName,
	x: number,
	y: number,
	button: number,
	mods: Readonly<ModifierFlags>
): TLPointerEventInfo {
	return {
		type: 'pointer',
		name,
		point: { x, y },
		pointerId: 1,
		button,
		isPen: false,
		target: 'canvas',
		shiftKey: mods.shift,
		altKey: mods.alt,
		ctrlKey: mods.ctrl,
		metaKey: false,
		accelKey: mods.ctrl,
	}
}

/** `dx`/`dy` are terminal ticks (positive = down/right); `z` is only read when ctrl is held. */
export function wheelEvent(
	x: number,
	y: number,
	ticksX: number,
	ticksY: number,
	mods: Readonly<ModifierFlags>
): TLWheelEventInfo {
	return {
		type: 'wheel',
		name: 'wheel',
		point: { x, y },
		delta: {
			x: negate(ticksX * WHEEL_TICK_PX),
			y: negate(ticksY * WHEEL_TICK_PX),
			z: mods.ctrl ? negate(Math.sign(ticksY) * WHEEL_ZOOM_STEP) : 0,
		},
		shiftKey: mods.shift,
		altKey: mods.alt,
		ctrlKey: mods.ctrl,
		metaKey: false,
		accelKey: mods.ctrl,
	}
}

/**
 * Moves a pointer-down screen point onto the nearest handle whose hit geometry, grown by half a
 * cell, contains it. Handle targets are 4.5–6.75 px half-extents (apis#6), smaller than a cell,
 * and `getOverlayAtPoint` ignores the hit-test margin for filled geometry, so a cell-centre click
 * usually misses; the select tool then routes the snapped point itself (Idle.ts:61-108). Only the
 * selection's resize/rotate handles and shape handles expose geometry; the selection box returns
 * null (SelectionForegroundOverlayUtil.ts:136-145), so clicks inside a selection are never moved.
 * Returns whether `point` was changed.
 */
export function snapToHandle(editor: Editor, point: ScreenPoint): boolean {
	const entries = editor.overlays.getActiveOverlayEntries()
	if (entries.length === 0) return false
	const zoom = editor.getZoomLevel()
	const page = editor.screenToPage(point)
	const growX = CELL_W / 2 / zoom
	const growY = CELL_H / 2 / zoom
	let bestScore = Infinity
	let bestX = 0
	let bestY = 0
	for (let i = entries.length - 1; i >= 0; i--) {
		const { overlays } = entries[i]
		for (let j = 0; j < overlays.length; j++) {
			const overlay = overlays[j]
			const geometry = editor.overlays.getOverlayGeometry(overlay)
			if (!geometry) continue
			const isRotate = (overlay.props as { overlayType?: string }).overlayType === 'rotate_handle'
			const b = geometry.bounds
			if (page.x < b.minX - growX || page.x > b.maxX + growX) continue
			if (page.y < b.minY - growY || page.y > b.maxY + growY) continue
			const small = b.w * zoom <= SMALL_HANDLE_PX && b.h * zoom <= SMALL_HANDLE_PX
			// Inside a long edge handle keep the pointer's own position along it.
			const tx = small ? b.midX : Math.min(b.maxX - b.w * 0.1, Math.max(b.minX + b.w * 0.1, page.x))
			const ty = small ? b.midY : Math.min(b.maxY - b.h * 0.1, Math.max(b.minY + b.h * 0.1, page.y))
			const dx = page.x - tx
			const dy = page.y - ty
			// Prefer the nearer target, then the smaller one (a corner over the edge it sits on).
			const score =
				dx * dx +
				dy * dy +
				(small ? 0 : 1e-3) +
				b.w * b.h * 1e-9 +
				(isRotate ? ROTATE_HANDLE_PENALTY : 0)
			if (score < bestScore) {
				bestScore = score
				bestX = tx
				bestY = ty
			}
		}
	}
	if (bestScore === Infinity) return false
	const screen = editor.pageToScreen({ x: bestX, y: bestY })
	point.x = screen.x
	point.y = screen.y
	return true
}

export interface WheelBatch {
	col: number
	row: number
	/** Pan ticks after the ±WHEEL_MAX_TICKS cap. */
	ticksX: number
	ticksY: number
	/** Zoom steps from alt+wheel: negative = in. */
	zoomTicks: number
	shift: boolean
	alt: boolean
	ctrl: boolean
}

/**
 * Sums wheel reports between frames. Terminal wheel reports carry no magnitude and a trackpad
 * flick produces dozens per frame, so each one is a tick and the frame dispatches one event.
 * alt+wheel zooms (ctrl+wheel is a font-size gesture in many terminals), shift+wheel scrolls
 * horizontally, buttons 66/67 arrive as `dx`.
 */
export class WheelAccumulator {
	private pending = false
	private ticksX = 0
	private ticksY = 0
	private zoomTicks = 0
	private col = 0
	private row = 0
	private shift = false
	private alt = false
	private ctrl = false

	add(event: MouseEvent, mods: Readonly<ModifierFlags>): void {
		if (mods.alt) {
			this.zoomTicks += event.dy
		} else if (mods.shift) {
			this.ticksX += event.dy + event.dx
		} else {
			this.ticksX += event.dx
			this.ticksY += event.dy
		}
		this.col = event.col
		this.row = event.row
		this.shift = mods.shift
		this.alt = mods.alt
		this.ctrl = mods.ctrl
		this.pending = true
	}

	isPending(): boolean {
		return this.pending
	}

	/** Writes the coalesced batch into `out` and resets; false when nothing arrived. */
	take(out: WheelBatch): boolean {
		if (!this.pending) return false
		out.col = this.col
		out.row = this.row
		out.ticksX = clampTicks(this.ticksX)
		out.ticksY = clampTicks(this.ticksY)
		out.zoomTicks = clampTicks(this.zoomTicks)
		out.shift = this.shift
		out.alt = this.alt
		out.ctrl = this.ctrl
		this.pending = false
		this.ticksX = 0
		this.ticksY = 0
		this.zoomTicks = 0
		return true
	}
}

function clampTicks(ticks: number): number {
	return Math.max(-WHEEL_MAX_TICKS, Math.min(WHEEL_MAX_TICKS, ticks))
}
