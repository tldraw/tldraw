import { setDefaultDocument } from '@tldraw/editor'
import { parseHTML } from 'linkedom'

let installed = false

/**
 * Provides tldraw with a linkedom `Document` for rich text serialization, the only DOM the
 * headless editor needs. The document is scoped to tldraw via `setDefaultDocument` and never
 * installed on `globalThis`. Does nothing when a global `document` already exists. Called
 * automatically by {@link createHeadlessEditor}.
 *
 * @public
 */
export function ensureHeadlessDocument(): void {
	if (installed) return
	installed = true
	if (typeof globalThis.document !== 'undefined') return
	const { document } = parseHTML('<!doctype html><html><head></head><body></body></html>')
	setDefaultDocument(document as unknown as Document)
}
