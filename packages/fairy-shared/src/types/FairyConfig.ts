import { FairyMode } from '../schema/FairyMode'
import { Wand } from '../schema/Wand'
import { FairyOutfit } from './FairyOutfit'

export interface FairyConfig {
	name: string
	outfit: FairyOutfit
	personality: string
	mode: FairyMode['id']
	wand: Wand['type']
}
