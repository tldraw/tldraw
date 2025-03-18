import { INDENT } from '../../shapes/shared/TextHelpers'

const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/
export function isRightToLeftLanguage(text: string) {
	return rtlRegex.test(text)
}

/**
 * Replace any tabs with double spaces.
 * @param text - The text to replace tabs in.
 * @internal
 */
function replaceTabsWithSpaces(text: string) {
	return text.replace(/\t/g, INDENT)
}

/**
 * Strip common minimum indentation from each line.
 * @param text - The text to strip.
 * @internal
 */
function stripCommonMinimumIndentation(text: string): string {
	// Split the text into individual lines
	const lines = text.split('\n')

	// remove any leading lines that are only whitespace or newlines
	while (lines[0] && lines[0].trim().length === 0) {
		lines.shift()
	}

	let minIndentation = Infinity
	for (const line of lines) {
		if (line.trim().length > 0) {
			const indentation = line.length - line.trimStart().length
			minIndentation = Math.min(minIndentation, indentation)
		}
	}

	return lines.map((line) => line.slice(minIndentation)).join('\n')
}

const COMMON_ENTITY_MAP = {
	'&amp;': '&',
	'&quot;': '"',
	'&apos;': "'",
	'&#27;': "'",
	'&#34;': '"',
	'&#38;': '&',
	'&#39;': "'",
	'&#8211;': '–',
	'&#8212;': '—',
	'&#8216;': '‘',
	'&#8217;': '’',
	'&#8220;': '“',
	'&#8221;': '”',
	'&#8230;': '…',
}
const entityRegex = new RegExp(Object.keys(COMMON_ENTITY_MAP).join('|'), 'g')

/**
 * Takes common HTML entities found in web page titles and converts them to regular characters.
 * @param text - The text to convert HTML entities.
 * @internal
 */
export function convertCommonTitleHTMLEntities(text: string) {
	return text.replace(entityRegex, (m) => COMMON_ENTITY_MAP[m as keyof typeof COMMON_ENTITY_MAP])
}

/**
 * Strip trailing whitespace from each line and remove any trailing newlines.
 * @param text - The text to strip.
 * @internal
 */
function stripTrailingWhitespace(text: string): string {
	return text.replace(/[ \t]+$/gm, '').replace(/\n+$/, '')
}

/** @internal */
export function cleanupText(text: string) {
	return stripTrailingWhitespace(stripCommonMinimumIndentation(replaceTabsWithSpaces(text)))
}

/** @public */
export const truncateStringWithEllipsis = (str: string, maxLength: number) => {
	return str.length <= maxLength ? str : str.substring(0, maxLength - 3) + '...'
}
