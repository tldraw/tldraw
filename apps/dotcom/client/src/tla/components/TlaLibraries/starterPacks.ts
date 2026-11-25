import {
	addPackToDocument,
	findPackCopy,
	getLibraryErrorReason,
	parseLibraryItemContent,
	parseLibraryPack,
	type LibraryBrowseGroup,
	type LibraryPack,
	type LibraryPackItem,
	type LibrarySource,
	type TLLibraryItemContent,
	type TLLibraryThumbnail,
} from '@tldraw/libraries'
import type { JsonObject } from '@tldraw/utils'
import { atom, T } from 'tldraw'
import type { TLAppUiHandler } from '../../utils/app-ui-events'
import { getUntrackedSource } from './trackedLibrarySource'

/** What browsing shows of a pack, without loading its items. */
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

export const STARTER_PACK_PREVIEW_COUNT = 6

// In the order they're listed. Each pack is a folder in starterPackData, as
// scripts/split-starter-pack.ts writes it; starterPackManifest.json is generated from them by
// starterPacks.test.ts, in this order. Run that test with `-u` after changing a pack.
export const STARTER_PACK_IDS = [
	'wireframing',
	'architecture',
	'math',
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

/**
 * Where adding a starter pack copies it: the first owner the source offers for new libraries that
 * the user may create in, which for a file is its workspace, else the source's default owner.
 */
export function getStarterPackOwnerId(source: LibrarySource): string | undefined {
	const offered = source.getNewLibraryOwnerIds ? source.getNewLibraryOwnerIds() : []
	const ownerId = offered.find((id) => source.can('createLibrary', { ownerId: id }))
	if (ownerId !== undefined) return ownerId
	return source.getDefaultOwnerId ? source.getDefaultOwnerId() : undefined
}

/**
 * Shows a starter pack in the document, as {@link addPackToDocument} does. Tracked as adding the
 * pack, not as creating a library and saving items to it.
 */
export function addStarterPack(
	source: LibrarySource,
	packId: string,
	loadPack: () => Promise<LibraryPack>,
	ownerId: string | undefined
) {
	return addPackToDocument(
		getUntrackedSource(source),
		packId,
		loadPack,
		ownerId === undefined ? {} : { ownerId }
	)
}

/**
 * The starter packs as a group to browse: each is added once the document shows a copy of it.
 * Adding one adds a copy the user already has available, or copies the pack to
 * {@link getStarterPackOwnerId}, and reports `add-starter-pack`, or `library-error` if it fails.
 * Removing one takes the copy it shows out of the document, deleting the copy if it's unchanged
 * and no other file shows it.
 */
export function getStarterPackBrowseGroup(
	source: LibrarySource,
	packs: StarterPackSummary[],
	label: string,
	trackEvent: TLAppUiHandler
): LibraryBrowseGroup {
	const shown = source.getLibraries()
	const available = source.getAvailableLibraries ? source.getAvailableLibraries() : []
	const ownerId = getStarterPackOwnerId(source)
	const canCopy = source.can('createLibrary', ownerId === undefined ? undefined : { ownerId })
	return {
		id: 'starter-packs',
		label,
		entries: packs.map((pack) => {
			const copy = findPackCopy(available, pack.id)
			const shownCopy = findPackCopy(shown, pack.id)
			const remove = source.removeLibraryFromDocument
			return {
				id: pack.id,
				name: pack.name,
				itemCount: pack.itemCount,
				previews: pack.previews.map((item) => item.thumbnail),
				added: shownCopy !== undefined,
				libraryId: shownCopy?.id,
				canAdd: copy ? source.can('addLibraryToDocument', copy.id) : canCopy,
				add: async () => {
					try {
						const id = await addStarterPack(
							source,
							pack.id,
							() => loadStarterPack(pack.id),
							ownerId
						)
						trackEvent('add-starter-pack', { source: 'libraries', pack_id: pack.id })
						return id
					} catch (error) {
						trackEvent('library-error', {
							source: 'libraries',
							action: 'add-starter-pack',
							reason: getLibraryErrorReason(error),
						})
						throw error
					}
				},
				remove:
					shownCopy && remove && source.can('removeLibraryFromDocument', shownCopy.id)
						? () => remove.call(source, shownCopy.id)
						: undefined,
				getItems: async () =>
					(await loadStarterPackIndex(pack.id)).items.map(({ id, name, thumbnail }) => ({
						id,
						name,
						thumbnail,
					})),
			}
		}),
	}
}
