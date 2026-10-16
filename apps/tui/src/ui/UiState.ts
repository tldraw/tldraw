import { atom } from '@tldraw/state'
import type { TLShapeId } from '@tldraw/tlschema'

export type MenuId = 'file' | 'edit' | 'view' | 'pages' | 'help'

export type PromptKind = 'text' | 'path' | 'confirm'

export interface PromptChoice {
	key: string
	label: string
}

/** What an action asks the chrome to collect from the user; the chrome owns editing and rendering. */
export interface PromptSpec {
	kind: PromptKind
	label: string
	initial?: string
	/** For `confirm` prompts: the single keys accepted (`y`, `n`, …) and what they mean. */
	choices?: PromptChoice[]
	/** Resolves with the typed value, or the pressed choice key for `confirm` prompts. */
	onSubmit(value: string): void | Promise<void>
	onCancel?(): void
}

export interface PromptState {
	spec: PromptSpec
	value: string
	caret: number
	/** Current Tab-completion candidates for `path` prompts, if any. */
	completions: string[]
	completionIndex: number
	/** Position while browsing earlier answers with the arrow keys; undefined = the draft. */
	historyIndex?: number
	/** What was typed before browsing history, restored when stepping past the newest entry. */
	draft?: string
}

export type PopupState =
	| { kind: 'menu'; menu: MenuId; index: number; submenu: string | null; submenuIndex: number }
	| { kind: 'context'; col: number; row: number; index: number }
	| { kind: 'style'; row: number }
	| { kind: 'geo'; index: number }
	| { kind: 'pages'; index: number }
	| { kind: 'help'; tab: number; scroll: number }
	| { kind: 'prompt'; prompt: PromptState }

export type ModifierName = 'shift' | 'alt' | 'ctrl'

/**
 * Modifier latches stand in for held keys: terminals do not report key release and strip shift
 * from mouse reports, so a toggled latch is OR'd into every pointer event. A latch clears on the
 * next pointer up unless it is sticky (toggled twice).
 */
export interface Latches {
	shift: boolean
	alt: boolean
	ctrl: boolean
	stickyShift: boolean
	stickyAlt: boolean
	stickyCtrl: boolean
}

export const EMPTY_LATCHES: Latches = {
	shift: false,
	alt: false,
	ctrl: false,
	stickyShift: false,
	stickyAlt: false,
	stickyCtrl: false,
}

export interface Cell {
	col: number
	row: number
}

export interface EditCaret {
	shapeId: TLShapeId
	/** Caret index in the plaintext of the shape being edited (grapheme-aware). */
	caret: number
	/** The whole text is selected (Enter, edit-text): the label is drawn inverted and typing replaces it. */
	selectAll: boolean
}

export interface UiError {
	message: string
	/** `performance.now()` after which the status bar drops the message. */
	until: number
}

/** Per-frame numbers the status bar shows with `--debug`; deliberately not reactive. */
export interface DebugStats {
	frameMs: number
	shapesMs: number
	overlaysMs: number
	chromeMs: number
	flushMs: number
	bytes: number
	inputToWriteMs: number
	renderedShapes: number
	fps: number
}

/**
 * UI-only state shared by the chrome, the input controller and the app. Everything the render
 * pass reads is an atom so one reactive effect redraws when it changes; `debugStats` is the
 * exception because it changes every frame.
 */
export class UiState {
	readonly popup = atom<PopupState | null>('ui.popup', null)
	readonly hint = atom<string | null>('ui.hint', null)
	readonly error = atom<UiError | null>('ui.error', null)
	readonly latches = atom<Latches>('ui.latches', EMPTY_LATCHES)
	readonly pointerMode = atom<boolean>('ui.pointerMode', false)
	/** Last known pointer cell in terminal coordinates (the virtual pointer in pointer mode). */
	readonly pointerCell = atom<Cell | null>('ui.pointerCell', null)
	readonly pointerButtonDown = atom<boolean>('ui.pointerButtonDown', false)
	readonly stylePanelOpen = atom<boolean>('ui.stylePanelOpen', true)
	readonly filePath = atom<string | null>('ui.filePath', null)
	readonly dirty = atom<boolean>('ui.dirty', false)
	readonly keyboardEncoding = atom<'legacy' | 'full'>('ui.keyboardEncoding', 'legacy')
	readonly debug = atom<boolean>('ui.debug', false)
	readonly firstKeySeen = atom<boolean>('ui.firstKeySeen', false)
	readonly editCaret = atom<EditCaret | null>('ui.editCaret', null)
	readonly focused = atom<boolean>('ui.focused', true)
	debugStats: DebugStats | null = null

	openPopup(popup: PopupState) {
		this.popup.set(popup)
	}

	closePopup() {
		this.popup.set(null)
	}

	setHint(hint: string | null) {
		this.hint.set(hint)
	}

	showError(message: string, now: number, durationMs = 3000) {
		this.error.set({ message, until: now + durationMs })
	}

	clearExpiredError(now: number) {
		const error = this.error.get()
		if (error && error.until <= now) this.error.set(null)
	}

	toggleLatch(name: ModifierName) {
		const latches = { ...this.latches.get() }
		const stickyKey = `sticky${name[0].toUpperCase()}${name.slice(1)}` as
			| 'stickyShift'
			| 'stickyAlt'
			| 'stickyCtrl'
		if (!latches[name]) {
			latches[name] = true
		} else if (!latches[stickyKey]) {
			latches[stickyKey] = true
		} else {
			latches[name] = false
			latches[stickyKey] = false
		}
		this.latches.set(latches)
	}

	/** Called on pointer up: non-sticky latches are one-shot. */
	releaseLatches() {
		const l = this.latches.get()
		if (!l.shift && !l.alt && !l.ctrl) return
		this.latches.set({
			...l,
			shift: l.stickyShift,
			alt: l.stickyAlt,
			ctrl: l.stickyCtrl,
		})
	}

	clearLatches() {
		this.latches.set(EMPTY_LATCHES)
	}
}
