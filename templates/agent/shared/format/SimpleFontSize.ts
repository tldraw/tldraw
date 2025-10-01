import { FONT_SIZES } from 'tldraw'
import { z } from 'zod'

export const SimpleFontSize = z.number()

/**
 * Calculates the closest predefined font size and scale combination to achieve a target font size
 * @param targetFontSize - The desired font size in pixels
 * @returns An object containing the closest predefined font size key and the scale factor
 */
export function convertSimpleFontSizeToTldrawFontSizeAndScale(targetFontSize: number) {
	const fontSizeEntries = Object.entries(FONT_SIZES)
	let closestSize = fontSizeEntries[0]
	let minDifference = Math.abs(targetFontSize - closestSize[1])

	for (const [size, fontSize] of fontSizeEntries) {
		const difference = Math.abs(targetFontSize - fontSize)
		if (difference < minDifference) {
			minDifference = difference
			closestSize = [size, fontSize]
		}
	}

	const textSize = closestSize[0] as keyof typeof FONT_SIZES
	const baseFontSize = closestSize[1]
	const scale = targetFontSize / baseFontSize

	return { textSize, scale }
}

/**
 * Converts a tldraw font size and scale to a simple font size
 * @param textSize - The tldraw font size
 * @param scale - The tldraw scale
 * @returns The simple font size
 */
export function convertTldrawFontSizeAndScaleToSimpleFontSize(
	textSize: keyof typeof FONT_SIZES,
	scale: number
) {
	return Math.round(FONT_SIZES[textSize] * scale)
}
