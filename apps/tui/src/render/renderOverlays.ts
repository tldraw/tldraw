import { Editor } from '@tldraw/editor'
import { unsafe__withoutCapture } from '@tldraw/state'
import type { TLCursorType } from '@tldraw/tlschema'
import { CELL_H, CELL_W } from '../editor/constants'
import { GlyphSet } from '../terminal/chars'
import { CellStyle, Rect, Screen } from '../terminal/Screen'
import type { Cell, EditCaret } from '../ui/UiState'
import { getTextMask } from './raster'
import { RenderOptions, locateCaret } from './renderShapes'
import { TerminalCanvas } from './TerminalCanvas'
import { gridRgb } from './theme'

export interface OverlayRenderOptions extends RenderOptions {
	editCaret: EditCaret | null
	/** Pointer position in terminal cells (the virtual pointer in keyboard-pointer mode). */
	pointerCell: Cell | null
	pointerMode: boolean
	/** Draw the cursor glyph for non-default editor cursors even with a real mouse. */
	showCursorGlyph: boolean
}

const MIN_GRID_PITCH_COLS = 4
const MIN_GRID_PITCH_ROWS = 2
const gridStyle: Partial<CellStyle> = { fg: -1 }
const cursorStyle: Partial<CellStyle> = { fg: -1, inverse: true }
const canvases = new WeakMap<Screen, TerminalCanvas>()

function getCanvas(screen: Screen, canvas: Rect, opts: RenderOptions): TerminalCanvas {
	let ctx = canvases.get(screen)
	if (!ctx || ctx.strokeMode !== opts.stroke || ctx.background !== opts.background) {
		ctx = new TerminalCanvas(screen, canvas, {
			background: opts.background,
			stroke: opts.stroke,
			protect: getTextMask(screen),
		})
		canvases.set(screen, ctx)
	} else {
		ctx.reset(canvas)
	}
	return ctx
}

/**
 * Grid dots at the pitch of the smallest `gridSteps` entry that is at least 4 columns and 2 rows
 * apart on screen (DefaultGrid.tsx fades layers by zoom instead). Dots go only on cells nothing
 * has drawn on yet, so the grid can be drawn after the shapes.
 */
export function renderGrid(
	editor: Editor,
	screen: Screen,
	canvas: Rect,
	opts: RenderOptions
): void {
	if (!editor.getInstanceState().isGridMode) return
	const cam = opts.camera ?? editor.getCamera()
	const gridSize = editor.getDocumentSettings().gridSize
	const steps = editor.options.gridSteps
	let pitch = 0
	for (const { step } of steps) {
		const px = step * gridSize * cam.z
		if (px / CELL_W >= MIN_GRID_PITCH_COLS && px / CELL_H >= MIN_GRID_PITCH_ROWS) {
			if (pitch === 0 || px < pitch) pitch = px
		}
	}
	if (pitch === 0) {
		for (const { step } of steps) pitch = Math.max(pitch, step * gridSize * cam.z)
	}
	if (pitch <= 0) return
	gridStyle.fg = gridRgb(opts.colorMode)
	const glyph = opts.glyphs.gridDot
	// First grid line at or past the canvas origin, in screen px.
	const startX = Math.ceil((-cam.x * cam.z) / pitch) * pitch
	const startY = Math.ceil((-cam.y * cam.z) / pitch) * pitch
	const maxX = canvas.w * CELL_W
	const maxY = canvas.h * CELL_H
	for (let sy = startY; sy < maxY; sy += pitch) {
		const row = canvas.y + Math.floor((sy + cam.y * cam.z) / CELL_H)
		for (let sx = startX; sx < maxX; sx += pitch) {
			const col = canvas.x + Math.floor((sx + cam.x * cam.z) / CELL_W)
			if (screen.isEmptyCell(col, row)) screen.put(col, row, glyph, gridStyle)
		}
	}
}

function cursorGlyph(g: GlyphSet, type: TLCursorType, rotation: number): string | null {
	let base: number
	switch (type) {
		case 'ew-resize':
		case 'resize-edge':
			base = 0
			break
		case 'ns-resize':
			base = 90
			break
		case 'nwse-resize':
		case 'resize-corner':
			base = 45
			break
		case 'nesw-resize':
			base = 135
			break
		case 'rotate':
		case 'nesw-rotate':
		case 'nwse-rotate':
		case 'swne-rotate':
		case 'senw-rotate':
			return g.cursorRotate
		case 'grab':
			return g.cursorGrab
		case 'grabbing':
			return g.cursorPointer
		case 'move':
			return g.cursorMove
		case 'cross':
			return g.cursorCross
		case 'text':
		case 'comment':
			return g.cursorText
		case 'pointer':
		case 'zoom-in':
		case 'zoom-out':
			return g.cursorPointer
		default:
			return null
	}
	// Quantise the rotated direction to the four glyphs we have.
	let angle = (base + (rotation * 180) / Math.PI) % 180
	if (angle < 0) angle += 180
	switch (Math.round(angle / 45) % 4) {
		case 0:
			return g.cursorEw
		case 1:
			return g.cursorNwse
		case 2:
			return g.cursorNs
		default:
			return g.cursorNesw
	}
}

function inRect(cell: Cell, r: Rect): boolean {
	return cell.col >= r.x && cell.col < r.x + r.w && cell.row >= r.y && cell.row < r.y + r.h
}

/**
 * Draws tldraw's overlays (selection, handles, indicators, brush, snaps, scribbles, arrow hints)
 * through the canvas emulation, then the grid, the edit caret and the cursor glyph. Must run after
 * renderShapes on the same screen: strokes skip the cells its labels occupy. The overlay entries,
 * camera and theme are captured; `util.render` runs without capture because it reads per-shape
 * transforms that the entries already depend on.
 */
export function renderOverlays(
	editor: Editor,
	screen: Screen,
	canvas: Rect,
	opts: OverlayRenderOptions
): { caretCell: Cell | null } {
	renderGrid(editor, screen, canvas, opts)

	const entries = editor.overlays.getActiveOverlayEntries()
	editor.overlays.getHoveredOverlayId()
	const cam = opts.camera ?? editor.getCamera()
	const ctx = getCanvas(screen, canvas, opts)
	const canvasCtx = ctx as unknown as CanvasRenderingContext2D
	unsafe__withoutCapture(() => {
		// Page space, like CanvasOverlays.tsx:72-84.
		ctx.setTransform(cam.z, 0, 0, cam.z, cam.z * cam.x, cam.z * cam.y)
		for (const { util, overlays } of entries) {
			ctx.save()
			try {
				util.render(canvasCtx, overlays)
			} finally {
				ctx.restore()
			}
		}
	})

	let caretCell: Cell | null = null
	if (opts.editCaret) caretCell = locateCaret(editor, screen, canvas, opts, opts.editCaret)

	const pointer = opts.pointerCell
	if (pointer && inRect(pointer, canvas)) {
		let glyph: string | null = null
		if (opts.pointerMode) {
			glyph = opts.glyphs.cursorCross
		} else if (opts.showCursorGlyph) {
			const cursor = editor.getInstanceState().cursor
			glyph = cursorGlyph(opts.glyphs, cursor.type, cursor.rotation)
		}
		if (glyph) screen.put(pointer.col, pointer.row, glyph, cursorStyle)
	}

	return { caretCell }
}
