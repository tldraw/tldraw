import { Wand } from '@tldraw/fairy-shared'
import { FairyOutfit } from './fairy-sprite/FairyOutfit'

export interface FairyConfig {
	name: string
	outfit: FairyOutfit
	personality: string
	wand: Wand['type']
}
