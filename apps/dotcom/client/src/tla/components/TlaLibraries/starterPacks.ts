import {
	copyPack,
	type LibraryPack,
	type LibraryPackItem,
	type LibrarySource,
	type TLLibrary,
} from '@tldraw/libraries'
import { atom } from 'tldraw'

/** What the starter packs dialog shows of a pack, without loading its items. */
export interface StarterPackSummary {
	id: string
	name: string
	version: number
	itemCount: number
	previews: Pick<LibraryPackItem, 'id' | 'thumbnail'>[]
}

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
			const summaries = manifest.default as StarterPackSummary[]
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
	return (await load()).default as LibraryPack
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
