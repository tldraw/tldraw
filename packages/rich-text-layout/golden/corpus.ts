// The golden corpus: every case is measured in Chromium with tldraw's DOM measurement styles and
// in the Node engine. Never prune cases to improve the numbers; add to them.

export const FAMILIES = {
	draw: "'tldraw_draw', sans-serif",
	sans: "'tldraw_sans', sans-serif",
	serif: "'tldraw_serif', serif",
	mono: "'tldraw_mono', monospace",
} as const

export type FamilyKey = keyof typeof FAMILIES

// tldraw's default theme font size (16) times FONT_SIZES s/m/l/xl.
export const SIZES = [18, 24, 36, 44]

export const LINE_HEIGHT = 1.35

export const WIDTHS: (number | null)[] = [null, 200]

export const PLAIN_TEXTS: Record<string, string> = {
	short: 'hello',
	two: 'Hello world',
	pangram: 'The quick brown fox jumps over the lazy dog',
	paragraph:
		'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
	longWord: 'supercalifragilisticexpialidocious',
	unbreakable: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
	url: 'https://www.example.com/some/long/path?query=string&x=1',
	repeatedSpaces: 'a    b     c',
	tabs: 'a\tb\tc',
	tabLines: 'col1\tcol2\n\tindented',
	trailingSpaces: 'trailing   ',
	leadingSpaces: '   leading',
	punctuation: 'Hello, world! "Quotes" (parens) — dashes – and… ellipsis; semi:colon',
	numbers: '1,234,567.89 100% $42.00 3/4',
	japanese: '日本語のテキストをレイアウトする',
	chinese: '这是一个中文句子，用于测试换行。',
	korean: '한국어 텍스트 줄바꿈 테스트입니다',
	arabic: 'مرحبا بالعالم هذا نص عربي طويل',
	hebrew: 'שלום עולם זהו טקסט בעברית',
	mixedDirection: 'Hello مرحبا world שלום',
	emoji: '😀 hello 👋🏽 world 🇺🇸 family 👨‍👩‍👧‍👦',
	multiLine: 'line one\nline two\n\nline four',
	emptyLines: '\n\n',
	singleSpace: ' ',
	hyphenated: 'state-of-the-art well-known re-enter',
	longWords: 'Internationalization Localization Accessibility',
	caps: 'THE QUICK BROWN FOX',
	thai: 'ภาษาไทยไม่มีการเว้นวรรคระหว่างคำ',
	vietnamese: 'Tiếng Việt có dấu thanh điệu',
	german: 'Donaudampfschifffahrtsgesellschaftskapitän',
	zeroWidth: 'zero​width space',
	nbsp: 'non breaking space here',
	combining: 'é combining ä',
	trailingNewline: 'ends with newline\n',
	manyWords: Array.from({ length: 40 }, (_, i) => `w${i}`).join(' '),
}

export interface PlainCase {
	id: string
	kind: 'plain'
	textKey: string
	text: string
	family: FamilyKey
	fontSize: number
	maxWidth: number | null
}

export function plainCorpus(): PlainCase[] {
	const cases: PlainCase[] = []
	for (const [textKey, text] of Object.entries(PLAIN_TEXTS)) {
		for (const family of Object.keys(FAMILIES) as FamilyKey[]) {
			for (const fontSize of SIZES) {
				for (const maxWidth of WIDTHS) {
					cases.push({
						id: `${textKey}/${family}/${fontSize}/${maxWidth ?? 'auto'}`,
						kind: 'plain',
						textKey,
						text,
						family,
						fontSize,
						maxWidth,
					})
				}
			}
		}
	}
	return cases
}

export type RichAlign = 'start' | 'center' | 'end' | 'justify'

export interface RichCase {
	id: string
	kind: 'rich'
	docKey: string
	doc: any
	family: FamilyKey
	fontSize: number
	maxWidth: number | null
	textAlign: RichAlign
}

// Documents that exercise alignment: multi-line, mixed runs, lists (forced left in tldraw).
const ALIGNED_DOCS = ['multiLineMixed', 'headingWrap', 'listWrap', 'boldMidWord', 'hardBreak']

const p = (...content: any[]) => ({ type: 'paragraph', attrs: { dir: 'auto' }, content })
const t = (text: string, ...marks: string[]) => ({
	type: 'text',
	text,
	...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}),
})
const h = (level: number, ...content: any[]) => ({
	type: 'heading',
	attrs: { level, dir: 'auto' },
	content,
})
const li = (...content: any[]) => ({ type: 'listItem', content })
const ul = (...items: any[]) => ({ type: 'bulletList', content: items })
const ol = (start: number | undefined, ...items: any[]) => ({
	type: 'orderedList',
	attrs: start === undefined ? {} : { start },
	content: items,
})
const doc = (...content: any[]) => ({ type: 'doc', content })

export const RICH_DOCS: Record<string, any> = {
	plainPara: doc(p(t('Hello world'))),
	boldWord: doc(p(t('Hello '), t('bold', 'bold'), t(' world'))),
	boldMidWord: doc(p(t('Hel'), t('lo', 'bold'), t(' world and more words to wrap'))),
	italic: doc(p(t('Some '), t('italic text', 'italic'), t(' in a sentence that wraps around'))),
	boldItalic: doc(p(t('Mixed '), t('bold italic', 'bold', 'italic'), t(' runs'))),
	code: doc(p(t('Call '), t('someFunction()', 'code'), t(' to start the thing'))),
	codeOnly: doc(p(t('const x = 1', 'code'))),
	strike: doc(p(t('Strike '), t('this out', 'strike'), t(' please'))),
	highlight: doc(p(t('A '), t('highlighted', 'highlight'), t(' word'))),
	link: doc(
		p(
			t('Visit '),
			{
				type: 'text',
				text: 'tldraw.com',
				marks: [{ type: 'link', attrs: { href: 'https://tldraw.com' } }],
			},
			t(' today')
		)
	),
	punctuationAfterMark: doc(p(t('Hello', 'bold'), t(', world and then some more words'))),
	hardBreak: doc(p(t('line one'), { type: 'hardBreak' }, t('line two'))),
	trailingHardBreak: doc(p(t('line one'), { type: 'hardBreak' })),
	doubleHardBreak: doc(p(t('one'), { type: 'hardBreak' }, { type: 'hardBreak' }, t('three'))),
	twoParas: doc(p(t('First paragraph')), p(t('Second paragraph'))),
	emptyPara: doc(p(t('Above')), p(), p(t('Below'))),
	emptyDoc: doc(p()),
	h1: doc(h(1, t('Heading one')), p(t('Body text'))),
	h2: doc(h(2, t('Heading two')), p(t('Body text'))),
	h3: doc(p(t('Before')), h(3, t('Heading three')), p(t('After'))),
	headings: doc(
		h(1, t('One')),
		h(2, t('Two')),
		h(3, t('Three')),
		h(4, t('Four')),
		h(5, t('Five')),
		h(6, t('Six'))
	),
	headingWrap: doc(h(1, t('A long heading that should wrap onto several lines when narrow'))),
	bullets: doc(ul(li(p(t('first item'))), li(p(t('second item'))), li(p(t('third item'))))),
	numbered: doc(ol(undefined, li(p(t('first'))), li(p(t('second'))), li(p(t('third'))))),
	numberedStart: doc(ol(9, li(p(t('nine'))), li(p(t('ten'))), li(p(t('eleven'))))),
	tenItems: doc(ol(undefined, ...Array.from({ length: 10 }, (_, i) => li(p(t(`item ${i + 1}`)))))),
	nestedBullets: doc(
		ul(li(p(t('outer')), ul(li(p(t('inner'))), li(p(t('inner two'))))), li(p(t('outer two'))))
	),
	listWrap: doc(ul(li(p(t('a list item with enough words in it to wrap around the box edge'))))),
	listThenPara: doc(ul(li(p(t('item')))), p(t('paragraph after list'))),
	boldHeading: doc(h(2, t('Partly '), t('bold', 'bold'), t(' heading'))),
	codeInHeading: doc(h(1, t('Use '), t('code', 'code'), t(' here'))),
	multiLineMixed: doc(
		p(
			t('The '),
			t('quick', 'bold'),
			t(' brown '),
			t('fox', 'italic'),
			t(' jumps over the '),
			t('lazy', 'code'),
			t(' dog again and again')
		)
	),
	cjkBold: doc(p(t('日本語の'), t('太字', 'bold'), t('テキスト'))),
	rtlBold: doc(p(t('مرحبا '), t('بالعالم', 'bold'), t(' هذا نص'))),
	emojiBold: doc(p(t('Hello 😀 '), t('world 👋', 'bold'))),
	spacesAroundMarks: doc(p(t('a '), t(' b ', 'bold'), t(' c'))),
	longCode: doc(p(t('averyveryverylongidentifierthatwillnotfit', 'code'))),
}

export function richCorpus(): RichCase[] {
	const cases: RichCase[] = []
	for (const [docKey, d] of Object.entries(RICH_DOCS)) {
		for (const family of ['sans', 'draw'] as FamilyKey[]) {
			for (const fontSize of [24, 36]) {
				for (const maxWidth of WIDTHS) {
					cases.push({
						id: `${docKey}/${family}/${fontSize}/${maxWidth ?? 'auto'}`,
						kind: 'rich',
						docKey,
						doc: d,
						family,
						fontSize,
						maxWidth,
						textAlign: 'start',
					})
					if (ALIGNED_DOCS.includes(docKey) && family === 'sans' && fontSize === 24) {
						for (const textAlign of ['center', 'end', 'justify'] as RichAlign[]) {
							cases.push({
								id: `${docKey}/${family}/${fontSize}/${maxWidth ?? 'auto'}/${textAlign}`,
								kind: 'rich',
								docKey,
								doc: d,
								family,
								fontSize,
								maxWidth,
								textAlign,
							})
						}
					}
				}
			}
		}
	}
	return cases
}
