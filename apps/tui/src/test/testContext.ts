import type {
	AppContext,
	ChromeLayout,
	HotRegion,
	PopupController,
	PopupResult,
} from '../app/context'
import { CELL_H, CELL_W } from '../editor/constants'
import { createTuiEditor, type CreateTuiEditorOptions } from '../editor/createTuiEditor'
import { getGlyphs, type GlyphTier } from '../terminal/chars'
import type { TerminalEvent } from '../terminal/InputParser'
import type { TerminalCapabilities } from '../terminal/Terminal'
import type { PromptSpec } from '../ui/UiState'
import { UiState } from '../ui/UiState'

export interface TestContextOptions {
	cols?: number
	rows?: number
	colorMode?: 'light' | 'dark'
	glyphs?: GlyphTier
	editor?: Partial<CreateTuiEditorOptions>
	capabilities?: Partial<TerminalCapabilities>
}

/** Records every call so tests can assert what the input controller asked the chrome to do. */
export class RecordingPopupController implements PopupController {
	calls: Array<{ method: string; args: unknown[] }> = []
	nextResult: PopupResult = { consumed: false }
	lastPrompt: PromptSpec | null = null

	handleInput(event: TerminalEvent): PopupResult {
		this.calls.push({ method: 'handleInput', args: [event] })
		return this.nextResult
	}
	openMenu(menu?: 'file' | 'edit' | 'view' | 'pages' | 'help') {
		this.calls.push({ method: 'openMenu', args: [menu] })
	}
	openContextMenu(col: number, row: number) {
		this.calls.push({ method: 'openContextMenu', args: [col, row] })
	}
	openStylePanel() {
		this.calls.push({ method: 'openStylePanel', args: [] })
	}
	openGeoPicker() {
		this.calls.push({ method: 'openGeoPicker', args: [] })
	}
	openPages() {
		this.calls.push({ method: 'openPages', args: [] })
	}
	openHelp() {
		this.calls.push({ method: 'openHelp', args: [] })
	}
	prompt(spec: PromptSpec) {
		this.calls.push({ method: 'prompt', args: [spec] })
		this.lastPrompt = spec
	}
	closeAll() {
		this.calls.push({ method: 'closeAll', args: [] })
	}
}

export interface TestContext extends AppContext {
	popups: RecordingPopupController
	layout: ChromeLayout
	hotRegions: HotRegion[]
	cursor: { col: number; row: number } | null
	renders: number
	quits: number
	colorModes: Array<'light' | 'dark'>
	time: number
	dispose(): void
}

/** Default layout: toolbar on row 0, status bar on the last row, no docked panel or popup. */
export function defaultLayout(cols: number, rows: number): ChromeLayout {
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

export function createTestContext(opts: TestContextOptions = {}): TestContext {
	const cols = opts.cols ?? 100
	const rows = opts.rows ?? 30
	const layout = defaultLayout(cols, rows)
	const tui = createTuiEditor({
		colorMode: opts.colorMode ?? 'light',
		cols: layout.canvas.w,
		rows: layout.canvas.h,
		...opts.editor,
	})
	const capabilities: TerminalCapabilities = {
		kitty: false,
		truecolor: '24bit',
		background: null,
		ambiguousWide: false,
		mouse: true,
		hover: true,
		syncOutput: true,
		osc52: false,
		utf8: true,
		modifyOtherKeys: false,
		...opts.capabilities,
	}
	const ctx: TestContext = {
		editor: tui.editor,
		tui,
		ui: new UiState(),
		popups: new RecordingPopupController(),
		terminal: {
			showCursorAt(col, row) {
				ctx.cursor = { col, row }
			},
			hideCursor() {
				ctx.cursor = null
			},
			getSize() {
				return { cols, rows }
			},
		},
		capabilities,
		glyphs: getGlyphs(opts.glyphs ?? 'rich'),
		clipboard: { content: null, text: null },
		env: {},
		getLayout() {
			return ctx.layout
		},
		getHotRegions() {
			return ctx.hotRegions
		},
		renderToText() {
			return ''
		},
		requestRender() {
			ctx.renders++
		},
		quit() {
			ctx.quits++
		},
		setColorMode(mode) {
			ctx.colorModes.push(mode)
			tui.editor.user.updateUserPreferences({ colorScheme: mode })
		},
		now() {
			return ctx.time
		},
		layout,
		hotRegions: [],
		cursor: null,
		renders: 0,
		quits: 0,
		colorModes: [],
		time: 0,
		dispose() {
			tui.dispose()
		},
	}
	return ctx
}

/** Screen pixel position of the centre of a canvas cell, as the input controller computes it. */
export function cellToScreen(layout: ChromeLayout, col: number, row: number) {
	return {
		x: (col - layout.canvas.x + 0.5) * CELL_W,
		y: (row - layout.canvas.y + 0.5) * CELL_H,
	}
}
