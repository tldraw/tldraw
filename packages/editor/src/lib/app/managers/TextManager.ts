import { Box2dModel, TLAlignType } from '@tldraw/tlschema'
import { uniqueId } from '../../utils/data'
import { App } from '../App'
import { TextHelpers } from '../shapeutils/TLTextUtil/TextHelpers'

// const wordSeparator = new RegExp(
// 	`${[0x0020, 0x00a0, 0x1361, 0x10100, 0x10101, 0x1039, 0x1091]
// 		.map((c) => String.fromCodePoint(c))
// 		.join('|')}`
// )

const textAlignmentsForLtr: Record<TLAlignType, string> = {
	start: 'left',
	middle: 'center',
	end: 'right',
}

export class TextManager {
	constructor(public app: App) {}

	getTextElement() {
		const oldElm = document.querySelector('.tl-text-measure')
		oldElm?.remove()

		const elm = document.createElement('div')
		this.app.getContainer().appendChild(elm)

		elm.id = `__textMeasure_${uniqueId()}`
		elm.classList.add('tl-text')
		elm.classList.add('tl-text-measure')
		elm.tabIndex = -1

		return elm
	}

	measureText = (opts: {
		text: string
		fontStyle: string
		fontWeight: string
		fontFamily: string
		fontSize: number
		lineHeight: number
		width: string
		minWidth?: string
		maxWidth: string
		padding: string
	}): Box2dModel => {
		const elm = this.getTextElement()

		elm.setAttribute('dir', 'ltr')
		elm.style.setProperty('font-family', opts.fontFamily)
		elm.style.setProperty('font-style', opts.fontStyle)
		elm.style.setProperty('font-weight', opts.fontWeight)
		elm.style.setProperty('font-size', opts.fontSize + 'px')
		elm.style.setProperty('line-height', opts.lineHeight * opts.fontSize + 'px')
		elm.style.setProperty('width', opts.width)
		elm.style.setProperty('min-width', opts.minWidth ?? null)
		elm.style.setProperty('max-width', opts.maxWidth)
		elm.style.setProperty('padding', opts.padding)

		elm.textContent = TextHelpers.normalizeTextForDom(opts.text)

		const rect = elm.getBoundingClientRect()

		return {
			x: 0,
			y: 0,
			w: rect.width,
			h: rect.height,
		}
	}

	getTextLines(opts: {
		text: string
		wrap: boolean
		width: number
		height: number
		padding: number
		fontSize: number
		fontWeight: string
		fontFamily: string
		fontStyle: string
		lineHeight: number
		textAlign: TLAlignType
	}): string[] {
		const elm = this.getTextElement()

		elm.style.setProperty('width', opts.width - opts.padding * 2 + 'px')
		elm.style.setProperty('height', 'min-content')
		elm.style.setProperty('dir', 'ltr')
		elm.style.setProperty('font-size', opts.fontSize + 'px')
		elm.style.setProperty('font-family', opts.fontFamily)
		elm.style.setProperty('font-weight', opts.fontWeight)
		elm.style.setProperty('line-height', opts.lineHeight * opts.fontSize + 'px')
		elm.style.setProperty('text-align', textAlignmentsForLtr[opts.textAlign])

		// Split the text into words
		const words = opts.text
			// Replace all double spaces with tabs
			.replace(/ {2}/g, '\t')
			// Then split on spaces and tabs and new lines
			.split(/( |\t|\n)/)
			// Remove any empty strings
			.filter(Boolean)
			// Replacing the tabs with double spaces again.
			.map((str) => (str === '\t' ? '  ' : str))

		// Collect each line in an array of arrays
		const lines: string[][] = []

		// The current line that we're adding words to
		let currentLine: string[] = []

		// Clear the text element
		elm.textContent = ''

		// Set initial values for the loop
		let prevHeight = elm.offsetHeight
		let prevTextContent = elm.textContent

		for (let i = 0, n = words.length; i < n; i++) {
			const word = words[i]

			// add the word to the text element
			elm.textContent += word

			// measure the text element's new height
			const newHeight = elm.offsetHeight

			// If the height has not increased, then add the word to the current line
			if (newHeight <= prevHeight) {
				currentLine.push(word)
				prevTextContent = elm.textContent
				continue
			}

			/*
			If the height HAS increased, then we've just caused a line break!
			This could have been caused by two things:
				1. we just encountered a newline character
				2. the word we just added was too long to fit on the line
			*/

			if (word === '\n') {
				// New lines are easy, just start a new line
				currentLine = []
				lines.push(currentLine)
				prevTextContent = elm.textContent
				continue
			}

			/*
			If we have a newline because we're wrapping, then buckle the
			fuck up because need to find out whether we can fit the word on a
			single line or else break it into multiple lines in order to
			replicate CSS's `break-word` for `overflow-wrap` and `word-wrap`.

			For example:

			_____________
			| hello woooo|rld
		
			Should become:
			_____________
			| hello      |
			| woooorld   |
		
			But:

			_____________
			| hello woooo|oooooooooooorld

			Should become:

			_____________
			| hello      | // first new line
			| wooooooooo | // second new line
			| ooooorld   |
			*/

			// Save the state of the text content that caused the break to occur.
			// We'll put this back again at the end of the loop, so that we can
			// continue from this point.
			const afterTextContent: string = elm.textContent

			// Set the text content to the previous text content, before adding
			// the word, so that we can begin to find line breaks.
			elm.textContent = prevTextContent

			// Force a new line, since we know that the text will break the line
			// and we want to start measuring from the start of the line.
			elm.textContent += '\n'

			// Split the word into individual characters.
			const chars = [...word]

			// Add the first character to the measurement element's text content.
			elm.textContent += chars[0]

			// Set the "previous height" to the text element's offset height.
			prevHeight = elm.offsetHeight

			// Similar to how we're breaking with words, we're going to loop
			// through each character looking for new lines within the word
			// (sublines). We'll start with a collection of one subline that
			// contains the first character in the word.
			let currentSubLine: string[] = [chars[0]]
			const subLines: string[][] = [currentSubLine]

			// For each remaining character in the word...
			for (let i = 1; i < chars.length; i++) {
				const char = chars[i]

				// ...add the character to the text element
				elm.textContent += char

				// ...and measure the height
				const newHeight = elm.offsetHeight

				if (newHeight > prevHeight) {
					// If the height has increased, then we've triggered a "break-word".
					// Create a new current subline containing the character, and add
					// it to the sublines array.
					currentSubLine = [char]
					subLines.push(currentSubLine)

					// Also update the prev height for next time
					prevHeight = newHeight
				} else {
					// If the height hasn't increased, then we're still on the same
					// subline and can just push the char in.
					currentSubLine.push(char)
				}
			}

			// Finally, turn each subline of characters into a string and push
			// each line into the lines array.
			const joinedSubLines = subLines.map((b) => [b.join('')])
			lines.push(...joinedSubLines)

			// Set the current line to the last subline
			currentLine = lines[lines.length - 1]

			// Restore the text content that caused the line break to occur
			elm.textContent = afterTextContent

			// And set prevHeight to the new height
			prevHeight = elm.offsetHeight
			prevTextContent = elm.textContent
		}

		// We can remove the measurement div now.
		elm.remove()

		// We're done! Join the words in each line.
		const result: string[] = lines.map((line) => line.join('').trimEnd())

		return result
	}
}
