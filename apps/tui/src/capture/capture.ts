import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import { Box, type Editor, type TLShapeId } from '@tldraw/editor'
import { CELL_H, CELL_W } from '../editor/constants'
import { CELL_TEXT_METRICS, type TextMetrics } from '../editor/textMeasure'
import { computeExportRequest, type RenderToText } from '../file/tldrFile'
import { flattenSvgText } from './svgText'
import type { CaptureFormat, CaptureScope } from './types'

export { CAPTURE_FORMATS, CAPTURE_SCOPES, type CaptureFormat, type CaptureScope } from './types'

/** Bitmap captures are capped so a huge document cannot allocate gigabytes. */
export const MAX_IMAGE_PX = 8192
const DOCUMENT_PADDING = 16

export interface CaptureOptions {
	scope: CaptureScope
	format: CaptureFormat
	/** Renders text captures; the app and the CLI both use render/renderToText.ts. */
	renderToText: RenderToText
	/** Metrics the editor measures text with (cells in the app, font metrics in the CLI). */
	metrics?: TextMetrics
	/** Image pixels per screen pixel (viewport) or page unit; default 2 for PNG, 1 for SVG. */
	scale?: number
	/** Text zoom for selection and document captures; default the editor's current zoom. */
	zoom?: number
}

export interface CaptureOk {
	ok: true
	format: CaptureFormat
	data: string | Uint8Array
}

export interface CaptureError {
	ok: false
	error: string
}

export type CaptureResult = CaptureOk | CaptureError

/** `.png` and `.svg` select images; anything else is text. */
export function formatFromPath(path: string): CaptureFormat {
	const ext = extname(path).toLowerCase()
	if (ext === '.png') return 'png'
	if (ext === '.svg') return 'svg'
	return 'text'
}

function viewportShapeIds(editor: Editor, bounds: Box): TLShapeId[] {
	const ids: TLShapeId[] = []
	for (const shape of editor.getCurrentPageShapesSorted()) {
		if (editor.isShapeHidden(shape)) continue
		const pageBounds = editor.getShapeMaskedPageBounds(shape)
		if (pageBounds && bounds.includes(pageBounds)) ids.push(shape.id)
	}
	return ids
}

function captureText(editor: Editor, opts: CaptureOptions): CaptureResult {
	if (opts.scope === 'viewport') {
		const bounds = editor.getViewportPageBounds()
		const screen = editor.getViewportScreenBounds()
		const cols = Math.max(1, Math.round(screen.w / CELL_W))
		const rows = Math.max(1, Math.round(screen.h / CELL_H))
		const text = opts.renderToText(editor, { bounds, zoom: editor.getZoomLevel(), cols, rows })
		return { ok: true, format: 'text', data: text }
	}
	const request = computeExportRequest(editor, {
		selectionOnly: opts.scope === 'selection',
		zoom: opts.zoom,
	})
	if (!request) return emptyScope(opts.scope)
	return { ok: true, format: 'text', data: opts.renderToText(editor, request) }
}

function emptyScope(scope: CaptureScope): CaptureError {
	return {
		ok: false,
		error: scope === 'selection' ? 'Nothing is selected' : 'The page is empty',
	}
}

function backgroundColor(editor: Editor): string {
	return editor.getCurrentTheme().colors[editor.getColorMode()].background
}

function blankSvg(w: number, h: number, background: string): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${background}"/></svg>`
}

async function captureSvgString(editor: Editor, opts: CaptureOptions): Promise<CaptureResult> {
	const background = backgroundColor(editor)
	const darkMode = editor.getColorMode() === 'dark'
	let scale = opts.scale ?? (opts.format === 'png' ? 2 : 1)
	let ids: TLShapeId[]
	let result: { svg: string } | undefined

	if (opts.scope === 'viewport') {
		const bounds = editor.getViewportPageBounds()
		const zoom = editor.getZoomLevel()
		scale = Math.min(scale, MAX_IMAGE_PX / (bounds.w * zoom), MAX_IMAGE_PX / (bounds.h * zoom))
		ids = viewportShapeIds(editor, bounds)
		const w = Math.round(bounds.w * zoom * scale)
		const h = Math.round(bounds.h * zoom * scale)
		result = ids.length
			? await editor.getSvgString(ids, {
					bounds,
					padding: 0,
					background: true,
					darkMode,
					scale: zoom * scale,
				})
			: { svg: blankSvg(w, h, background) }
	} else {
		ids =
			opts.scope === 'selection'
				? editor.getSelectedShapeIds()
				: [...editor.getCurrentPageShapeIds()]
		const content =
			opts.scope === 'selection' ? editor.getSelectionPageBounds() : editor.getCurrentPageBounds()
		if (!ids.length || !content) return emptyScope(opts.scope)
		const span = Math.max(content.w, content.h) + DOCUMENT_PADDING * 2
		scale = Math.min(scale, MAX_IMAGE_PX / span)
		result = await editor.getSvgString(ids, {
			padding: DOCUMENT_PADDING,
			background: true,
			darkMode,
			scale,
		})
	}
	if (!result) return emptyScope(opts.scope)

	const svg = flattenSvgText(result.svg, {
		metrics: opts.metrics ?? CELL_TEXT_METRICS,
		outline: background,
		background,
	})
	return { ok: true, format: 'svg', data: svg }
}

/**
 * Draws the viewport, the selection or the whole page as text (the terminal renderer), SVG
 * (tldraw's own export with labels flattened to SVG text) or PNG (that SVG rasterized by sharp).
 */
export async function capture(editor: Editor, opts: CaptureOptions): Promise<CaptureResult> {
	if (opts.format === 'text') return captureText(editor, opts)
	const svg = await captureSvgString(editor, opts)
	if (!svg.ok || opts.format === 'svg') return svg
	try {
		// Loaded on demand: a native module that only image captures need.
		const { default: sharp } = await import('sharp')
		const png = await sharp(Buffer.from(svg.data as string))
			.png()
			.toBuffer()
		return { ok: true, format: 'png', data: new Uint8Array(png) }
	} catch (e) {
		return { ok: false, error: `Could not render PNG: ${(e as Error).message}` }
	}
}

export interface CaptureFileOk {
	ok: true
	path: string
	format: CaptureFormat
	/** The text that was written, for text captures (the app offers it to the clipboard). */
	text: string | null
}

export async function captureToFile(
	editor: Editor,
	path: string,
	opts: Omit<CaptureOptions, 'format'> & { format?: CaptureFormat }
): Promise<CaptureFileOk | CaptureError> {
	const format = opts.format ?? formatFromPath(path)
	const result = await capture(editor, { ...opts, format })
	if (!result.ok) return result
	const resolved = resolve(path)
	let data = result.data
	if (typeof data === 'string' && format === 'text' && !data.endsWith('\n')) data += '\n'
	try {
		await mkdir(dirname(resolved), { recursive: true })
		const tmp = `${resolved}.${process.pid}.tmp`
		await writeFile(tmp, data)
		await rename(tmp, resolved)
	} catch (e) {
		return { ok: false, error: `Could not write ${path}: ${(e as Error).message}` }
	}
	return { ok: true, path: resolved, format, text: typeof data === 'string' ? data : null }
}
