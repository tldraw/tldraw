import {
	copyPack,
	parseLibraryItemContent,
	parseLibraryPack,
	type LibraryPack,
	type LibraryPackItem,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryItemContent,
	type TLLibraryThumbnail,
} from '@tldraw/libraries'
import type { JsonObject } from '@tldraw/utils'
import { atom, T } from 'tldraw'

/** What the starter packs dialog shows of a pack, without loading its items. */
export interface StarterPackSummary {
	id: string
	name: string
	version: number
	itemCount: number
	/** Its items' names, so a search can tell whether the pack has a match without loading it. */
	itemNames: string[]
	previews: Pick<LibraryPackItem, 'id' | 'thumbnail'>[]
}

/** A pack's items without their content, which is loaded separately for each item. */
export interface StarterPackIndex {
	id: string
	name: string
	version: number
	items: Omit<LibraryPackItem, 'content'>[]
}

// Thumbnails are named by their file in the pack's folder, e.g. `thumbnails/plus-light.webp`.
const thumbnailFileValidator = T.or(T.string, T.object({ light: T.string, dark: T.string }))

const starterPackSummariesValidator = T.arrayOf(
	T.object({
		id: T.string,
		name: T.string,
		version: T.positiveInteger,
		itemCount: T.nonZeroInteger,
		itemNames: T.arrayOf(T.string),
		previews: T.arrayOf(T.object({ id: T.string, thumbnail: thumbnailFileValidator.optional() })),
	})
)

const starterPackIndexValidator = T.object({
	id: T.string,
	name: T.string,
	version: T.positiveInteger,
	items: T.arrayOf(
		T.object({
			id: T.string,
			name: T.string.optional(),
			thumbnail: thumbnailFileValidator.optional(),
			meta: (T.jsonValue as T.Validator<JsonObject>).optional(),
		})
	),
})

export const STARTER_PACK_PREVIEW_COUNT = 4

// In the order they're listed. Each pack is a folder in starterPackData, as
// scripts/split-starter-pack.ts writes it; starterPackManifest.json is generated from them by
// starterPacks.test.ts, in this order. Run that test with `-u` after changing a pack.
export const STARTER_PACK_IDS = [
	'wireframing',
	'diagramming',
	'floor-plan',
	'tldraw-characters',
	'doodles',
]

// Each index and each item's content is its own chunk, fetched when needed.
const indexLoaders = import.meta.glob<unknown>('./starterPackData/*/index.json', {
	import: 'default',
})
const contentLoaders = import.meta.glob<unknown>('./starterPackData/*/content/*.json', {
	import: 'default',
})
function packPath(packId: string, file: string) {
	return `./starterPackData/${packId}/${file}`
}

function resolveThumbnail(
	urls: Record<string, string>,
	packId: string,
	thumbnail: TLLibraryThumbnail | undefined
): TLLibraryThumbnail | undefined {
	if (thumbnail === undefined) return undefined
	const url = (file: string) => {
		const resolved = urls[packPath(packId, file)]
		if (!resolved) throw new Error(`Starter pack ${packId} has no thumbnail ${file}`)
		return resolved
	}
	return typeof thumbnail === 'string'
		? url(thumbnail)
		: { light: url(thumbnail.light), dark: url(thumbnail.dark) }
}

const starterPackSummaries = atom<StarterPackSummary[] | undefined>(
	'starter pack summaries',
	undefined
)
let loadingSummaries: Promise<StarterPackSummary[]> | undefined

/** The summaries, once {@link loadStarterPackSummaries} has loaded them. */
export function getStarterPackSummaries() {
	return starterPackSummaries.get()
}

export function loadStarterPackSummaries() {
	loadingSummaries ??= Promise.all([
		import('./starterPackManifest.json'),
		import('./starterPackThumbnails'),
	]).then(
		([manifest, { starterPackThumbnailUrls }]) => {
			const summaries = starterPackSummariesValidator.validate(manifest.default).map((pack) => ({
				...pack,
				previews: pack.previews.map((preview) => ({
					id: preview.id,
					thumbnail: resolveThumbnail(starterPackThumbnailUrls, pack.id, preview.thumbnail),
				})),
			}))
			starterPackSummaries.set(summaries)
			return summaries
		},
		(error) => {
			loadingSummaries = undefined
			throw error
		}
	)
	return loadingSummaries
}

const indexes = new Map<string, Promise<StarterPackIndex>>()

/** A pack's items, with their thumbnails' URLs but without their content. Loaded once. */
export function loadStarterPackIndex(id: string): Promise<StarterPackIndex> {
	const existing = indexes.get(id)
	if (existing) return existing
	const load = indexLoaders[packPath(id, 'index.json')]
	if (!load) return Promise.reject(new Error(`No starter pack with id ${id}`))
	const loading = Promise.all([load(), import('./starterPackThumbnails')]).then(
		([value, { starterPackThumbnailUrls }]): StarterPackIndex => {
			const index = starterPackIndexValidator.validate(value)
			return {
				...index,
				items: index.items.map((item) => {
					const thumbnail = resolveThumbnail(starterPackThumbnailUrls, id, item.thumbnail)
					return { ...item, ...(thumbnail === undefined ? {} : { thumbnail }) }
				}),
			}
		},
		(error: unknown) => {
			indexes.delete(id)
			throw error
		}
	)
	indexes.set(id, loading)
	return loading
}

/** One item's content, as {@link parseLibraryItemContent} reads it. */
export async function loadStarterPackItemContent(
	packId: string,
	itemId: string
): Promise<TLLibraryItemContent> {
	const load = contentLoaders[packPath(packId, `content/${itemId}.json`)]
	if (!load) throw new Error(`Starter pack ${packId} has no item ${itemId}`)
	return parseLibraryItemContent(await load())
}

/** A whole pack, every item's content included, as copying it needs. */
export async function loadStarterPack(id: string): Promise<LibraryPack> {
	const index = await loadStarterPackIndex(id)
	const items = await Promise.all(
		index.items.map(async (item) => ({
			...item,
			content: await loadStarterPackItemContent(id, item.id),
		}))
	)
	return parseLibraryPack({ ...index, items })
}

function getDefaultOwnerId(source: LibrarySource) {
	return source.getDefaultOwnerId ? source.getDefaultOwnerId() : undefined
}

/** Whether the user may add a starter pack, i.e. create a library for the default owner. */
export function canAddStarterPack(source: LibrarySource) {
	const ownerId = getDefaultOwnerId(source)
	return source.can('createLibrary', ownerId === undefined ? undefined : { ownerId })
}

/** Copies a starter pack into the source's default owner, or wherever the source puts new libraries. */
export function addStarterPack(source: LibrarySource, pack: LibraryPack) {
	const ownerId = getDefaultOwnerId(source)
	return copyPack(source, pack, ownerId === undefined ? {} : { ownerId })
}

/** The pack a library was copied from, as recorded by `copyPack`, if any. */
export function getStarterPackId(library: TLLibrary): string | undefined {
	const { packId } = library.meta
	return typeof packId === 'string' ? packId : undefined
}

/**
 * Whether the source holds a copy of the pack, in its default owner if it has one. Deleting the
 * copy makes the pack addable again.
 */
export function isStarterPackAdded(source: LibrarySource, packId: string) {
	const ownerId = getDefaultOwnerId(source)
	return source
		.getLibraries()
		.some(
			(library) =>
				(ownerId === undefined || library.ownerId === ownerId) &&
				getStarterPackId(library) === packId
		)
}
