import type { CollectionPack } from '@tldraw/collections'
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
