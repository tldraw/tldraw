import { Wand } from '../schema/Wand'
import { FairyOutfit } from './FairyOutfit'

export interface FairyConfig {
	name: string
	outfit: FairyOutfit
	personality: string
	wand: Wand['type']
}
