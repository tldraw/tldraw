import { FairyOutfit, Wand } from '@tldraw/fairy-shared'
import { FairyMode } from './fairy-agent/agent/FairyMode'

export interface FairyConfig {
	name: string
	outfit: FairyOutfit
	personality: string
	mode: FairyMode['id']
	wand: Wand['type']
}
