import { FONT_SIZES } from 'tldraw'
import { z } from 'zod'

export const FocusedFontSize = z.number()

const DEFAULT_BASE_FONT_SIZE = 16

/**
 * Calculates the closest predefined font size and scale combination to achieve a target font size
 * @param targetFontSize - The desired font size in pixels
 * @param baseFontSize - The base font size from the theme (defaults to 16)
 * @returns An object containing the closest predefined font size key and the scale factor
 */
export function convertFocusedFontSizeToTldrawFontSizeAndScale(
	targetFontSize: number,
	baseFontSize = DEFAULT_BASE_FONT_SIZE
) {
	const fontSizeEntries = Object.entries(FONT_SIZES)
	let closestSize = fontSizeEntries[0]
	let closestPixelSize = closestSize[1] * baseFontSize
	let minDifference = Math.abs(targetFontSize - closestPixelSize)

	for (const [size, multiplier] of fontSizeEntries) {
		const pixelSize = multiplier * baseFontSize
		const difference = Math.abs(targetFontSize - pixelSize)
		if (difference < minDifference) {
			minDifference = difference
			closestSize = [size, multiplier]
			closestPixelSize = pixelSize
		}
	}

	const textSize = closestSize[0] as keyof typeof FONT_SIZES
	const scale = targetFontSize / closestPixelSize

	return { textSize, scale }
}

/**
 * Converts a tldraw font size and scale to a focused font size
 * @param textSize - The tldraw font size
 * @param scale - The tldraw scale
 * @param baseFontSize - The base font size from the theme (defaults to 16)
 * @returns The focused font size
 */
export function convertTldrawFontSizeAndScaleToFocusedFontSize(
	textSize: keyof typeof FONT_SIZES,
	scale: number,
	baseFontSize = DEFAULT_BASE_FONT_SIZE
) {
	return Math.round(FONT_SIZES[textSize] * baseFontSize * scale)
}
