import {
	App,
	FONT_FAMILIES,
	FONT_SIZES,
	TEXT_PROPS,
	TLTextShapeDef,
	createShapeId,
} from '@tldraw/editor'
import { VecLike } from '@tldraw/primitives'

/**
 * Replace any tabs with double spaces.
 * @param text - The text to replace tabs in.
 * @internal
 */
function replaceTabsWithSpaces(text: string) {
	return text.replace(/\t/g, '  ')
}

/**
 * Strip HTML tags from a string.
 * @param html - The HTML to strip.
 * @internal
 */
function stripHtml(html: string) {
	const leadingWhitespace = html.match(/^\s+/)?.[0] ?? ''
	// See <https://github.com/developit/preact-markup/blob/4788b8d61b4e24f83688710746ee36e7464f7bbc/src/parse-markup.js#L60-L69>
	const doc = document.implementation.createHTMLDocument('')
	doc.documentElement.innerHTML = html
	return leadingWhitespace + (doc.body.textContent || doc.body.innerText || '')
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
	while (lines[0].trim().length === 0) {
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

/**
 * Strip trailing whitespace from each line and remove any trailing newlines.
 * @param text - The text to strip.
 * @internal
 */
function stripTrailingWhitespace(text: string): string {
	return text.replace(/[ \t]+$/gm, '').replace(/\n+$/, '')
}

/**
 * When the clipboard has plain text, create a text shape and insert it into the scene
 *
 * @param app - The app instance.
 * @param text - The text to paste.
 * @param point - (optional) The point at which to paste the text.
 * @internal
 */
export async function pastePlainText(app: App, text: string, point?: VecLike) {
	const p = point ?? (app.inputs.shiftKey ? app.inputs.currentPagePoint : app.viewportPageCenter)
	const defaultProps = app.getShapeUtilByDef(TLTextShapeDef).defaultProps()

	// Measure the text with default values
	const { w, h } = app.textMeasure.measureText({
		...TEXT_PROPS,
		text: stripHtml(text),
		fontFamily: FONT_FAMILIES[defaultProps.font],
		fontSize: FONT_SIZES[defaultProps.size],
		width: 'fit-content',
	})

	const textToPaste = stripTrailingWhitespace(
		stripCommonMinimumIndentation(replaceTabsWithSpaces(stripHtml(text)))
	)

	app.mark('paste')
	app.createShapes([
		{
			id: createShapeId(),
			type: 'text',
			x: p.x - w / 2,
			y: p.y - h / 2,
			props: {
				text: textToPaste,
				// if the text has more than one line, align it to the left
				align: textToPaste.split('\n').length > 1 ? 'start' : defaultProps.align,
				autoSize: true,
			},
		},
	])
}
