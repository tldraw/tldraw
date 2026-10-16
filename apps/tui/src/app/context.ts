import type { Editor, TLContent } from '@tldraw/editor'
import type { ActionInvocation } from '../actions/actionIds'
import type { TuiEditor } from '../editor/createTuiEditor'
import type { RenderToText } from '../file/tldrFile'
import type { GlyphSet } from '../terminal/chars'
import type { TerminalEvent } from '../terminal/InputParser'
import type { Rect } from '../terminal/Screen'
import type { TerminalCapabilities } from '../terminal/Terminal'
import type { PromptSpec, UiState } from '../ui/UiState'

export type ChromeDensity = 'full' | 'compact' | 'minimal'

/** Where everything is on screen this frame; produced by `layoutChrome`, consumed by input routing. */
export interface ChromeLayout {
	cols: number
	rows: number
	canvas: Rect
	toolbarRow: number
	statusRow: number
	/** Docked style panel, when the terminal is wide enough and the panel is open. */
	stylePanel: Rect | null
	/** The open popup's rectangle (menus, context menu, help, pickers, style popup), if any. */
	popup: Rect | null
	density: ChromeDensity
}

export type MouseTerminalEvent = Extract<TerminalEvent, { type: 'mouse' }>

/**
 * A clickable rectangle drawn by the chrome. The input controller runs `action` when present,
 * otherwise `onPress`; `hint` goes to the status bar on hover.
 */
export interface HotRegion {
	id: string
	rect: Rect
	action?: ActionInvocation
	onPress?(event: MouseTerminalEvent): void
	hint?: string
}

export interface PopupResult {
	/** True when the popup swallowed the event (nothing else should handle it). */
	consumed: boolean
	/** An action the input controller must run (menu item chosen, context item clicked, …). */
	action?: ActionInvocation
}

/** Implemented by `ui/popups.ts`; owns navigation and editing inside popups and prompts. */
export interface PopupController {
	/** Route an event to the open popup (or to a docked style panel click). */
	handleInput(event: TerminalEvent): PopupResult
	openMenu(menu?: 'file' | 'edit' | 'view' | 'pages' | 'help'): void
	openContextMenu(col: number, row: number): void
	openStylePanel(): void
	openGeoPicker(): void
	openPages(): void
	openHelp(): void
	prompt(spec: PromptSpec): void
	closeAll(): void
}

export interface TerminalLike {
	showCursorAt(col: number, row: number): void
	hideCursor(): void
	getSize(): { cols: number; rows: number }
}

export interface AppClipboard {
	content: TLContent | null
	/** Plain text copied from a text edit, pasted when no shape content is available. */
	text: string | null
}

/**
 * Everything actions, chrome and the input controller need from the app, so none of them import
 * `App.ts`. The app owns the instance; tests build a minimal one around a headless editor.
 */
export interface AppContext {
	editor: Editor
	tui: TuiEditor
	ui: UiState
	popups: PopupController
	terminal: TerminalLike
	capabilities: TerminalCapabilities
	glyphs: GlyphSet
	clipboard: AppClipboard
	env: NodeJS.ProcessEnv
	getLayout(): ChromeLayout
	getHotRegions(): readonly HotRegion[]
	renderToText: RenderToText
	/** Ask the frame loop for a frame soon (after input or a state change the store did not see). */
	requestRender(): void
	/** Ends the program after the terminal is restored; actions call it once the user confirmed. */
	quit(): void
	setColorMode(mode: 'light' | 'dark'): void
	now(): number
}
