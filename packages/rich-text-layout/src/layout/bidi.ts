// First-strong paragraph direction detection, the rule behind `dir="auto"` / `direction: auto`.
// Scripts are used as a stand-in for Unicode bidi classes because JS regular expressions cannot
// match on Bidi_Class. This covers the scripts in everyday use; exotic RTL scripts are treated
// as LTR.
const RTL_SCRIPT =
	/[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}]/u
const STRONG_LTR = /\p{L}/u

/**
 * Paragraph direction from the first strong character, defaulting to `ltr` when there is none.
 *
 * @public
 */
export function detectDirection(text: string): 'ltr' | 'rtl' {
	for (const ch of text) {
		if (RTL_SCRIPT.test(ch)) return 'rtl'
		if (STRONG_LTR.test(ch)) return 'ltr'
	}
	return 'ltr'
}
