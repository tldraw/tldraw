import type { Editor, TLTheme } from 'tldraw'
import type { LibrarySource } from '../lib/LibrarySource'
import type { TLLibraryItem } from '../lib/schema'
import { renderItemPreview, type ItemPreviewOptions } from './render-item-preview'

export type RenderItemPreview = typeof renderItemPreview

export interface ItemPreviewRequest extends Omit<ItemPreviewOptions, 'themeId'> {
	/** The theme to draw in. A new definition under the same id is rendered again. */
	theme: TLTheme
	/** Once aborted, the caller no longer wants the preview; it's skipped if nobody else does. */
	signal?: AbortSignal
}

interface Job {
	url: Promise<string | null>
	waiting: number
}

interface Previews {
	bySource: WeakMap<LibrarySource, Map<string, Job>>
	jobs: Set<Job>
	queue: Promise<unknown>
}

const previewsByEditor = new WeakMap<Editor, Previews>()

function getPreviews(editor: Editor) {
	const existing = previewsByEditor.get(editor)
	if (existing) return existing
	const created: Previews = { bySource: new WeakMap(), jobs: new Set(), queue: Promise.resolve() }
	previewsByEditor.set(editor, created)
	editor.disposables.add(() => {
		for (const job of created.jobs) job.url.then((url) => url && URL.revokeObjectURL(url))
		created.jobs.clear()
	})
	return created
}

function getSourceJobs(previews: Previews, source: LibrarySource) {
	const existing = previews.bySource.get(source)
	if (existing) return existing
	const created = new Map<string, Job>()
	previews.bySource.set(source, created)
	return created
}

const themeVersions = new WeakMap<TLTheme, number>()
let lastThemeVersion = 0
function themeVersionOf(theme: TLTheme) {
	let version = themeVersions.get(theme)
	if (version === undefined) {
		version = ++lastThemeVersion
		themeVersions.set(theme, version)
	}
	return version
}

const keyOf = (item: TLLibraryItem, theme: TLTheme, darkMode: boolean) =>
	`${item.id}:${theme.id}:${themeVersionOf(theme)}:${darkMode ? 'dark' : 'light'}`

/**
 * A `blob:` URL of an item's content rendered as its thumbnail would be, or null when it can't be
 * rendered or nobody wants it any more. Items never change, so each is rendered once per source,
 * theme definition and colour mode for as long as `editor` lives, one at a time.
 */
export function getItemPreviewUrl(
	editor: Editor,
	source: LibrarySource,
	item: TLLibraryItem,
	{ signal, theme, darkMode, fontAssetUrls }: ItemPreviewRequest,
	render: RenderItemPreview = renderItemPreview
): Promise<string | null> {
	const previews = getPreviews(editor)
	const jobs = getSourceJobs(previews, source)
	const key = keyOf(item, theme, darkMode)
	const options = { darkMode, themeId: theme.id, fontAssetUrls }
	const job = jobs.get(key) ?? createJob()
	if (signal && signal.aborted) return job.url
	job.waiting++
	if (signal) signal.addEventListener('abort', () => job.waiting--, { once: true })
	return job.url

	function createJob(): Job {
		const created: Job = { waiting: 0, url: Promise.resolve(null) }
		const forget = () => {
			jobs.delete(key)
			previews.jobs.delete(created)
		}
		created.url = previews.queue
			.then(async () => {
				if (editor.isDisposed) return null
				// Nobody is showing it any more: skip it, and render it when it's next asked for.
				if (created.waiting <= 0) {
					forget()
					return null
				}
				const { content } = await source.getItemContent(item.id)
				const blob = await render(editor, content, options)
				if (!blob || editor.isDisposed) return null
				return URL.createObjectURL(blob)
			})
			.catch(() => {
				// A failed load or render is tried again the next time the item is shown.
				forget()
				return null
			})
		previews.queue = created.url
		jobs.set(key, created)
		previews.jobs.add(created)
		return created
	}
}
