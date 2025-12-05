import { FairyHatType, HAT_TYPES } from '@tldraw/fairy-shared'

export function getRandomFairyHat(): FairyHatType {
	return HAT_TYPES[Math.floor(Math.random() * HAT_TYPES.length)]
}
