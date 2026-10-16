import { Vec, type Editor, type TLKeyboardEventInfo, type TLShapeId } from '@tldraw/editor'
import { react, unsafe__withoutCapture } from '@tldraw/state'
import { GeoShapeGeoStyle } from '@tldraw/tlschema'
import { defaultHandleExternalTextContent } from 'tldraw'
import type { ActionInvocation } from '../actions/actionIds'
import { runAction } from '../actions/actions'
import type { AppContext, ChromeLayout, HotRegion } from '../app/context'
import {
	codeForKey,
	type FocusEvent,
	type KeyEvent,
	type MouseEvent,
	type PasteEvent,
	type TerminalEvent,
} from '../terminal/InputParser'
import type { Cell } from '../ui/UiState'
import { matchShortcut } from './keymap'
import { ModifierTracker, type ModifierFlags } from './modifiers'
import {
	WheelAccumulator,
	canvasCenterCell,
	cellToScreen,
	clampToCanvas,
	isInCanvas,
	pointerEvent,
	screenToCell,
	snapToHandle,
	wheelEvent,
	type ScreenPoint,
	type WheelBatch,
} from './pointer'
import { TextEditSession } from './TextEditSession'

/** Second press of ctrl+c (quit) or `g` (cycle geo shapes) must land within this window. */
const REPEAT_WINDOW_MS = 1000
const POINTER_MODE_FAST_STEP = 5

/**
 * Turns terminal events into editor events and app actions. The order in `handleEvent` is the
 * contract: resize/focus bookkeeping, then an open popup takes everything, then mouse events go to
 * the chrome's hot regions or the canvas and keys go to the text edit session, Escape, the
 * shortcut table, the keyboard pointer and finally the editor.
 */
export class InputController {
	private readonly editor: Editor
	private readonly modifiers: ModifierTracker
	private readonly wheel = new WheelAccumulator()
	private readonly stopWatchingEditing: () => void
	private session: TextEditSession | null = null

	// Scratch objects for the per-event paths.
	private readonly mods: ModifierFlags = { shift: false, alt: false, ctrl: false }
	private readonly point: ScreenPoint = { x: 0, y: 0 }
	private readonly cell: Cell = { col: 0, row: 0 }
	private readonly batch: WheelBatch = {
		col: 0,
		row: 0,
		ticksX: 0,
		ticksY: 0,
		zoomTicks: 0,
		shift: false,
		alt: false,
		ctrl: false,
	}

	/** Mouse button believed held (0 left, 1 middle, 2 right) and where it went down. */
	private held: number | null = null
	private heldCol = 0
	private heldRow = 0
	/** Keyboard pointer mode's virtual button; mirrored into `ui.pointerButtonDown`. */
	private virtualDown = false

	// Duplicate-move suppression: the last pointer_move dispatched.
	private lastMoveValid = false
	private lastMoveCol = 0
	private lastMoveRow = 0
	private lastMoveButton = -1
	private lastMoveShift = false
	private lastMoveAlt = false
	private lastMoveCtrl = false

	private hoverCanvas = false
	private hintRegionId: string | null = null
	private hintRegionHint: string | null = null
	private lastCtrlC = -Infinity
	private lastGeoKey = -Infinity
	private disposed = false

	constructor(private readonly ctx: AppContext) {
		this.editor = ctx.editor
		this.modifiers = new ModifierTracker(ctx.editor, ctx.ui)
		// Editing starts from several places (Enter, double click, the text tool, the edit-text
		// action) and ends from more, so the session follows the editor rather than our own events.
		this.stopWatchingEditing = react('tui edit session', () => {
			const id = this.editor.getEditingShapeId()
			if (id === (this.session ? this.session.shapeId : null)) return
			unsafe__withoutCapture(() => this.syncSession(id))
		})
	}

	getEditSession(): TextEditSession | null {
		return this.session
	}

	/** Pending work that is cheaper once per frame: coalesced wheel ticks, pointer-mode cleanup. */
	flushFrame(): void {
		if (this.disposed) return
		if (this.virtualDown && !this.ctx.ui.pointerMode.get()) this.releaseVirtual()
		if (this.wheel.take(this.batch)) this.dispatchWheel(this.batch)
	}

	dispose(): void {
		if (this.disposed) return
		this.disposed = true
		this.stopWatchingEditing()
		if (this.session) {
			this.session.end()
			this.session = null
		}
	}

	handleEvent(event: TerminalEvent): void {
		if (this.disposed) return
		switch (event.type) {
			case 'resize':
				this.onResize()
				return
			case 'focus':
				this.onFocus(event)
				return
			case 'reply':
				return
		}
		if (event.type === 'key') {
			if (!event.release && !this.ctx.ui.firstKeySeen.get()) this.ctx.ui.firstKeySeen.set(true)
			if (!this.session && this.tryGeoCycle(event)) return
		}
		if (this.ctx.ui.popup.get() !== null) {
			if (event.type === 'mouse') this.setHoverCanvas(false)
			const result = this.ctx.popups.handleInput(event)
			if (result.action) runAction(this.ctx, result.action)
			if (result.consumed) return
		}
		switch (event.type) {
			case 'mouse':
				this.onMouse(event)
				return
			case 'key':
				this.onKey(event)
				return
			case 'paste':
				this.onPaste(event)
				return
		}
	}

	// ------------------------------------------------------------------------------------------
	// Terminal state
	// ------------------------------------------------------------------------------------------

	private onResize() {
		// The App moves the viewport; a gesture cannot survive the cells moving under it.
		if (this.held !== null) this.impliedUp()
		if (this.virtualDown) this.releaseVirtual()
		this.lastMoveValid = false
	}

	private onFocus(event: FocusEvent) {
		this.ctx.ui.focused.set(event.focused)
		if (event.focused) {
			this.ctx.requestRender()
			return
		}
		if (this.held !== null) this.impliedUp()
		if (this.virtualDown) this.releaseVirtual()
		this.modifiers.releaseAll()
		const { inputs } = this.editor
		if (inputs.getIsPointing() || inputs.getIsDragging()) this.editor.cancel()
		this.setHoverCanvas(false)
		this.setRegionHint(null)
		this.lastMoveValid = false
	}

	// ------------------------------------------------------------------------------------------
	// Mouse
	// ------------------------------------------------------------------------------------------

	private onMouse(event: MouseEvent) {
		const layout = this.ctx.getLayout()
		this.setPointerCell(event.col, event.row)
		if (this.held !== null) {
			if (event.action === 'up') {
				this.onUp(event, layout)
				return
			}
			// A drag keeps the gesture wherever it goes; anything else means the release was lost.
			if (event.action === 'drag') {
				this.dispatchMove(event, layout)
				return
			}
			if (event.action === 'move' || event.action === 'down') this.impliedUp()
		}
		const region = event.action === 'wheel' ? null : this.hitRegion(event.col, event.row)
		if (region) {
			this.setHoverCanvas(false)
			this.setRegionHint(region)
			if (event.action === 'down' && event.button === 0) {
				if (region.action) runAction(this.ctx, region.action)
				else if (region.onPress) region.onPress(event)
			}
			return
		}
		this.setRegionHint(null)
		if (!isInCanvas(layout, event.col, event.row)) {
			this.setHoverCanvas(false)
			return
		}
		this.setHoverCanvas(true)
		switch (event.action) {
			case 'move':
				this.dispatchMove(event, layout)
				return
			case 'drag':
				this.held = event.button >= 0 ? event.button : 0
				this.heldCol = event.col
				this.heldRow = event.row
				this.dispatchMove(event, layout)
				return
			case 'down':
				this.onDown(event, layout)
				return
			case 'up':
				this.onUp(event, layout)
				return
			case 'wheel':
				this.wheel.add(
					event,
					this.modifiers.effective(event.shift, event.alt, event.ctrl, this.mods)
				)
				return
		}
	}

	private dispatchMove(event: MouseEvent, layout: ChromeLayout) {
		const mods = this.modifiers.effective(event.shift, event.alt, event.ctrl, this.mods)
		const button = this.held ?? -1
		if (
			this.lastMoveValid &&
			this.lastMoveCol === event.col &&
			this.lastMoveRow === event.row &&
			this.lastMoveButton === button &&
			this.lastMoveShift === mods.shift &&
			this.lastMoveAlt === mods.alt &&
			this.lastMoveCtrl === mods.ctrl
		) {
			return
		}
		this.lastMoveValid = true
		this.lastMoveCol = event.col
		this.lastMoveRow = event.row
		this.lastMoveButton = button
		this.lastMoveShift = mods.shift
		this.lastMoveAlt = mods.alt
		this.lastMoveCtrl = mods.ctrl
		const p = cellToScreen(layout, event.col, event.row, this.point)
		this.modifiers.sync(mods)
		this.editor.dispatch(pointerEvent('pointer_move', p.x, p.y, button < 0 ? 0 : button, mods))
	}

	private onDown(event: MouseEvent, layout: ChromeLayout) {
		const button = event.button < 0 ? 0 : event.button
		const mods = this.modifiers.effective(event.shift, event.alt, event.ctrl, this.mods)
		const p = cellToScreen(layout, event.col, event.row, this.point)
		if (button === 0) snapToHandle(this.editor, p)
		this.modifiers.sync(mods)
		this.editor.dispatch(pointerEvent('pointer_down', p.x, p.y, button, mods))
		this.held = button
		this.heldCol = event.col
		this.heldRow = event.row
		this.lastMoveValid = false
	}

	private onUp(event: MouseEvent, layout: ChromeLayout) {
		const button = this.held ?? (event.button < 0 ? 0 : event.button)
		const mods = this.modifiers.effective(event.shift, event.alt, event.ctrl, this.mods)
		const p = cellToScreen(layout, event.col, event.row, this.point)
		this.modifiers.sync(mods)
		this.editor.dispatch(pointerEvent('pointer_up', p.x, p.y, button, mods))
		// tldraw turns a static right release into right_click (selecting the shape under the
		// pointer); a right drag panned instead and gets no menu.
		const staticRight =
			button === 2 && this.held !== null && this.heldCol === event.col && this.heldRow === event.row
		this.held = null
		this.lastMoveValid = false
		this.afterPointerUp()
		if (staticRight) this.ctx.popups.openContextMenu(event.col, event.row)
	}

	/** The terminal lost a release: end the gesture where the button went down. */
	private impliedUp() {
		if (this.held === null) return
		const layout = this.ctx.getLayout()
		const mods = this.modifiers.current(this.mods)
		const p = cellToScreen(layout, this.heldCol, this.heldRow, this.point)
		this.modifiers.sync(mods)
		this.editor.dispatch(pointerEvent('pointer_up', p.x, p.y, this.held, mods))
		this.held = null
		this.lastMoveValid = false
		this.afterPointerUp()
	}

	/** Non-sticky latches are one-shot; tell the editor straight away so `inputs.keys` agrees. */
	private afterPointerUp() {
		this.ctx.ui.releaseLatches()
		this.modifiers.sync(this.modifiers.current(this.mods))
	}

	private dispatchWheel(batch: WheelBatch) {
		const layout = this.ctx.getLayout()
		const p = cellToScreen(layout, batch.col, batch.row, this.point)
		if (batch.zoomTicks !== 0) {
			const steps = Math.abs(batch.zoomTicks)
			const at = new Vec(p.x, p.y)
			for (let i = 0; i < steps; i++) {
				if (batch.zoomTicks < 0) this.editor.zoomIn(at, { immediate: true })
				else this.editor.zoomOut(at, { immediate: true })
			}
		}
		if (batch.ticksX !== 0 || batch.ticksY !== 0) {
			const mods = this.modifiers.effective(batch.shift, false, batch.ctrl, this.mods)
			this.modifiers.sync(mods)
			this.editor.dispatch(wheelEvent(p.x, p.y, batch.ticksX, batch.ticksY, mods))
		}
	}

	private hitRegion(col: number, row: number): HotRegion | null {
		const regions = this.ctx.getHotRegions()
		for (let i = 0; i < regions.length; i++) {
			const { rect } = regions[i]
			if (col >= rect.x && col < rect.x + rect.w && row >= rect.y && row < rect.y + rect.h) {
				return regions[i]
			}
		}
		return null
	}

	private setRegionHint(region: HotRegion | null) {
		const id = region ? region.id : null
		if (id === this.hintRegionId) return
		const { ui } = this.ctx
		if (this.hintRegionHint !== null && ui.hint.get() === this.hintRegionHint) ui.setHint(null)
		this.hintRegionId = id
		this.hintRegionHint = region && region.hint ? region.hint : null
		if (this.hintRegionHint !== null) ui.setHint(this.hintRegionHint)
	}

	private setHoverCanvas(hovering: boolean) {
		if (this.hoverCanvas === hovering) return
		this.hoverCanvas = hovering
		if (this.editor.getInstanceState().isHoveringCanvas !== hovering) {
			this.editor.updateInstanceState({ isHoveringCanvas: hovering })
		}
	}

	private setPointerCell(col: number, row: number) {
		const current = this.ctx.ui.pointerCell.get()
		if (current && current.col === col && current.row === row) return
		this.ctx.ui.pointerCell.set({ col, row })
	}

	// ------------------------------------------------------------------------------------------
	// Keyboard
	// ------------------------------------------------------------------------------------------

	private onKey(event: KeyEvent) {
		const { ui } = this.ctx
		if (this.modifiers.handleModifierKey(event)) return
		if (event.release) return
		if (this.session) {
			if (this.session.handleKey(event) === 'complete') this.editor.complete()
			return
		}
		if (event.key === 'Escape') {
			this.escape(event)
			return
		}
		const invocation = matchShortcut(event, ui.keyboardEncoding.get())
		if (invocation) {
			this.runShortcut(invocation, event)
			return
		}
		if (ui.pointerMode.get() && this.handlePointerModeKey(event)) return
		this.forwardKey(event)
	}

	/**
	 * Mirrors useDocumentEvents.ts:169-198: no tool handles Escape, the document handler calls
	 * `editor.cancel()` once per press (the `inputs.keys` entry guards repeats until key up, which a
	 * terminal never sends, so it is removed again right away).
	 */
	private escape(event: KeyEvent) {
		if (event.repeat) return
		const { inputs } = this.editor
		if (inputs.keys.has('Escape')) return
		inputs.keys.add('Escape')
		try {
			this.editor.cancel()
		} finally {
			inputs.keys.delete('Escape')
		}
	}

	private runShortcut(invocation: ActionInvocation, event: KeyEvent) {
		const { ctx } = this
		switch (invocation.id) {
			case 'edit.copy': {
				if (!event.ctrl || ctx.editor.getSelectedShapeIds().length > 0) break
				// TUI convention: ctrl+c with nothing to copy means "I want out".
				const now = ctx.now()
				if (now - this.lastCtrlC <= REPEAT_WINDOW_MS) {
					this.lastCtrlC = -Infinity
					runAction(ctx, { id: 'app.quit' })
				} else {
					this.lastCtrlC = now
					ctx.ui.setHint('ctrl+q quits')
				}
				return
			}
			case 'ui.geo-picker':
				this.lastGeoKey = ctx.now()
				break
		}
		runAction(ctx, invocation)
	}

	/** `g` again within a second (or while the picker is open) steps to the next geo shape. */
	private tryGeoCycle(event: KeyEvent): boolean {
		if (event.release || event.key !== 'g' || event.ctrl || event.alt || event.shift) return false
		const popup = this.ctx.ui.popup.get()
		if (popup !== null && popup.kind !== 'geo') return false
		const now = this.ctx.now()
		const within = now - this.lastGeoKey <= REPEAT_WINDOW_MS
		this.lastGeoKey = now
		if (!within && popup === null) return false
		const values = GeoShapeGeoStyle.values
		const current = this.editor.getStyleForNextShape(GeoShapeGeoStyle)
		const index = (values.indexOf(current) + 1) % values.length
		runAction(this.ctx, { id: 'tool.geo', arg: values[index] })
		if (popup !== null) this.ctx.ui.openPopup({ kind: 'geo', index })
		return true
	}

	/**
	 * Only the keys the state chart handles reach the editor (Idle.ts:555-690: arrows nudge,
	 * ctrl+arrows select adjacent, Tab, Enter starts editing on key up after a key down) plus bare
	 * letters. Never Space (pointer-mode button; spacebarPanning is off) or Escape.
	 */
	private forwardKey(event: KeyEvent) {
		const { key } = event
		const forward =
			key === 'Enter' ||
			key === 'Tab' ||
			key === 'ArrowLeft' ||
			key === 'ArrowRight' ||
			key === 'ArrowUp' ||
			key === 'ArrowDown' ||
			(key !== ' ' && [...key].length === 1)
		if (!forward) return
		const mods = this.modifiers.current(this.mods)
		// Nudging reads `inputs.keys.has('ShiftLeft')` (Idle.ts:749-752), not the event flag.
		this.modifiers.sync(mods)
		const info: TLKeyboardEventInfo = {
			type: 'keyboard',
			name: event.repeat ? 'key_repeat' : 'key_down',
			key,
			code: event.code || codeForKey(key),
			shiftKey: event.shift || mods.shift,
			altKey: event.alt || mods.alt,
			ctrlKey: event.ctrl || mods.ctrl,
			metaKey: false,
			accelKey: event.ctrl || mods.ctrl,
		}
		// One transaction for the pair: each dispatch commits on its own otherwise (latency#13).
		this.editor.run(() => {
			this.editor.dispatch(info)
			if (!event.repeat) this.editor.dispatch({ ...info, name: 'key_up' })
		})
	}

	// ------------------------------------------------------------------------------------------
	// Keyboard pointer mode
	// ------------------------------------------------------------------------------------------

	private virtualCell(): Cell {
		const current = this.ctx.ui.pointerCell.get()
		const cell = current ?? canvasCenterCell(this.ctx.getLayout())
		this.cell.col = cell.col
		this.cell.row = cell.row
		return clampToCanvas(this.ctx.getLayout(), this.cell)
	}

	private handlePointerModeKey(event: KeyEvent): boolean {
		switch (event.key) {
			case 'ArrowLeft':
			case 'ArrowRight':
			case 'ArrowUp':
			case 'ArrowDown': {
				const mods = this.modifiers.current(this.mods)
				const step = mods.shift || event.shift ? POINTER_MODE_FAST_STEP : 1
				const cell = this.virtualCell()
				if (event.key === 'ArrowLeft') cell.col -= step
				else if (event.key === 'ArrowRight') cell.col += step
				else if (event.key === 'ArrowUp') cell.row -= step
				else cell.row += step
				this.moveVirtualPointer(cell)
				return true
			}
			case ' ':
				if (this.virtualDown) this.releaseVirtual()
				else this.pressVirtual()
				return true
			case 'Enter':
				if (this.virtualDown) {
					this.releaseVirtual()
				} else {
					this.pressVirtual()
					this.releaseVirtual()
				}
				return true
			case 'Tab':
				this.jumpToNextShape(event.shift)
				return true
			default:
				return false
		}
	}

	private moveVirtualPointer(cell: Cell) {
		clampToCanvas(this.ctx.getLayout(), cell)
		this.setPointerCell(cell.col, cell.row)
		this.setHoverCanvas(true)
		const mods = this.modifiers.current(this.mods)
		const p = cellToScreen(this.ctx.getLayout(), cell.col, cell.row, this.point)
		this.modifiers.sync(mods)
		this.editor.dispatch(pointerEvent('pointer_move', p.x, p.y, 0, mods))
	}

	private pressVirtual() {
		const cell = this.virtualCell()
		const mods = this.modifiers.current(this.mods)
		const p = cellToScreen(this.ctx.getLayout(), cell.col, cell.row, this.point)
		snapToHandle(this.editor, p)
		this.setHoverCanvas(true)
		this.modifiers.sync(mods)
		this.editor.dispatch(pointerEvent('pointer_down', p.x, p.y, 0, mods))
		this.virtualDown = true
		this.ctx.ui.pointerButtonDown.set(true)
	}

	private releaseVirtual() {
		const cell = this.virtualCell()
		const mods = this.modifiers.current(this.mods)
		const p = cellToScreen(this.ctx.getLayout(), cell.col, cell.row, this.point)
		this.modifiers.sync(mods)
		this.editor.dispatch(pointerEvent('pointer_up', p.x, p.y, 0, mods))
		this.virtualDown = false
		this.ctx.ui.pointerButtonDown.set(false)
		this.afterPointerUp()
	}

	/** Tab: the next shape in z order after the one under the virtual pointer (shift: previous). */
	private jumpToNextShape(backwards: boolean) {
		const { editor } = this
		const shapes = editor.getCurrentPageShapesSorted()
		if (shapes.length === 0) return
		const layout = this.ctx.getLayout()
		const here = this.virtualCell()
		const hereCol = here.col
		const hereRow = here.row
		let current = -1
		for (let i = 0; i < shapes.length; i++) {
			const bounds = editor.getShapePageBounds(shapes[i])
			if (!bounds) continue
			const screen = editor.pageToScreen(bounds.center)
			const cell = screenToCell(layout, screen.x, screen.y, this.cell)
			if (cell.col === hereCol && cell.row === hereRow) {
				current = i
				break
			}
		}
		const n = shapes.length
		const next =
			current === -1 ? (backwards ? n - 1 : 0) : (((current + (backwards ? -1 : 1)) % n) + n) % n
		const bounds = editor.getShapePageBounds(shapes[next])
		if (!bounds) return
		let screen = editor.pageToScreen(bounds.center)
		let cell = screenToCell(layout, screen.x, screen.y, this.cell)
		if (!isInCanvas(layout, cell.col, cell.row)) {
			editor.centerOnPoint(bounds.center, { immediate: true })
			screen = editor.pageToScreen(bounds.center)
			cell = screenToCell(layout, screen.x, screen.y, this.cell)
		}
		this.moveVirtualPointer(cell)
	}

	// ------------------------------------------------------------------------------------------
	// Paste and text editing
	// ------------------------------------------------------------------------------------------

	private onPaste(event: PasteEvent) {
		if (event.text.length === 0) return
		if (this.session) {
			this.session.insert(event.text)
			return
		}
		const { editor } = this
		const point = this.hoverCanvas ? editor.inputs.getCurrentPagePoint().clone() : undefined
		editor.markHistoryStoppingPoint('paste')
		// Not `putExternalContent`: the React shell registers the external content handlers and
		// nothing does headlessly, so the text handler is called directly.
		defaultHandleExternalTextContent(editor, { text: event.text, point }).catch(
			(error: unknown) => {
				const message = error instanceof Error ? error.message : String(error)
				this.ctx.ui.showError(message, this.ctx.now())
			}
		)
	}

	private syncSession(id: TLShapeId | null) {
		if (this.session) {
			this.session.end()
			this.session = null
		}
		if (id === null) return
		const shape = this.editor.getShape(id)
		if (shape) this.session = new TextEditSession(this.ctx, shape)
	}
}
