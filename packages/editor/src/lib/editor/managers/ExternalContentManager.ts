import { TLExternalContent } from '../../..'
import { Editor } from '../Editor'
import { INDENT } from '../shapes/shared/TextHelpers'

/** @public */
export class ExternalContentManager {
	constructor(public editor: Editor) {}

	/**
	 * Handle content from an external source. Register handlers using {@link registerHandler}.
	 *
	 * @example
	 * ```ts
	 * editor.this.handleSvgText = myCustomMethod
	 * ```
	 *
	 * @param editor - The editor instance.
	 * @param info - The info object describing the external content.
	 *
	 * @public
	 */
	handleContent = async (info: TLExternalContent) => {
		this._contentTypeHandlers[info.type]?.(this.editor, info as any)
	}

	private _contentTypeHandlers: {
		[K in TLExternalContent['type']]:
			| null
			| ((editor: Editor, info: TLExternalContent & { type: K }) => void)
	} = {
		text: null,
		files: null,
		embed: null,
		'svg-text': null,
		url: null,
	}

	registerHandler<T extends TLExternalContent['type']>(
		type: T,
		handler:
			| null
			| (T extends TLExternalContent['type']
					? (editor: Editor, info: TLExternalContent & { type: T }) => void
					: never)
	): void {
		// fuck it
		this._contentTypeHandlers[type] = handler as any
	}
}

/* --------------------- Helpers -------------------- */

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
