import { FairyMode, FairyOutfit, Wand } from '@tldraw/fairy-shared'

export interface FairyConfig {
	name: string
	outfit: FairyOutfit
	personality: string
	mode: FairyMode['id']
	wand: Wand['type']
}
