import type { CollectionPack } from '@tldraw/collections'
import diagramming from './collections-pack-diagramming.json'
import doodles from './collections-pack-doodles.json'
import floorPlan from './collections-pack-floor-plan.json'
import tldrawCharacters from './collections-pack-tldraw-characters.json'
import wireframing from './collections-pack-wireframing.json'

export const STARTER_PACKS = [
	wireframing,
	diagramming,
	floorPlan,
	tldrawCharacters,
	doodles,
] as unknown as CollectionPack[]
