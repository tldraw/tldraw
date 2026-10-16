import { existsSync } from 'node:fs'
import { basename } from 'node:path'
import { Box, type Editor, type TLBinding, type TLShape, type TLShapeId } from '@tldraw/editor'
import {
	EffectScheduler,
	computed,
	react,
	unsafe__withoutCapture,
	type Computed,
} from '@tldraw/state'
import { isEqual } from '@tldraw/utils'
import { resolveAppearance, type Appearance } from './app/appearance'
import type { AppContext, ChromeLayout, HotRegion, PopupController } from './app/context'
import type { DomGlobals } from './bootstrap/dom'
import type { FrameInfo, FrameScheduler } from './bootstrap/frame'
import { CELL_H, CELL_W } from './editor/constants'
import { createTuiEditor, type TuiEditor } from './editor/createTuiEditor'
import { loadTldrFile, persistPrefs, watchDocumentChanges } from './file/tldrFile'
import { InputController } from './input/InputController'
import { canvasCenterCell } from './input/pointer'
import type { StrokeMode } from './render/raster'
import {
	getPromptCaretCell,
	layoutChrome,
	renderChrome,
	type ChromeContext,
	type UiSnapshot,
} from './render/renderChrome'
import { renderOverlays, type OverlayRenderOptions } from './render/renderOverlays'
import { renderShapes, type RenderOptions } from './render/renderShapes'
import { createRenderToText } from './render/renderToText'
import { getThemeColors, paletteRgb } from './render/theme'
import { getGlyphs, type GlyphSet, type GlyphTier } from './terminal/chars'
import type { TerminalEvent } from './terminal/InputParser'
import { Screen, type Rgb } from './terminal/Screen'
import type { Terminal, TerminalCapabilities } from './terminal/Terminal'
import { createPopupController } from './ui/popups'
import {
	UiState,
	type Cell,
	type DebugStats,
	type EditCaret,
	type Latches,
	type PopupState,
	type UiError,
} from './ui/UiState'

export interface AppOptions {
	terminal: Terminal
	frame: FrameScheduler
	dom: DomGlobals
	filePath?: string | null
	/** `--light` / `--dark`. */
	colorMode?: 'light' | 'dark' | null
	glyphs?: GlyphTier | null
	stroke?: StrokeMode | null
	debug?: boolean
	env?: NodeJS.ProcessEnv
	osc52?: boolean
	pointerMode?: boolean
	/** Where user preferences are written on quit; omitted or null means they are not persisted. */
	prefsPath?: string | null
	onQuit?(code: number): void
}

/** Every UI atom the render pass reads, bundled so the effect has one parent for all of them. */
interface UiFrameSnapshot extends UiSnapshot {
	hint: string | null
	error: UiError | null
	latches: Latches
	pointerMode: boolean
	pointerCell: Cell | null
	pointerButtonDown: boolean
	filePath: string | null
	dirty: boolean
	debug: boolean
	firstKeySeen: boolean
	editCaret: EditCaret | null
	focused: boolean
}

interface InstanceSnapshot {
	cursor: unknown
	brush: unknown
	zoomBrush: unknown
	scribbles: unknown
	isGridMode: boolean
	isToolLocked: boolean
	screenBounds: unknown
	isFocusMode: boolean
	isDebugMode: boolean
	stylesForNextShape: unknown
}

/**
 * Everything renderShapes reads, by identity or value. While none of it changes (hover, selection,
 * status-bar coordinates, overlays) the shape layer saved in the Screen is restored instead of
 * re-rasterizing every visible shape.
 */
interface ShapeLayerKey {
	shapes: readonly TLShape[]
	bindings: unknown
	erasing: readonly TLShapeId[]
	theme: unknown
	colorMode: 'light' | 'dark'
	background: Rgb
	camX: number
	camY: number
	camZ: number
	canvasX: number
	canvasY: number
	canvasW: number
	canvasH: number
	cols: number
	rows: number
}

interface Session {
	editor: Editor
	tui: TuiEditor
	screen: Screen
	ctx: AppContext
	input: InputController
	effect: EffectScheduler<void>
	uiSnapshot: Computed<UiFrameSnapshot>
	instanceSnapshot: Computed<InstanceSnapshot>
	capabilities: TerminalCapabilities
	glyphs: GlyphSet
	appearance: Appearance
	renderOpts: RenderOptions
	overlayOpts: OverlayRenderOptions
	/** One query for the session: `store.query.records` builds a new computed per call. */
	bindings: Computed<TLBinding[]>
	layerKey: ShapeLayerKey | null
	/** Shapes drawn when the layer was last rendered (debug stats on cached frames). */
	layerRendered: number
}

interface DebugWindow {
	frames: number
	renders: number
	shapesMs: number
	overlaysMs: number
	chromeMs: number
	flushMs: number
	frameMs: number
	bytes: number
	inputToWriteMs: number
	rendered: number
	startedAt: number
}

interface DebugTotals {
	frames: number
	renders: number
	renderMs: number
	maxInputToWriteMs: number
}

const DEBUG_PUBLISH_INTERVAL_MS = 250

function emptyDebugWindow(startedAt: number): DebugWindow {
	return {
		frames: 0,
		renders: 0,
		shapesMs: 0,
		overlaysMs: 0,
		chromeMs: 0,
		flushMs: 0,
		frameMs: 0,
		bytes: 0,
		inputToWriteMs: 0,
		rendered: 0,
		startedAt,
	}
}

function emptyDebugStats(): DebugStats {
	return {
		frameMs: 0,
		shapesMs: 0,
		overlaysMs: 0,
		chromeMs: 0,
		flushMs: 0,
		bytes: 0,
		inputToWriteMs: 0,
		renderedShapes: 0,
		fps: 0,
	}
}

function provisionalLayout(cols: number, rows: number): ChromeLayout {
	return {
		cols,
		rows,
		canvas: { x: 0, y: 1, w: cols, h: Math.max(1, rows - 2) },
		toolbarRow: 0,
		statusRow: rows - 1,
		stylePanel: null,
		popup: null,
		density: cols >= 120 ? 'full' : cols >= 90 ? 'compact' : 'minimal',
	}
}

/**
 * Wires the terminal, the headless editor, the renderer, the chrome and the input controller
 * together and owns the frame loop: one render effect, executed at most once per frame after
 * tldraw's tick, writing one diffed frame to the terminal.
 */
export class App {
	readonly ui = new UiState()

	private readonly terminal: Terminal
	private readonly frame: FrameScheduler
	private readonly dom: DomGlobals
	private readonly opts: AppOptions
	private readonly env: NodeJS.ProcessEnv
	private readonly debug: boolean

	private session: Session | null = null
	private layout: ChromeLayout
	private hotRegions: readonly HotRegion[] = []
	private background: Rgb = 0x000000
	private readonly disposers: (() => void)[] = []
	private readonly earlyEvents: TerminalEvent[] = []

	// Render scheduling. `dirty` means a frame must render; `pendingExec` is the effect's own
	// deferred runner (so detach guards apply), null when only `requestRender` asked for a frame.
	private dirty = false
	private pendingExec: (() => void) | null = null
	private frameStart = 0
	private ticked = false
	private inputSinceTick = false
	private chunkEndQueued = false
	private flushWhenDrained = false
	private renderSuspended = false
	private renderFailures = 0
	private inputStamp: bigint | null = null
	private errorTimer: ReturnType<typeof setTimeout> | null = null

	private debugWindow: DebugWindow = emptyDebugWindow(0)
	private readonly totals: DebugTotals = {
		frames: 0,
		renders: 0,
		renderMs: 0,
		maxInputToWriteMs: 0,
	}

	private started = false
	private quitting = false
	private disposed = false

	private readonly onTerminalEventBound: (event: TerminalEvent) => void
	private readonly onAfterFrameBound: (info: FrameInfo) => void
	private readonly onFrameTickBound: () => void
	private readonly endInputChunkBound: () => void

	constructor(opts: AppOptions) {
		this.opts = opts
		this.terminal = opts.terminal
		this.frame = opts.frame
		this.dom = opts.dom
		this.env = opts.env ?? process.env
		this.debug = opts.debug ?? false
		const size = this.terminal.getSize()
		this.layout = provisionalLayout(size.cols, size.rows)
		this.onTerminalEventBound = (event) => this.onTerminalEvent(event)
		this.onAfterFrameBound = (info) => this.onAfterFrame(info)
		this.onFrameTickBound = () => this.onFrameTick()
		this.endInputChunkBound = () => this.endInputChunk()
	}

	// ------------------------------------------------------------------------------------------
	// Lifecycle
	// ------------------------------------------------------------------------------------------

	async start(): Promise<void> {
		if (this.started) return
		this.started = true
		const { terminal } = this

		// Before awaiting start(): keys typed during the ≤100 ms probe are dispatched immediately.
		this.disposers.push(terminal.onEvent(this.onTerminalEventBound))
		const probed = await terminal.start()
		if (this.disposed) return
		this.disposers.push(terminal.onExit(() => this.persistPrefsNow()))
		let session: Session | null = null
		try {
			session = this.createSession(probed)
			await this.openInitialFile(session.editor)
			if (this.disposed) {
				session.tui.dispose()
				return
			}
			this.startFrameLoop(session)
		} catch (error) {
			// The terminal is already in the alternate screen: restore it before the caller prints
			// the error, or the message lands on the alternate screen and vanishes with it.
			if (session && this.session !== session) session.tui.dispose()
			this.dispose()
			throw error
		}
	}

	private createSession(probed: TerminalCapabilities): Session {
		const { terminal, ui } = this
		const capabilities: TerminalCapabilities = {
			...probed,
			osc52: this.opts.osc52 ?? probed.osc52,
		}
		const appearance = resolveAppearance({
			capabilities,
			env: this.env,
			scheme: this.opts.colorMode,
			glyphs: this.opts.glyphs,
			stroke: this.opts.stroke,
		})
		const glyphs = getGlyphs(appearance.glyphTier)
		const size = terminal.getSize()
		this.layout = provisionalLayout(size.cols, size.rows)

		// After FrameScheduler.install: TickManager captures requestAnimationFrame when it starts.
		const tui = createTuiEditor({
			colorMode: appearance.scheme,
			cols: this.layout.canvas.w,
			rows: this.layout.canvas.h,
		})
		const { editor } = tui
		this.background = paletteRgb(getThemeColors(editor, editor.getColorMode()), 'background')
		const screen = new Screen(size.cols, size.rows, {
			colorMode: appearance.colorDepth,
			glyphs: appearance.glyphTier,
			ambiguousWide: capabilities.ambiguousWide,
			syncOutput: capabilities.syncOutput,
			background: this.background,
		})

		ui.keyboardEncoding.set(appearance.keyboardEncoding)
		ui.debug.set(this.debug)
		if (this.debug) ui.debugStats = emptyDebugStats()

		const ctx: AppContext = {
			editor,
			tui,
			ui,
			popups: null as unknown as PopupController,
			terminal,
			capabilities,
			glyphs,
			clipboard: { content: null, text: null },
			env: this.env,
			getLayout: () => this.layout,
			getHotRegions: () => this.hotRegions,
			// The exporter follows the live colour mode rather than the one at start.
			renderToText: (target, request) =>
				createRenderToText({
					glyphs,
					colorMode: target.getColorMode(),
					stroke: appearance.stroke,
					ambiguousWide: capabilities.ambiguousWide,
				})(target, request),
			requestRender: () => this.requestRender(),
			quit: () => this.quit(0),
			setColorMode: (mode) => this.setColorMode(mode),
			now: () => performance.now(),
		}
		ctx.popups = createPopupController(ctx)

		this.layout = layoutChrome(size.cols, size.rows, snapshotUiAll(ui), editor)
		this.syncViewport(editor, this.layout)

		const uiSnapshot = computed<UiFrameSnapshot>('tui ui', () => snapshotUiAll(ui), { isEqual })
		const instanceSnapshot = computed<InstanceSnapshot>(
			'tui instance',
			() => {
				const s = editor.getInstanceState()
				return {
					cursor: s.cursor,
					brush: s.brush,
					zoomBrush: s.zoomBrush,
					scribbles: s.scribbles,
					isGridMode: s.isGridMode,
					isToolLocked: s.isToolLocked,
					screenBounds: s.screenBounds,
					isFocusMode: s.isFocusMode,
					isDebugMode: s.isDebugMode,
					stylesForNextShape: s.stylesForNextShape,
				}
			},
			{ isEqual }
		)
		const renderOpts: RenderOptions = {
			glyphs,
			colorMode: editor.getColorMode(),
			stroke: appearance.stroke,
			background: this.background,
			ambiguousWide: capabilities.ambiguousWide,
		}
		const overlayOpts: OverlayRenderOptions = {
			...renderOpts,
			editCaret: null,
			pointerCell: null,
			pointerMode: false,
			showCursorGlyph: true,
		}
		const effect = new EffectScheduler<void>('tui render', () => this.renderAll(), {
			scheduleEffect: (exec) => this.scheduleRender(exec),
		})
		const input = new InputController(ctx)
		if (this.opts.pointerMode || !capabilities.mouse) {
			ui.pointerMode.set(true)
			ui.pointerCell.set(canvasCenterCell(this.layout))
		}
		return {
			editor,
			tui,
			screen,
			ctx,
			input,
			effect,
			uiSnapshot,
			instanceSnapshot,
			capabilities,
			glyphs,
			appearance,
			renderOpts,
			overlayOpts,
			bindings: editor.store.query.records('binding'),
			layerKey: null,
			layerRendered: 0,
		}
	}

	/** Makes the session live: input reaches the editor and the render effect follows the store. */
	private startFrameLoop(s: Session): void {
		const { terminal, frame, ui } = this
		const { editor, screen, effect } = s
		this.session = s

		// Installed after the initial load so opening a file does not count as an edit.
		this.disposers.push(
			watchDocumentChanges(editor, () => {
				if (!ui.dirty.get()) ui.dirty.set(true)
			})
		)
		this.disposers.push(frame.onAfterFrame(this.onAfterFrameBound))
		frame.setKeepAlive(() => this.shouldKeepAlive())
		// 'frame' rather than 'tick': a 'tick' listener would raise listenerCount('tick') above
		// the parking baseline and keep the loop awake forever.
		editor.on('frame', this.onFrameTickBound)
		this.disposers.push(() => editor.off('frame', this.onFrameTickBound))
		this.disposers.push(react('tui error expiry', () => this.armErrorTimer()))
		this.disposers.push(
			terminal.onDrain(() => {
				if (this.flushWhenDrained) {
					this.flushWhenDrained = false
					this.requestRender()
				}
			})
		)
		this.disposers.push(
			terminal.onResume(() => {
				screen.setFullRedraw()
				this.requestRender()
			})
		)

		this.frameStart = performance.now()
		this.debugWindow = emptyDebugWindow(this.frameStart)
		effect.attach()
		effect.execute()

		for (const event of this.earlyEvents.splice(0)) this.onTerminalEvent(event)
		frame.kick()
	}

	private async openInitialFile(editor: Editor): Promise<void> {
		const path = this.opts.filePath ?? null
		if (!path) return
		if (!existsSync(path)) {
			// A new document that will be created on the first save.
			this.ui.filePath.set(path)
			this.ui.setHint(`New file ${basename(path)}`)
			return
		}
		const result = await loadTldrFile(editor, path)
		if (result.ok) {
			this.ui.filePath.set(path)
			return
		}
		// Keep the path out of the status bar so a plain ctrl+s cannot overwrite the unreadable file.
		this.ui.showError(result.error, performance.now())
	}

	/**
	 * Persists preferences, restores the terminal, tears everything down and reports the exit code,
	 * all synchronously: an event-loop turn between the restore sequence and the exit would let a
	 * frame the quitting keystroke scheduled (or a frame still queued in the stream) reach the
	 * shell's screen.
	 */
	quit(code = 0): void {
		if (this.quitting) return
		this.quitting = true
		this.dirty = false
		this.pendingExec = null
		this.persistPrefsNow()
		this.dispose()
		this.opts.onQuit?.(code)
	}

	private persistPrefsNow(): void {
		const prefsPath = this.opts.prefsPath ?? null
		if (!prefsPath || this.disposed) return
		const result = persistPrefs(this.dom.window.localStorage, prefsPath)
		if (!result.ok && this.debug) process.stderr.write(`tldraw-tui: ${result.error}\n`)
	}

	/** Restores the terminal and releases everything. Never exits the process. */
	dispose(): void {
		if (this.disposed) return
		this.disposed = true
		this.terminal.stop()
		if (this.errorTimer) {
			clearTimeout(this.errorTimer)
			this.errorTimer = null
		}
		for (const dispose of this.disposers.splice(0).reverse()) dispose()
		const s = this.session
		if (s) {
			s.input.dispose()
			s.effect.detach()
			s.tui.dispose()
		}
		this.frame.dispose()
		this.dom.dispose()
		if (this.debug) this.writeDebugSummary()
	}

	// ------------------------------------------------------------------------------------------
	// Accessors (tests)
	// ------------------------------------------------------------------------------------------

	getContext(): AppContext {
		return this.requireSession().ctx
	}

	getScreen(): Screen {
		return this.requireSession().screen
	}

	getLayout(): ChromeLayout {
		return this.layout
	}

	/** Synchronous render and flush, outside the frame loop. */
	renderOnce(): void {
		const s = this.requireSession()
		this.dirty = false
		this.pendingExec = null
		s.effect.execute()
	}

	/**
	 * The frame loop keeps running while this is true; two false answers in a row park it. A shown
	 * error does not count: its expiry timer asks for the one frame that clears it.
	 */
	shouldKeepAlive(): boolean {
		if (this.quitting || this.disposed) return false
		if (this.dirty && !this.renderSuspended) return true
		const s = this.session
		if (!s || s.editor.isDisposed) return false
		const { editor } = s
		return (
			editor.listenerCount('tick') > s.tui.tickListenerBaseline ||
			editor.getCameraState() === 'moving' ||
			editor.getInstanceState().scribbles.length > 0
		)
	}

	/** How many signals the render effect depends on; coarse capture keeps it small. */
	getRenderParentCount(): number {
		return this.requireSession().effect.parents.length
	}

	private requireSession(): Session {
		if (!this.session) throw new Error('App has not started')
		return this.session
	}

	// ------------------------------------------------------------------------------------------
	// Input
	// ------------------------------------------------------------------------------------------

	private onTerminalEvent(event: TerminalEvent): void {
		if (this.disposed || this.quitting || event.type === 'reply') return
		const s = this.session
		if (!s) {
			// ctrl+c typed while the editor loads: raw mode already swallowed the signal.
			if (event.type === 'key' && event.ctrl && event.key === 'c' && !event.release) {
				this.quit(130)
				return
			}
			this.earlyEvents.push(event)
			return
		}
		if (event.type !== 'resize' && event.type !== 'focus') {
			this.inputSinceTick = true
			// Latency is measured from the start of the latest input chunk to the write it causes.
			if (!this.chunkEndQueued) this.inputStamp = process.hrtime.bigint()
		}
		if (this.renderSuspended) {
			// Input ends the suspension; the frame it asks for retries the render once.
			this.renderSuspended = false
			this.requestRender()
		}
		if (event.type === 'resize') this.onResize(event.cols, event.rows)
		try {
			s.input.handleEvent(event)
		} catch (error) {
			// A tool or shape util threw on this event: tldraw's error boundary would keep the editor
			// alive in the browser, so the status bar reports it here and the document stays.
			this.reportError(error)
		}
		// Everything one stdin chunk decodes arrives synchronously; the microtask runs once after it.
		if (!this.chunkEndQueued) {
			this.chunkEndQueued = true
			queueMicrotask(this.endInputChunkBound)
		}
	}

	private endInputChunk(): void {
		this.chunkEndQueued = false
		const s = this.session
		if (!s || this.disposed || this.quitting) return
		s.input.flushFrame()
		this.frame.kick()
	}

	private onResize(cols: number, rows: number): void {
		const s = this.session
		if (!s) return
		s.screen.resize(cols, rows)
		this.layout = layoutChrome(cols, rows, snapshotUiAll(this.ui), s.editor)
		this.syncViewport(s.editor, this.layout)
		this.requestRender()
	}

	private syncViewport(editor: Editor, layout: ChromeLayout): void {
		const w = layout.canvas.w * CELL_W
		const h = layout.canvas.h * CELL_H
		const current = editor.getViewportScreenBounds()
		if (current.x === 0 && current.y === 0 && current.w === w && current.h === h) return
		editor.updateViewportScreenBounds(new Box(0, 0, w, h))
	}

	// ------------------------------------------------------------------------------------------
	// Frame loop
	// ------------------------------------------------------------------------------------------

	private scheduleRender(exec: () => void): void {
		if (this.disposed || this.quitting) return
		this.pendingExec = exec
		if (!this.dirty) {
			this.dirty = true
			this.frame.kick()
		}
	}

	requestRender(): void {
		if (this.disposed || this.quitting) return
		if (!this.dirty) {
			this.dirty = true
			this.frame.kick()
		}
	}

	private onFrameTick(): void {
		this.ticked = true
		this.inputSinceTick = false
	}

	private onAfterFrame(info: FrameInfo): void {
		const s = this.session
		if (!s || this.disposed || this.quitting) return
		this.frameStart = info.frameStart
		if (!this.ticked && this.inputSinceTick && !s.editor.isDisposed) {
			// TickManager skipped this frame (FpsScheduler gate; a frame resumed right after the loop
			// parked lands inside it): flush queued pointer moves so the frame is never stale.
			// Elapsed 0 is a pure flush (Editor._flushEventsForTick).
			this.inputSinceTick = false
			try {
				s.editor.emit('tick', 0)
			} catch (error) {
				this.reportError(error)
			}
		}
		this.ticked = false
		this.totals.frames++
		this.debugWindow.frames++
		if (this.dirty) {
			if (this.renderSuspended) {
				// Dropped, not deferred: a dirty flag that stays set keeps the loop awake at full rate.
				this.dirty = false
				this.pendingExec = null
			} else {
				this.dirty = false
				const exec = this.pendingExec
				this.pendingExec = null
				const t0 = this.debug ? performance.now() : 0
				try {
					if (exec) exec()
					else s.effect.execute()
					this.renderFailures = 0
				} catch (error) {
					this.onRenderError(error)
				}
				if (this.debug) {
					const ms = performance.now() - t0
					this.debugWindow.frameMs += ms
					this.totals.renderMs += ms
				}
			}
		}
		// Input that changed nothing visible produced no write to measure against.
		this.inputStamp = null
		if (this.debug) this.publishDebugStats(info.frameStart)
	}

	private onRenderError(error: unknown): void {
		// The error itself schedules a render; a second consecutive failure stops the retry loop
		// until the next input so a broken frame cannot spin at full rate.
		this.renderFailures++
		if (this.renderFailures >= 2) this.renderSuspended = true
		this.reportError(error)
	}

	private reportError(error: unknown): void {
		const message = error instanceof Error ? error.message : String(error)
		this.ui.showError(message, performance.now())
		if (this.debug) {
			const text = error instanceof Error ? (error.stack ?? error.message) : String(error)
			process.stderr.write(`tldraw-tui error: ${text}\n`)
		}
	}

	/** Error messages expire by wall clock, which no signal tracks, so a timer asks for the frame. */
	private armErrorTimer(): void {
		const error = this.ui.error.get()
		unsafe__withoutCapture(() => {
			if (this.errorTimer) {
				clearTimeout(this.errorTimer)
				this.errorTimer = null
			}
			if (!error || this.disposed) return
			const delay = Math.max(0, error.until - performance.now()) + 1
			this.errorTimer = setTimeout(() => {
				this.errorTimer = null
				this.ui.clearExpiredError(performance.now())
				// Node timers round to whole milliseconds and can fire just before `until`; the
				// error atom did not change, so nothing else would re-arm the timer.
				if (this.ui.error.get() !== null) {
					this.armErrorTimer()
					return
				}
				this.requestRender()
			}, delay)
		})
	}

	// ------------------------------------------------------------------------------------------
	// Rendering
	// ------------------------------------------------------------------------------------------

	private renderAll(): void {
		const s = this.session
		if (!s || this.disposed) return
		const { editor, screen } = s
		const { ui } = this
		const snap = s.uiSnapshot.get()
		const measure = snap.debug
		const t0 = measure ? performance.now() : 0

		let layout!: ChromeLayout
		unsafe__withoutCapture(() => {
			layout = layoutChrome(screen.cols, screen.rows, snap, editor)
			this.layout = layout
			// Before the shape list is captured so culling sees the new viewport.
			this.syncViewport(editor, layout)
		})

		// The coarse signals this frame depends on; everything else is read without capture
		// because it derives from these (per-shape geometry from the shape records, menu state
		// from selection and locks, the toolbar from the tool path, …).
		const colorMode = editor.getColorMode()
		const cam = editor.getCamera()
		editor.getCurrentPageState()
		const shapes = editor.getCurrentPageRenderingShapesSorted()
		// Arrow bodies follow their bindings, which can change without any shape on the page changing.
		const bindings = s.bindings.get()
		const erasing = editor.getErasingShapeIds()
		editor.overlays.getActiveOverlayEntries()
		editor.overlays.getHoveredOverlayId()
		editor.getPath()
		const theme = editor.getCurrentTheme()
		editor.getDocumentSettings()
		editor.getPages()
		editor.getCanUndo()
		editor.getCanRedo()
		editor.user.getIsSnapMode()
		s.instanceSnapshot.get()

		let rendered = 0
		let caretCell: Cell | null = null
		let t1 = 0
		let t2 = 0
		let t3 = 0
		let bytes = 0
		unsafe__withoutCapture(() => {
			const { renderOpts, overlayOpts } = s
			renderOpts.colorMode = colorMode
			renderOpts.background = this.background
			overlayOpts.colorMode = colorMode
			overlayOpts.background = this.background
			overlayOpts.editCaret = snap.editCaret
			overlayOpts.pointerCell = snap.pointerCell
			overlayOpts.pointerMode = snap.pointerMode
			overlayOpts.showCursorGlyph = snap.focused
			const key: ShapeLayerKey = {
				shapes,
				bindings,
				erasing,
				theme,
				colorMode,
				background: this.background,
				camX: cam.x,
				camY: cam.y,
				camZ: cam.z,
				canvasX: layout.canvas.x,
				canvasY: layout.canvas.y,
				canvasW: layout.canvas.w,
				canvasH: layout.canvas.h,
				cols: screen.cols,
				rows: screen.rows,
			}
			screen.withClip(layout.canvas, () => {
				if (s.layerKey && sameLayerKey(s.layerKey, key) && screen.restoreLayer()) {
					rendered = s.layerRendered
				} else {
					// The canvas carries the theme background (tldraw paints it too), so a scheme that
					// differs from the terminal's own background still shows its colours on the right base.
					screen.clear({ bg: this.background })
					rendered = renderShapes(editor, screen, layout.canvas, renderOpts).rendered
					screen.saveLayer()
					s.layerKey = key
					s.layerRendered = rendered
				}
				if (measure) t1 = performance.now()
				caretCell = renderOverlays(editor, screen, layout.canvas, overlayOpts).caretCell
			})
			if (measure) t2 = performance.now()
			const chrome: ChromeContext = {
				editor,
				ui,
				glyphs: s.glyphs,
				colorMode,
				capabilities: s.capabilities,
				filePath: snap.filePath,
				dirty: snap.dirty,
				debugStats: snap.debug ? ui.debugStats : null,
				now: this.frameStart,
				env: this.env,
			}
			this.hotRegions = renderChrome(screen, layout, chrome)
			if (measure) t3 = performance.now()
			bytes = this.present(s, layout, snap.popup, caretCell)
		})

		if (measure) {
			const t4 = performance.now()
			const w = this.debugWindow
			w.renders++
			w.shapesMs += t1 - t0
			w.overlaysMs += t2 - t1
			w.chromeMs += t3 - t2
			w.flushMs += t4 - t3
			w.bytes += bytes
			w.rendered += rendered
		}
		this.totals.renders++
	}

	/** Writes the diffed frame (latest frame wins while the output is blocked) and places the cursor. */
	private present(
		s: Session,
		layout: ChromeLayout,
		popup: PopupState | null,
		caretCell: Cell | null
	): number {
		const { terminal } = this
		let bytes = 0
		if (terminal.isBlocked()) {
			this.flushWhenDrained = true
		} else {
			const out = s.screen.flush()
			if (out.length > 0) {
				terminal.write(out)
				bytes = out.length
			}
		}
		if (popup?.kind === 'prompt' && popup.prompt.spec.kind !== 'confirm') {
			const cell = getPromptCaretCell(layout, popup.prompt)
			terminal.showCursorAt(cell.col, cell.row)
		} else if (caretCell) {
			terminal.showCursorAt(caretCell.col, caretCell.row)
		} else {
			terminal.hideCursor()
		}
		if (this.inputStamp !== null) {
			if (this.debug) {
				const ms = Number(process.hrtime.bigint() - this.inputStamp) / 1e6
				this.debugWindow.inputToWriteMs = Math.max(this.debugWindow.inputToWriteMs, ms)
				this.totals.maxInputToWriteMs = Math.max(this.totals.maxInputToWriteMs, ms)
			}
			this.inputStamp = null
		}
		return bytes
	}

	private setColorMode(mode: 'light' | 'dark'): void {
		const s = this.session
		if (!s) return
		s.editor.setColorMode(mode)
		this.background = paletteRgb(getThemeColors(s.editor, mode), 'background')
		s.screen.configure({ background: this.background })
		s.layerKey = null
		this.requestRender()
	}

	// ------------------------------------------------------------------------------------------
	// Debug statistics (plain fields, never reactive: they change every frame)
	// ------------------------------------------------------------------------------------------

	private publishDebugStats(frameStart: number): void {
		const w = this.debugWindow
		const elapsed = frameStart - w.startedAt
		if (elapsed < DEBUG_PUBLISH_INTERVAL_MS) return
		const n = Math.max(1, w.renders)
		this.ui.debugStats = {
			frameMs: w.frameMs / n,
			shapesMs: w.shapesMs / n,
			overlaysMs: w.overlaysMs / n,
			chromeMs: w.chromeMs / n,
			flushMs: w.flushMs / n,
			bytes: Math.round(w.bytes / n),
			inputToWriteMs: w.inputToWriteMs,
			renderedShapes: Math.round(w.rendered / n),
			fps: Math.round((w.frames * 1000) / elapsed),
		}
		this.debugWindow = emptyDebugWindow(frameStart)
	}

	private writeDebugSummary(): void {
		const t = this.totals
		const stats = this.terminal.getStats()
		const avg = t.renders > 0 ? (t.renderMs / t.renders).toFixed(2) : '0.00'
		process.stderr.write(
			`tldraw-tui: ${t.frames} frames, ${t.renders} renders, ${avg} ms per render, ` +
				`${t.maxInputToWriteMs.toFixed(1)} ms worst input to write, ` +
				`${stats.bytesWritten} bytes in ${stats.writeCount} writes\n`
		)
	}
}

function sameLayerKey(a: ShapeLayerKey, b: ShapeLayerKey): boolean {
	return (
		a.shapes === b.shapes &&
		a.bindings === b.bindings &&
		a.erasing === b.erasing &&
		a.theme === b.theme &&
		a.colorMode === b.colorMode &&
		a.background === b.background &&
		a.camX === b.camX &&
		a.camY === b.camY &&
		a.camZ === b.camZ &&
		a.canvasX === b.canvasX &&
		a.canvasY === b.canvasY &&
		a.canvasW === b.canvasW &&
		a.canvasH === b.canvasH &&
		a.cols === b.cols &&
		a.rows === b.rows
	)
}

function snapshotUiAll(ui: UiState): UiFrameSnapshot {
	return {
		popup: ui.popup.get(),
		stylePanelOpen: ui.stylePanelOpen.get(),
		keyboardEncoding: ui.keyboardEncoding.get(),
		hint: ui.hint.get(),
		error: ui.error.get(),
		latches: ui.latches.get(),
		pointerMode: ui.pointerMode.get(),
		pointerCell: ui.pointerCell.get(),
		pointerButtonDown: ui.pointerButtonDown.get(),
		filePath: ui.filePath.get(),
		dirty: ui.dirty.get(),
		debug: ui.debug.get(),
		firstKeySeen: ui.firstKeySeen.get(),
		editCaret: ui.editCaret.get(),
		focused: ui.focused.get(),
	}
}
