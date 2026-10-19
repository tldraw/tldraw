import type { TLShapeId } from '@tldraw/editor'
import { capture, formatFromPath } from '../capture/capture'
import { CELL_H, CELL_W } from '../editor/constants'
import { createTuiEditor } from '../editor/createTuiEditor'
import { CELL_TEXT_METRICS, FONT_TEXT_METRICS } from '../editor/textMeasure'
import { loadTldrFile } from '../file/tldrFile'
import { createRenderToText } from '../render/renderToText'
import { getGlyphs } from '../terminal/chars'
import type { RenderCliOptions } from './cli'

export interface RenderIo {
	stdout: { isTTY?: boolean; write(data: string | Uint8Array): unknown }
	stderr: { write(data: string): unknown }
}

/**
 * `tldraw-tui render`: loads a .tldr file into a headless editor sized like the app's canvas, sets
 * up the viewport and selection, and writes a capture. Returns the exit code. This module imports
 * tldraw, so `index.ts` loads it after the DOM globals exist.
 */
export async function runRender(o: RenderCliOptions, io: RenderIo): Promise<number> {
	const format = o.format ?? (o.out ? formatFromPath(o.out) : 'text')
	if (format === 'png' && !o.out && io.stdout.isTTY) {
		io.stderr.write('tldraw-tui render: PNG output needs --out or a pipe\n')
		return 2
	}
	// Text is laid out in cells like the app; images draw real font sizes, so labels must be
	// measured (and wrap) at those sizes for shapes and their text to agree.
	const metrics = format === 'text' ? CELL_TEXT_METRICS : FONT_TEXT_METRICS
	const tui = createTuiEditor({
		colorMode: o.scheme,
		cols: o.cols,
		rows: o.rows,
		textMetrics: metrics,
	})
	const { editor } = tui
	try {
		const loaded = await loadTldrFile(editor, o.filePath!)
		if (!loaded.ok) {
			io.stderr.write(`tldraw-tui render: ${loaded.error}\n`)
			return 1
		}

		if (o.page) {
			const page = editor
				.getPages()
				.find((p) => p.id === o.page || p.id === `page:${o.page}` || p.name === o.page)
			if (!page) {
				const names = editor
					.getPages()
					.map((p) => p.name)
					.join(', ')
				io.stderr.write(`tldraw-tui render: no page "${o.page}" (pages: ${names})\n`)
				return 1
			}
			editor.setCurrentPage(page.id)
			editor.zoomToFit({ immediate: true })
		}

		if (o.center || o.zoom) {
			const z = o.zoom ?? editor.getZoomLevel()
			const center = o.center ?? editor.getViewportPageBounds().center
			const w = o.cols * CELL_W
			const h = o.rows * CELL_H
			editor.setCamera(
				{ x: -center.x + w / 2 / z, y: -center.y + h / 2 / z, z },
				{ force: true, immediate: true }
			)
		}

		if (o.select.length) {
			const ids = o.select.map((id) => (id.startsWith('shape:') ? id : `shape:${id}`) as TLShapeId)
			const missing = ids.filter((id) => !editor.getShape(id))
			if (missing.length) {
				io.stderr.write(`tldraw-tui render: no shape ${missing.join(', ')} on this page\n`)
				return 1
			}
			editor.select(...ids)
		}

		const glyphs = getGlyphs(o.glyphs)
		const result = await capture(editor, {
			scope: o.scope,
			format,
			metrics,
			scale: o.scale ?? undefined,
			// Zoom-to-fit only frames the viewport; the selection and document draw at 100%.
			zoom: o.zoom ?? 1,
			renderToText: createRenderToText({
				glyphs,
				colorMode: o.scheme,
				stroke: o.glyphs === 'ascii' ? 'ascii' : 'braille',
			}),
		})
		if (!result.ok) {
			io.stderr.write(`tldraw-tui render: ${result.error}\n`)
			return 1
		}
		let data = result.data
		if (typeof data === 'string' && !data.endsWith('\n')) data += '\n'
		if (o.out) {
			const { writeFile } = await import('node:fs/promises')
			await writeFile(o.out, data)
		} else {
			io.stdout.write(data)
		}
		return 0
	} finally {
		tui.dispose()
	}
}
