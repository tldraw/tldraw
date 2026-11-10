import { copyPack, type LibraryPack, type LibrarySource, type TLLibrary } from '@tldraw/libraries'
import diagramming from './starterPackDiagramming.json'
import doodles from './starterPackDoodles.json'
import floorPlan from './starterPackFloorPlan.json'
import tldrawCharacters from './starterPackTldrawCharacters.json'
import wireframing from './starterPackWireframing.json'

export const STARTER_PACKS = [
	wireframing,
	diagramming,
	floorPlan,
	tldrawCharacters,
	doodles,
] as unknown as LibraryPack[]

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
