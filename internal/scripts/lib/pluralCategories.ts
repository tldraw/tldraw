// Cardinal plural categories per supported locale, from CLDR 49 (Node 26's Intl).
//
// Pinned so the check gives the same answer on every Node version: CI runs an older Node whose
// CLDR differs (CLDR 49 gave Vietnamese a `one` form, for example). `all` is every category the
// locale has. `required` is the subset an integer from 0 to 200 selects: French, Spanish, Italian
// and Portuguese have `many` only for numbers like 1,000,000, and requiring it would fail nearly
// every plural, while a missing form just falls back to `other`.
//
// When adding a locale to languages.json, add it here too: the validator fails on a supported
// locale with no entry.
export const PLURAL_CATEGORIES: Record<string, { required: string[]; all: string[] }> = {
	ar: {
		required: ['zero', 'one', 'two', 'few', 'many', 'other'],
		all: ['zero', 'one', 'two', 'few', 'many', 'other'],
	},
	bn: { required: ['one', 'other'], all: ['one', 'other'] },
	ca: { required: ['one', 'other'], all: ['one', 'many', 'other'] },
	cs: { required: ['one', 'few', 'other'], all: ['one', 'few', 'many', 'other'] },
	da: { required: ['one', 'other'], all: ['one', 'other'] },
	de: { required: ['one', 'other'], all: ['one', 'other'] },
	es: { required: ['one', 'other'], all: ['one', 'many', 'other'] },
	fa: { required: ['one', 'other'], all: ['one', 'other'] },
	fi: { required: ['one', 'other'], all: ['one', 'other'] },
	fr: { required: ['one', 'other'], all: ['one', 'many', 'other'] },
	el: { required: ['one', 'other'], all: ['one', 'other'] },
	gl: { required: ['one', 'other'], all: ['one', 'many', 'other'] },
	'gu-in': { required: ['one', 'other'], all: ['one', 'other'] },
	he: { required: ['one', 'two', 'other'], all: ['one', 'two', 'other'] },
	'hi-in': { required: ['one', 'other'], all: ['one', 'other'] },
	hr: { required: ['one', 'few', 'other'], all: ['one', 'few', 'other'] },
	hu: { required: ['one', 'other'], all: ['one', 'other'] },
	id: { required: ['other'], all: ['other'] },
	it: { required: ['one', 'other'], all: ['one', 'many', 'other'] },
	ja: { required: ['other'], all: ['other'] },
	kn: { required: ['one', 'other'], all: ['one', 'other'] },
	'km-kh': { required: ['other'], all: ['other'] },
	'ko-kr': { required: ['other'], all: ['other'] },
	ms: { required: ['other'], all: ['other'] },
	ml: { required: ['one', 'other'], all: ['one', 'other'] },
	mr: { required: ['one', 'other'], all: ['one', 'other'] },
	ne: { required: ['one', 'other'], all: ['one', 'other'] },
	nl: { required: ['one', 'other'], all: ['one', 'other'] },
	no: { required: ['one', 'other'], all: ['one', 'other'] },
	pl: { required: ['one', 'few', 'many', 'other'], all: ['one', 'few', 'many', 'other'] },
	'pt-br': { required: ['one', 'other'], all: ['one', 'many', 'other'] },
	'pt-pt': { required: ['one', 'other'], all: ['one', 'many', 'other'] },
	pa: { required: ['one', 'other'], all: ['one', 'other'] },
	ro: { required: ['one', 'few', 'other'], all: ['one', 'few', 'other'] },
	ru: { required: ['one', 'few', 'many', 'other'], all: ['one', 'few', 'many', 'other'] },
	sl: { required: ['one', 'two', 'few', 'other'], all: ['one', 'two', 'few', 'other'] },
	so: { required: ['one', 'other'], all: ['one', 'other'] },
	sv: { required: ['one', 'other'], all: ['one', 'other'] },
	ta: { required: ['one', 'other'], all: ['one', 'other'] },
	te: { required: ['one', 'other'], all: ['one', 'other'] },
	th: { required: ['other'], all: ['other'] },
	tl: { required: ['one', 'other'], all: ['one', 'other'] },
	tr: { required: ['one', 'other'], all: ['one', 'other'] },
	uk: { required: ['one', 'few', 'many', 'other'], all: ['one', 'few', 'many', 'other'] },
	ur: { required: ['one', 'other'], all: ['one', 'other'] },
	vi: { required: ['one', 'other'], all: ['one', 'other'] },
	'zh-cn': { required: ['other'], all: ['other'] },
	'zh-tw': { required: ['other'], all: ['other'] },
}
