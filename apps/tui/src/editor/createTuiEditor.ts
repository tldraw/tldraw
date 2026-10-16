import {
	Box,
	DEFAULT_CAMERA_OPTIONS,
	Editor,
	TLEditorSnapshot,
	TLStoreSnapshot,
	TldrawOptions,
	createTLStore,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultOverlayUtils,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
	registerDefaultSideEffects,
	tipTapDefaultExtensions,
} from 'tldraw'
import { CELL_H, CELL_W, TUI_CAMERA_OPTIONS, TUI_EDITOR_OPTIONS } from './constants'
import { installMonospaceTextMeasure } from './textMeasure'

export interface TuiEditor {
	editor: Editor
	container: HTMLElement
	/**
	 * `editor.listenerCount('tick')` right after construction (the event-flush listener). Camera
	 * animations and other tick-driven work add listeners; the App keeps the frame loop alive while
	 * the count is above this baseline.
	 */
	tickListenerBaseline: number
	dispose(): void
}

export interface CreateTuiEditorOptions {
	colorMode: 'light' | 'dark'
	initialSnapshot?: Partial<TLEditorSnapshot> | TLStoreSnapshot
	/** Canvas size in cells; the App updates it on resize. Default 80 × 24. */
	cols?: number
	rows?: number
}

/** The default overlays minus the four collaborator utils (single-player app). */
export const TUI_OVERLAY_UTILS = defaultOverlayUtils.filter(
	(util) => !util.type.startsWith('collaborator')
)

export function buildTuiEditorOptions(): Partial<TldrawOptions> {
	return {
		...TUI_EDITOR_OPTIONS,
		camera: { ...DEFAULT_CAMERA_OPTIONS, ...TUI_CAMERA_OPTIONS },
		// Required, not optional: getFontsFromRichText (editor/src/lib/utils/richText.ts:53-55)
		// asserts both and runs inside getShapeGeometry for every rich-text shape.
		text: {
			addFontsFromNode: defaultAddFontsFromNode,
			tipTapConfig: { extensions: tipTapDefaultExtensions },
		},
	}
}

/**
 * Builds the headless editor. `installDomGlobals()` must have run before this module was imported.
 */
export function createTuiEditor(opts: CreateTuiEditorOptions): TuiEditor {
	const cols = opts.cols ?? 80
	const rows = opts.rows ?? 24
	const bounds = new Box(0, 0, cols * CELL_W, rows * CELL_H)

	const doc = globalThis.document
	const container = doc.createElement('div')
	container.tabIndex = 0
	// jsdom has no layout; report the viewport so anything measuring the container agrees with
	// updateViewportScreenBounds.
	container.getBoundingClientRect = () =>
		({
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			width: bounds.w,
			height: bounds.h,
			right: bounds.w,
			bottom: bounds.h,
			toJSON() {
				return {}
			},
		}) as DOMRect
	doc.body.appendChild(container)

	const store = createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils })
	const editor = new Editor({
		store,
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [...defaultTools, ...defaultShapeTools],
		overlayUtils: TUI_OVERLAY_UTILS,
		getContainer: () => container,
		initialState: 'select',
		autoFocus: true,
		colorScheme: opts.colorMode,
		options: buildTuiEditorOptions(),
	})
	// Wires editingShapeId/croppingShapeId changes to the select tool's states (and more); the
	// React wrapper normally does this.
	registerDefaultSideEffects(editor)
	// Before any geometry read: the measurer feeds TextShapeUtil autosize and every label size.
	installMonospaceTextMeasure(editor)
	const tickListenerBaseline = editor.listenerCount('tick')

	editor.user.updateUserPreferences({ edgeScrollSpeed: 0, colorScheme: opts.colorMode })
	editor.updateViewportScreenBounds(bounds)

	if (opts.initialSnapshot) {
		editor.loadSnapshot(opts.initialSnapshot)
		editor.clearHistory()
	}

	return {
		editor,
		container,
		tickListenerBaseline,
		dispose() {
			if (!editor.isDisposed) editor.dispose()
			container.remove()
		},
	}
}
