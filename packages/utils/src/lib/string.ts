let graphemeSegmenter: Intl.Segmenter | undefined

/**
 * Get the first character of a string, treating a multi-code-unit character such as an emoji as a
 * single character. Unlike `str[0]` or `str.charAt(0)`, which return one UTF-16 code unit and so
 * split an emoji into a broken half, this returns the first whole grapheme cluster. Returns an
 * empty string when the input is empty.
 *
 * @example
 * ```ts
 * getFirstCharacter('hello') // 'h'
 * getFirstCharacter('😀 hello') // '😀'
 * getFirstCharacter('') // ''
 * ```
 *
 * @public
 */
export function getFirstCharacter(str: string): string {
	if (!str) return ''
	graphemeSegmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' })
	for (const { segment } of graphemeSegmenter.segment(str)) {
		return segment
	}
	return ''
}
