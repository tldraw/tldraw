import { FairyHatColor, HAT_COLORS } from '@tldraw/fairy-shared'

export function getRandomFairyHatColor(): FairyHatColor {
	return HAT_COLORS[Math.floor(Math.random() * HAT_COLORS.length)]
}
