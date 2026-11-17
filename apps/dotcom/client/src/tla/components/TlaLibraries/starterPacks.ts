import {
	addPackToDocument,
	findPackCopy,
	getLibraryErrorReason,
	libraryThumbnailValidator,
	parseLibraryPack,
	type LibraryBrowseGroup,
	type LibraryPack,
	type LibraryPackItem,
	type LibrarySource,
} from '@tldraw/libraries'
import { atom, T } from 'tldraw'
import type { TLAppUiHandler } from '../../utils/app-ui-events'
import { getUntrackedSource } from './trackedLibrarySource'

/** What browsing shows of a pack, without loading its items. */
export interface StarterPackSummary {
	id: string
	name: string
	version: number
	itemCount: number
	previews: Pick<LibraryPackItem, 'id' | 'thumbnail'>[]
}

const starterPackSummariesValidator: T.Validator<StarterPackSummary[]> = T.arrayOf(
	T.object({
		id: T.string,
		name: T.string,
		version: T.positiveInteger,
		itemCount: T.nonZeroInteger,
		previews: T.arrayOf(
			T.object({ id: T.string, thumbnail: libraryThumbnailValidator.optional() })
		),
	})
)

export const STARTER_PACK_PREVIEW_COUNT = 4

// Each pack is its own chunk, fetched when it's added. starterPackManifest.json is generated from
// these by starterPacks.test.ts, in this order; run that test with `-u` after changing a pack.
export const STARTER_PACK_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
	wireframing: () => import('./starterPackWireframing.json'),
	architecture: () => import('./starterPackArchitecture.json'),
	math: () => import('./starterPackMath.json'),
	diagramming: () => import('./starterPackDiagramming.json'),
	'floor-plan': () => import('./starterPackFloorPlan.json'),
	'tldraw-characters': () => import('./starterPackTldrawCharacters.json'),
	doodles: () => import('./starterPackDoodles.json'),
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
	loadingSummaries ??= import('./starterPackManifest.json').then(
		(manifest) => {
			const summaries = starterPackSummariesValidator.validate(manifest.default)
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

export async function loadStarterPack(id: string): Promise<LibraryPack> {
	const load = Object.hasOwn(STARTER_PACK_LOADERS, id) ? STARTER_PACK_LOADERS[id] : undefined
	if (!load) throw new Error(`No starter pack with id ${id}`)
	return parseLibraryPack((await load()).default)
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
			return {
				id: pack.id,
				name: pack.name,
				itemCount: pack.itemCount,
				previews: pack.previews.map((item) => item.thumbnail),
				added: findPackCopy(shown, pack.id) !== undefined,
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
				getItems: async () =>
					(await loadStarterPack(pack.id)).items.map(({ id, name, thumbnail }) => ({
						id,
						name,
						thumbnail,
					})),
			}
		}),
	}
}
