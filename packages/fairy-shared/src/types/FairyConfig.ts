import { FairyOutfit } from './FairyOutfit'

export interface FairySign {
	sun: string
	moon: string
	rising: string
}

export interface FairyConfig {
	name: string
	outfit: FairyOutfit
	sign?: FairySign
}
