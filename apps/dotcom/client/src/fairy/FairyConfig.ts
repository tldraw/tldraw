import { FairyOutfit, Wand } from '@tldraw/fairy-shared'

export interface FairyConfig {
	name: string
	outfit: FairyOutfit
	personality: string
	wand: Wand['type']
}
