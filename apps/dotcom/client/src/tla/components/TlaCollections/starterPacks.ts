import {
	copyPack,
	type CollectionPack,
	type CollectionSource,
	type TLCollection,
} from '@tldraw/collections'
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
] as unknown as CollectionPack[]

/** Copies a starter pack to an owner, recording on the copy which pack and version it came from. */
export function addStarterPack(source: CollectionSource, pack: CollectionPack, ownerId: string) {
	return copyPack(source, pack, {
		ownerId,
		meta: { packId: pack.id, packVersion: pack.version },
	})
}

/** The starter pack a collection was copied from by {@link addStarterPack}, if any. */
export function getStarterPackId(collection: TLCollection): string | undefined {
	const { packId } = collection.meta
	return typeof packId === 'string' ? packId : undefined
}

/** Whether the owner holds a copy of the pack; deleting the copy makes the pack addable again. */
export function isStarterPackAdded(source: CollectionSource, packId: string, ownerId: string) {
	return source
		.getCollections()
		.some((collection) => collection.ownerId === ownerId && getStarterPackId(collection) === packId)
}
