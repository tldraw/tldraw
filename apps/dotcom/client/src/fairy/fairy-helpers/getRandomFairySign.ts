import { FairySign } from '@tldraw/fairy-shared'

const SIGN_PARTS = [
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

export function getRandomFairySign(): FairySign {
	const sign = SIGN_PARTS[Math.floor(Math.random() * SIGN_PARTS.length)]
	return {
		sun: sign,
		moon: sign,
		rising: sign,
	}
}
