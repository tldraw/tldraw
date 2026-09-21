let graphemeSegmenter: Intl.Segmenter | undefined
let checkedForSegmenter = false

/**
 * Resolve a shared grapheme `Intl.Segmenter`, or `undefined` when the runtime has no
 * `Intl.Segmenter`. `Intl.Segmenter` is unavailable on some older browsers (notably Firefox before
 * 125), so feature-detect it once rather than constructing it eagerly, which would throw at module
 * load and take down the whole app.
 */
function getGraphemeSegmenter(): Intl.Segmenter | undefined {
	if (!checkedForSegmenter) {
		checkedForSegmenter = true
		if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
			graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
		}
	}
	return graphemeSegmenter
}

/**
 * Iterate over the grapheme clusters of a string — user-perceived characters such as emoji
 * sequences, flags, and accented letters — instead of UTF-16 code units. Uses `Intl.Segmenter`
 * where available and falls back to iterating by code point on browsers that lack it, where a
 * multi-code-point cluster is yielded as its component code points rather than as one segment.
 *
 * @public
 */
export function* iterateGraphemes(str: string): IterableIterator<string> {
	const segmenter = getGraphemeSegmenter()
	if (segmenter) {
		for (const { segment } of segmenter.segment(str)) yield segment
	} else {
		yield* str
	}
}

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
	for (const segment of iterateGraphemes(str)) {
		return segment
	}
	return ''
}
