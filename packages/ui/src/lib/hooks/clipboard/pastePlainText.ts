import {
	Editor,
	FONT_FAMILIES,
	FONT_SIZES,
	INDENT,
	TEXT_PROPS,
	TextShapeUtil,
	createShapeId,
} from '@tldraw/editor'
import { VecLike } from '@tldraw/primitives'

const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/

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
 * @param editor - The editor instance.
 * @param text - The text to paste.
 * @param point - (optional) The point at which to paste the text.
 * @internal
 */
export async function pastePlainText(editor: Editor, text: string, point?: VecLike) {
	const p =
		point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)
	const defaultProps = editor.getShapeUtil(TextShapeUtil).defaultProps()

	const textToPaste = stripTrailingWhitespace(
		stripCommonMinimumIndentation(replaceTabsWithSpaces(text))
	)

	// Measure the text with default values
	let w: number
	let h: number
	let autoSize: boolean
	let align = 'middle'

	const isMultiLine = textToPaste.split('\n').length > 1

	// check whether the text contains the most common characters in RTL languages
	const isRtl = rtlRegex.test(textToPaste)

	if (isMultiLine) {
		align = isMultiLine ? (isRtl ? 'end' : 'start') : 'middle'
	}

	const rawSize = editor.textMeasure.measureText(textToPaste, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[defaultProps.font],
		fontSize: FONT_SIZES[defaultProps.size],
		width: 'fit-content',
	})

	const minWidth = Math.min(
		isMultiLine ? editor.viewportPageBounds.width * 0.9 : 920,
		Math.max(200, editor.viewportPageBounds.width * 0.9)
	)

	if (rawSize.w > minWidth) {
		const shrunkSize = editor.textMeasure.measureText(textToPaste, {
			...TEXT_PROPS,
			fontFamily: FONT_FAMILIES[defaultProps.font],
			fontSize: FONT_SIZES[defaultProps.size],
			width: minWidth + 'px',
		})
		w = shrunkSize.w
		h = shrunkSize.h
		autoSize = false
		align = isRtl ? 'end' : 'start'
	} else {
		// autosize is fine
		w = rawSize.w
		h = rawSize.h
		autoSize = true
	}

	if (p.y - h / 2 < editor.viewportPageBounds.minY + 40) {
		p.y = editor.viewportPageBounds.minY + 40 + h / 2
	}

	editor.mark('paste')
	editor.createShapes([
		{
			id: createShapeId(),
			type: 'text',
			x: p.x - w / 2,
			y: p.y - h / 2,
			props: {
				text: textToPaste,
				// if the text has more than one line, align it to the left
				align,
				autoSize,
				w,
			},
		},
	])
}
