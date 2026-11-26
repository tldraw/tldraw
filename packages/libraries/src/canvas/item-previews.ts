import type { Editor } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { TLLibraryItem } from '../lib/schema'
import { renderItemPreview } from './render-item-preview'

export type RenderItemPreview = typeof renderItemPreview

interface Previews {
	urls: Map<string, Promise<string | null>>
	queue: Promise<unknown>
}

const previewsByEditor = new WeakMap<Editor, Previews>()

function getPreviews(editor: Editor) {
	const existing = previewsByEditor.get(editor)
	if (existing) return existing
	const created: Previews = { urls: new Map(), queue: Promise.resolve() }
	previewsByEditor.set(editor, created)
	editor.disposables.add(() => {
		for (const url of created.urls.values()) revoke(url)
		created.urls.clear()
	})
	return created
}

function revoke(url: Promise<string | null>) {
	url.then((u) => u && URL.revokeObjectURL(u))
}

/**
 * A `blob:` URL of an item's content rendered as its thumbnail would be, or null when it can't be
 * rendered. Items never change, so each is rendered once per colour mode for as long as `editor`
 * lives, one at a time.
 */
export function getItemPreviewUrl(
	editor: Editor,
	source: LibrarySource,
	item: TLLibraryItem,
	darkMode: boolean,
	render: RenderItemPreview = renderItemPreview
): Promise<string | null> {
	const previews = getPreviews(editor)
	const key = `${item.id}:${darkMode ? 'dark' : 'light'}`
	const existing = previews.urls.get(key)
	if (existing) return existing
	const url = previews.queue
		.then(async () => {
			if (editor.isDisposed) return null
			const { content } = await source.getItemContent(item.id)
			const blob = await render(editor, content, darkMode)
			if (!blob || editor.isDisposed) return null
			return URL.createObjectURL(blob)
		})
		.catch(() => {
			// A failed load or render is tried again the next time the item is shown.
			previews.urls.delete(key)
			return null
		})
	previews.queue = url
	previews.urls.set(key, url)
	return url
}
