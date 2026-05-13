import { Editor } from 'tldraw'
import { PREVIEW_BOUNDS } from './grid-preview-bounds'

export interface PreviewViewport {
	x: number
	y: number
	w: number
	h: number
}

/**
 * Read the per-document preview viewport from `TLDocument.meta.previewViewport`,
 * if set. Falls back to the shared `PREVIEW_BOUNDS` default for documents that
 * haven't had a preview viewport configured yet.
 */
export function readPreviewBounds(editor: Editor): PreviewViewport | null {
	const meta = editor.getDocumentSettings().meta as Record<string, unknown> | undefined
	const candidate = meta?.previewViewport
	if (!candidate || typeof candidate !== 'object') return null
	const { x, y, w, h } = candidate as Record<string, unknown>
	if (
		typeof x !== 'number' ||
		typeof y !== 'number' ||
		typeof w !== 'number' ||
		typeof h !== 'number'
	) {
		return null
	}
	if (w <= 0 || h <= 0) return null
	return { x, y, w, h }
}

/**
 * Center the editor's camera on the document's preview bounds at 100% zoom.
 *
 * When the editor first mounts the tile's viewport screen bounds may not have
 * been measured yet (grid layout still computing). We retry on the next
 * animation frame and again after the `useScreenBounds` throttle window so the
 * camera ends up positioned correctly regardless of when layout settles.
 */
export function focusOnPreviewBounds(editor: Editor): void {
	const bounds = readPreviewBounds(editor) ?? PREVIEW_BOUNDS

	const apply = (): boolean => {
		if (editor.isDisposed) return true
		const vp = editor.getViewportScreenBounds()
		if (vp.w <= 0 || vp.h <= 0) return false
		editor.zoomToBounds(bounds, { immediate: true, inset: 0, force: true })
		return true
	}

	if (apply()) return
	requestAnimationFrame(() => {
		if (apply()) return
		setTimeout(apply, 250)
	})
}
