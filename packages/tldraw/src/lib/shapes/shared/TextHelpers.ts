/**	@public */
export const INDENT = '  '

/** @internal */
export class TextHelpers {
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
