import { FairyOutfit } from './FairyOutfit'

export const HAT_COLORS = [
	'coral',
	'pink',
	'rose',
	'purple',
	'peach',
	'gold',
	'green',
	'teal',
	'white',
] as const

export type FairyHatColor = (typeof HAT_COLORS)[number]

export const HAT_TYPES = [
	'antenna-droopy',
	'antenna-relaxed',
	'antenna-straight',
	'antlers',
	'bat-ears',
	'cat-ears',
	'default',
	'buns',
	'dotted-cap',
	'ears',
	'fairy-ears',
	'farm-hat',
	'fez',
	'foam',
	'parted-hair',
	'pointy',
	'santa-hat',
	'sideburns',
	'slick',
	'spiky-hair',
	'spinner',
	'summer-hat',
	'traces',
] as const

export type FairyHatType = (typeof HAT_TYPES)[number]

export const SIGN_PARTS = [
	'aquarius',
	'aries',
	'taurus',
	'gemini',
	'cancer',
	'leo',
	'virgo',
	'libra',
	'scorpio',
	'sagittarius',
	'capricorn',
	'pisces',
] as const

export type ZodiacSign = (typeof SIGN_PARTS)[number]

export interface FairySign {
	sun: ZodiacSign
	moon: ZodiacSign
	rising: ZodiacSign
}

export interface FairyConfig {
	name: string
	// @deprecated:
	outfit: FairyOutfit
	sign?: FairySign
	hat: FairyHatType
	hatColor: FairyHatColor
	version: number
}
