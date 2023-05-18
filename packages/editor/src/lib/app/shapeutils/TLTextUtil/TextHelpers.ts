// Adapted (mostly copied) the work of https://github.com/fregante
// Copyright (c) Federico Brigante <opensource@bfred.it> (bfred.it)

// TODO: Most of this file can be moved into a DOM utils library.

/** @internal */
export type ReplacerCallback = (substring: string, ...args: unknown[]) => string

/**	@public */
export const INDENT = '  '

/** @internal */
export class TextHelpers {
	static insertTextFirefox(field: HTMLTextAreaElement | HTMLInputElement, text: string): void {
		// Found on https://www.everythingfrontend.com/blog/insert-text-into-textarea-at-cursor-position.html 🎈
		field.setRangeText(
			text,
			field.selectionStart || 0,
			field.selectionEnd || 0,
			'end' // Without this, the cursor is either at the beginning or text remains selected
		)

		field.dispatchEvent(
			new InputEvent('input', {
				data: text,
				inputType: 'insertText',
				isComposing: false, // TODO: fix @types/jsdom, this shouldn't be required
			})
		)
	}

	/**
	 * Inserts text at the cursor’s position, replacing any selection, with **undo** support and by
	 * firing the input event.
	 */
	static insert(field: HTMLTextAreaElement | HTMLInputElement, text: string): void {
		const document = field.ownerDocument
		const initialFocus = document.activeElement
		if (initialFocus !== field) {
			field.focus()
		}

		if (!document.execCommand('insertText', false, text)) {
			TextHelpers.insertTextFirefox(field, text)
		}

		if (initialFocus === document.body) {
			field.blur()
		} else if (initialFocus instanceof HTMLElement && initialFocus !== field) {
			initialFocus.focus()
		}
	}

	/**
	 * Replaces the entire content, equivalent to field.value = text but with **undo** support and by
	 * firing the input event.
	 */
	static set(field: HTMLTextAreaElement | HTMLInputElement, text: string): void {
		field.select()
		TextHelpers.insert(field, text)
	}

	/** Get the selected text in a field or an empty string if nothing is selected. */
	static getSelection(field: HTMLTextAreaElement | HTMLInputElement): string {
		const { selectionStart, selectionEnd } = field
		return field.value.slice(
			selectionStart ? selectionStart : undefined,
			selectionEnd ? selectionEnd : undefined
		)
	}

	/**
	 * Adds the wrappingText before and after field’s selection (or cursor). If endWrappingText is
	 * provided, it will be used instead of wrappingText at on the right.
	 */
	static wrapSelection(
		field: HTMLTextAreaElement | HTMLInputElement,
		wrap: string,
		wrapEnd?: string
	): void {
		const { selectionStart, selectionEnd } = field
		const selection = TextHelpers.getSelection(field)
		TextHelpers.insert(field, wrap + selection + (wrapEnd ?? wrap))

		// Restore the selection around the previously-selected text
		field.selectionStart = (selectionStart || 0) + wrap.length
		field.selectionEnd = (selectionEnd || 0) + wrap.length
	}

	/** Finds and replaces strings and regex in the field’s value. */
	static replace(
		field: HTMLTextAreaElement | HTMLInputElement,
		searchValue: string | RegExp,
		replacer: string | ReplacerCallback
	): void {
		/** Remembers how much each match offset should be adjusted */
		let drift = 0
		field.value.replace(searchValue, (...args): string => {
			// Select current match to replace it later
			const matchStart = drift + (args[args.length - 2] as number)
			const matchLength = args[0].length
			field.selectionStart = matchStart
			field.selectionEnd = matchStart + matchLength
			const replacement = typeof replacer === 'string' ? replacer : replacer(...args)
			TextHelpers.insert(field, replacement)
			// Select replacement. Without this, the cursor would be after the replacement
			field.selectionStart = matchStart
			drift += replacement.length - matchLength
			return replacement
		})
	}

	static findLineEnd(value: string, currentEnd: number): number {
		// Go to the beginning of the last line
		const lastLineStart = value.lastIndexOf('\n', currentEnd - 1) + 1
		// There's nothing to unindent after the last cursor, so leave it as is
		if (value.charAt(lastLineStart) !== '\t') {
			return currentEnd
		}
		return lastLineStart + 1 // Include the first character, which will be a tab
	}

	static indent(element: HTMLTextAreaElement): void {
		const { selectionStart, selectionEnd, value } = element
		const selectedContrast = value.slice(selectionStart, selectionEnd)
		// The first line should be indented, even if it starts with \n
		// The last line should only be indented if includes any character after \n
		const lineBreakCount = /\n/g.exec(selectedContrast)?.length

		if (lineBreakCount && lineBreakCount > 0) {
			// Select full first line to replace everything at once
			const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1

			const newSelection = element.value.slice(firstLineStart, selectionEnd - 1)
			const indentedText = newSelection.replace(
				/^|\n/g, // Match all line starts
				`$&${INDENT}`
			)
			const replacementsCount = indentedText.length - newSelection.length

			// Replace newSelection with indentedText
			element.setSelectionRange(firstLineStart, selectionEnd - 1)
			TextHelpers.insert(element, indentedText)

			// Restore selection position, including the indentation
			element.setSelectionRange(selectionStart + 1, selectionEnd + replacementsCount)
		} else {
			TextHelpers.insert(element, INDENT)
		}
	}

	// The first line should always be unindented
	// The last line should only be unindented if the selection includes any characters after \n
	static unindent(element: HTMLTextAreaElement): void {
		const { selectionStart, selectionEnd, value } = element

		// Select the whole first line because it might contain \t
		const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
		const minimumSelectionEnd = TextHelpers.findLineEnd(value, selectionEnd)

		const newSelection = element.value.slice(firstLineStart, minimumSelectionEnd)
		const indentedText = newSelection.replace(/(^|\n)(\t| {1,2})/g, '$1')
		const replacementsCount = newSelection.length - indentedText.length

		// Replace newSelection with indentedText
		element.setSelectionRange(firstLineStart, minimumSelectionEnd)
		TextHelpers.insert(element, indentedText)

		// Restore selection position, including the indentation
		const firstLineIndentation = /\t| {1,2}/.exec(value.slice(firstLineStart, selectionStart))

		const difference = firstLineIndentation ? firstLineIndentation[0].length : 0

		const newSelectionStart = selectionStart - difference
		element.setSelectionRange(
			selectionStart - difference,
			Math.max(newSelectionStart, selectionEnd - replacementsCount)
		)
	}

	static indentCE(element: HTMLElement): void {
		const selection = window.getSelection()
		const value = element.innerText
		const selectionStart = getCaretIndex(element) ?? 0
		const selectionEnd = getCaretIndex(element) ?? 0
		const selectedContrast = value.slice(selectionStart, selectionEnd)
		// The first line should be indented, even if it starts with \n
		// The last line should only be indented if includes any character after \n
		const lineBreakCount = /\n/g.exec(selectedContrast)?.length

		if (lineBreakCount && lineBreakCount > 0) {
			// Select full first line to replace everything at once
			const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1

			const newSelection = value.slice(firstLineStart, selectionEnd - 1)
			const indentedText = newSelection.replace(
				/^|\n/g, // Match all line starts
				`$&${INDENT}`
			)
			const replacementsCount = indentedText.length - newSelection.length

			// Replace newSelection with indentedText

			if (selection) {
				selection.setBaseAndExtent(
					element,
					selectionStart + 1,
					element,
					selectionEnd + replacementsCount
				)
				// element.setSelectionRange(firstLineStart, selectionEnd - 1)
				// TextHelpers.insert(element, indentedText)

				// Restore selection position, including the indentation
				// element.setSelectionRange(selectionStart + 1, selectionEnd + replacementsCount)
			}
		} else {
			const selection = window.getSelection()
			element.innerText = value.slice(0, selectionStart) + INDENT + value.slice(selectionStart)
			selection?.setBaseAndExtent(element, selectionStart + 1, element, selectionStart + 2)
			// TextHelpers.insert(element, INDENT)
		}
	}

	static unindentCE(element: HTMLElement): void {
		const selection = window.getSelection()
		const value = element.innerText
		// const { selectionStart, selectionEnd } = element
		const selectionStart = getCaretIndex(element) ?? 0
		const selectionEnd = getCaretIndex(element) ?? 0

		// Select the whole first line because it might contain \t
		const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
		const minimumSelectionEnd = TextHelpers.findLineEnd(value, selectionEnd)

		const newSelection = value.slice(firstLineStart, minimumSelectionEnd)
		const indentedText = newSelection.replace(/(^|\n)(\t| {1,2})/g, '$1')
		const replacementsCount = newSelection.length - indentedText.length

		if (selection) {
			// Replace newSelection with indentedText
			selection.setBaseAndExtent(element, firstLineStart, element, minimumSelectionEnd)
			// TextHelpers.insert(element, indentedText)

			// Restore selection position, including the indentation
			const firstLineIndentation = /\t| {1,2}/.exec(value.slice(firstLineStart, selectionStart))

			const difference = firstLineIndentation ? firstLineIndentation[0].length : 0

			const newSelectionStart = selectionStart - difference
			selection.setBaseAndExtent(
				element,
				selectionStart - difference,
				element,
				Math.max(newSelectionStart, selectionEnd - replacementsCount)
			)
		}
	}

	static fixNewLines = /\r?\n|\r/g

	static normalizeText(text: string) {
		return text.replace(TextHelpers.fixNewLines, '\n')
	}

	static normalizeTextForDom(text: string) {
		return text
			.replace(TextHelpers.fixNewLines, '\n')
			.split('\n')
			.map((x) => x || ' ')
			.join('\n')
	}
}

function getCaretIndex(element: HTMLElement) {
	if (typeof window.getSelection === 'undefined') return
	const selection = window.getSelection()
	if (!selection) return
	let position = 0
	if (selection.rangeCount !== 0) {
		const range = selection.getRangeAt(0)
		const preCaretRange = range.cloneRange()
		preCaretRange.selectNodeContents(element)
		preCaretRange.setEnd(range.endContainer, range.endOffset)
		position = preCaretRange.toString().length
	}
	return position
}
