/** Shared helpers for tldraw MCP diagrams. */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TldrawRecord } from '../focused-shape.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let cachedHtml: string | null = null

/** Load the bundled widget HTML as-is (no data injection) for serving via MCP Apps resource. */
export function loadWidgetHtmlRaw(): string {
	if (cachedHtml) return cachedHtml
	try {
		const widgetPath = resolve(__dirname, '..', 'mcp-app.html')
		cachedHtml = readFileSync(widgetPath, 'utf-8')
	} catch {
		const widgetPath = resolve(__dirname, '..', '..', 'dist', 'mcp-app.html')
		cachedHtml = readFileSync(widgetPath, 'utf-8')
	}
	return cachedHtml
}

/** Build a text summary for non-widget clients. */
export function buildTextSummary(shapes: TldrawRecord[], title?: string): string {
	const lines: string[] = []
	if (title) {
		lines.push(`# ${title}`)
		lines.push('')
	}
	lines.push(`Diagram with ${shapes.length} shape(s):`)
	lines.push('')
	for (const shape of shapes) {
		let label = ''
		if (shape.props?.richText) {
			const rt = shape.props.richText as { content?: { content?: { text?: string }[] }[] }
			const text = rt.content?.[0]?.content?.[0]?.text
			if (text) label = ` — "${text}"`
		}
		const x = shape.x ?? 0
		const y = shape.y ?? 0
		lines.push(`- ${shape.type} at (${x}, ${y})${label}`)
	}
	return lines.join('\n')
}
