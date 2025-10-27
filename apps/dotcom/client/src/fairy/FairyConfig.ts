import { Wand } from '@tldraw/fairy-shared'
import { FairyOutfit } from '@tldraw/fairy-shared/src/types/FairyOutfit'

export interface FairyConfig {
	name: string
	outfit: FairyOutfit
	personality: string
	wand: Wand['type']
}
