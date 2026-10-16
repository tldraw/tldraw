import type { TLCameraOptions, TldrawOptions } from '@tldraw/editor'

/**
 * One terminal cell in tldraw "screen px". At zoom 1 a default 200×200 geo shape is 25 cols ×
 * 12.5 rows, so files from tldraw.com keep their proportions in the terminal.
 */
export const CELL_W = 8
export const CELL_H = 16

/**
 * Copied from packages/tldraw/src/lib/shapes/shared/default-shape-constants.ts:62-67: both are
 * `@internal` and not exported from `tldraw`. The isLabel geometry children are already padded by
 * these amounts, so renderers only need them when laying text out from raw shape props.
 */
export const LABEL_PADDING = 16
export const ARROW_LABEL_PADDING = 4.25

/**
 * tldraw's default steps start at 0.05, where a 200 px box is 1.25 cols wide and nothing is
 * legible, so the smallest step is dropped (packages/editor/src/lib/constants.ts:10).
 */
export const TUI_ZOOM_STEPS: readonly number[] = [0.1, 0.25, 0.5, 1, 2, 4, 8]

export const TUI_CAMERA_OPTIONS: Partial<TLCameraOptions> = {
	zoomSteps: [...TUI_ZOOM_STEPS],
}

/**
 * Editor option overrides for the terminal (names verified in packages/editor/src/lib/options.ts).
 *
 * - hit test margins: 9 screen px is strictly more than half a row, so a horizontal line lying
 *   between two row centres is still hittable from either row (the margin is divided by zoom).
 * - edgeScrollSpeed 0: the pointer cannot leave a terminal, and insets from jsdom's body size
 *   would otherwise make every move near the chrome rows scroll the canvas.
 * - spacebarPanning false: terminals send no key-up, so a held Space can never be released.
 */
export const TUI_EDITOR_OPTIONS: Partial<Omit<TldrawOptions, 'camera' | 'text'>> = {
	hitTestMargin: 9,
	coarseHitTestMargin: 9,
	edgeScrollSpeed: 0,
	spacebarPanning: false,
	createTextOnCanvasDoubleClick: true,
}
