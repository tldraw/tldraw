import { beforeAll, describe, expect, it } from 'vitest'
import { PMNode } from '../document/types'
import { createFakeMeasureContext } from '../measure/fake'
import { installMeasureContext } from '../measure/install'
import { markRule, nodeRule } from '../style/stylesheet'
import { layoutDocument } from './document'

// 0.5em per grapheme; bold 20% wider; ascent 0.8em, descent 0.2em.
const fake = createFakeMeasureContext({ advance: 0.5, ascent: 0.8, descent: 0.2, boldFactor: 1.2 })
const rootStyle = {
	fontFamily: 'Fake',
	fontSize: 20,
	lineHeight: '30px',
	whiteSpace: 'pre-wrap',
} as const

const p = (...content: PMNode[]): PMNode => ({ type: 'paragraph', content })
const t = (text: string, ...marks: string[]): PMNode => ({
	type: 'text',
	text,
	marks: marks.map((type) => ({ type })),
})
const doc = (...content: PMNode[]): PMNode => ({ type: 'doc', content })

beforeAll(async () => {
	await installMeasureContext(fake)
})

describe('layoutDocument', () => {
	it('lays an empty document out with no height', () => {
		expect(layoutDocument(doc(), { rootStyle })).toMatchObject({ width: 0, height: 0, lines: [] })
	})

	it('stacks paragraphs with user agent margins collapsing between siblings', () => {
		const layout = layoutDocument(doc(p(t('a')), p(t('b'))), { rootStyle })
		// 1em margins: top 20, line 30, collapsed 20, line 30, bottom 20
		expect(layout.height).toBe(20 + 30 + 20 + 30 + 20)
		expect(layout.blocks.map((b) => [b.type, b.y, b.height])).toEqual([
			['doc', 0, 120],
			['paragraph', 20, 30],
			['paragraph', 70, 30],
		])
	})

	it('honours consumer rules over the user agent sheet', () => {
		const layout = layoutDocument(doc(p(t('a')), p(), p(t('b'))), {
			rootStyle,
			styles: [nodeRule('paragraph', { marginTop: 0, marginBottom: 0, minHeight: '1lh' })],
		})
		expect(layout.height).toBe(90)
		expect(layout.lines).toHaveLength(3)
	})

	it('sizes headings relative to the root font and collapses their margins', () => {
		const layout = layoutDocument(
			doc({ type: 'heading', attrs: { level: 1 }, content: [t('Hi')] }, p(t('body'))),
			{ rootStyle: { ...rootStyle, lineHeight: 1.5 } }
		)
		const heading = layout.blocks[1]
		expect(heading.style.fontSize).toBe(40)
		expect(heading.style.fontWeight).toBe('bold')
		expect(heading.style.lineHeight).toBe(60)
		// 0.67em of 40px = 26.8 top margin, then the larger of 26.8 and the paragraph's 20
		expect(heading.y).toBeCloseTo(26.8)
		expect(layout.blocks[2].y).toBeCloseTo(26.8 + 60 + 26.8)
	})

	it('mixes fonts on one line and keeps break opportunities across mark boundaries', () => {
		const layout = layoutDocument(doc(p(t('Hel'), t('lo', 'bold'), t(' world'))), {
			rootStyle,
			userAgentStyles: null,
			styles: [markRule('bold', { fontWeight: 'bold' })],
			maxWidth: 70,
		})
		// 'Hello' is 30 + 24 = 54 wide; ' world' doesn't fit after it, so the word stays whole.
		expect(layout.lines.map((l) => l.fragments.map((f) => f.text))).toEqual([
			['Hel', 'lo', ' '],
			['world'],
		])
		expect(layout.lines[0].fragments[1].style.fontWeight).toBe('bold')
		expect(layout.lines[0].fragments[1].width).toBe(24)
	})

	it('does not split a word at a mark boundary when it would fit on the next line', () => {
		const layout = layoutDocument(doc(p(t('aaa bb'), t('bb', 'bold'))), {
			rootStyle,
			userAgentStyles: null,
			styles: [markRule('bold', { fontWeight: 'bold' })],
			maxWidth: 65,
		})
		expect(layout.lines.map((l) => l.fragments.map((f) => f.text).join(''))).toEqual([
			'aaa ',
			'bbbb',
		])
	})

	it('grows the line box for a taller inline font', () => {
		const layout = layoutDocument(doc(p(t('a'), t('b', 'big'))), {
			rootStyle,
			userAgentStyles: null,
			styles: [markRule('big', { fontSize: '2em' })],
		})
		// strut: 30px box; big run: 40px font with the inherited 30px line height → half-leading
		// of -5: ascent 32 - 5 = 27 above, descent 8 - 5 = 3 below → 30 tall, but the strut's
		// 21 above / 9 below pushes the line to 27 + 9 = 36.
		expect(layout.lines[0].height).toBe(36)
		expect(layout.lines[0].baseline).toBe(27)
	})

	it('renders hard breaks, including doubled ones', () => {
		const layout = layoutDocument(
			doc(p(t('one'), { type: 'hardBreak' }, { type: 'hardBreak' }, t('three'))),
			{ rootStyle, userAgentStyles: null }
		)
		expect(layout.lines.map((l) => l.fragments.map((f) => f.text).join(''))).toEqual([
			'one',
			'',
			'three',
		])
		expect(layout.height).toBe(90)
	})

	it('lays lists out with markers, padding and nesting', () => {
		const list: PMNode = {
			type: 'bulletList',
			content: [
				{ type: 'listItem', content: [p(t('one'))] },
				{
					type: 'listItem',
					content: [
						p(t('two')),
						{
							type: 'bulletList',
							content: [{ type: 'listItem', content: [p(t('inner'))] }],
						},
					],
				},
			],
		}
		const layout = layoutDocument(doc(list), {
			rootStyle,
			styles: [
				nodeRule('paragraph', { marginTop: 0, marginBottom: 0 }),
				nodeRule(['bulletList'], { marginTop: 0, marginBottom: 0, paddingLeft: '2ch' }),
			],
		})
		expect(layout.lines.map((l) => [l.x, l.fragments[0].kind, l.fragments[0].text])).toEqual([
			[20, 'marker', '•'],
			[20, 'marker', '•'],
			[40, 'marker', '◦'],
		])
		expect(layout.lines[0].fragments[0].x).toBe(-20)
		expect(layout.width).toBe(40 + 50)
	})

	it('numbers ordered lists from their start attribute', () => {
		const layout = layoutDocument(
			doc({
				type: 'orderedList',
				attrs: { start: 9 },
				content: [
					{ type: 'listItem', content: [p(t('a'))] },
					{ type: 'listItem', content: [p(t('b'))] },
				],
			}),
			{ rootStyle }
		)
		expect(layout.lines.map((l) => l.fragments[0].text)).toEqual(['9.', '10.'])
	})

	it('styles marks through the sheet: code font, highlight background, link colour', () => {
		const layout = layoutDocument(
			doc(
				p(t('x', 'code'), t('y', 'highlight'), {
					type: 'text',
					text: 'z',
					marks: [{ type: 'link', attrs: { href: 'https://a.b' } }],
				})
			),
			{ rootStyle }
		)
		const [code, highlight, link] = layout.lines[0].fragments
		expect(code.style.fontFamily).toBe('monospace')
		expect(highlight.style.background).toBe('#ffff00')
		expect(link.style.textDecoration).toBe('underline')
	})

	it('degrades unknown inline nodes to their text and unknown blocks to paragraphs', () => {
		const layout = layoutDocument(
			doc(
				{ type: 'callout', content: [t('known text')] },
				p({ type: 'mention', attrs: { label: 'x' }, content: [t('@x')] }, t(' there'))
			),
			{ rootStyle, userAgentStyles: null }
		)
		expect(layout.lines.map((l) => l.fragments.map((f) => f.text).join(''))).toEqual([
			'known text',
			'@x there',
		])
	})

	it('maps fragment sources to node paths and offsets', () => {
		const layout = layoutDocument(doc(p(t('ab'), t('cd', 'bold'))), {
			rootStyle,
			userAgentStyles: null,
		})
		expect(layout.lines[0].fragments.map((f) => f.source)).toEqual([
			{ path: [0, 0], from: 0, to: 2 },
			{ path: [0, 1], from: 0, to: 2 },
		])
	})

	it('detects direction from the first strong character', () => {
		const layout = layoutDocument(doc(p(t('שלום world'))), {
			rootStyle: { ...rootStyle, direction: 'auto', textAlign: 'start' },
			userAgentStyles: null,
			minWidth: 200,
		})
		expect(layout.lines[0].direction).toBe('rtl')
		// start-aligned RTL text sits at the right edge
		expect(layout.lines[0].x + layout.lines[0].width).toBe(200)
	})

	it('reorders mixed-direction lines by fragment, including under word-break: break-all', () => {
		const layout = layoutDocument(doc(p(t('ab שלום cd'))), {
			rootStyle: { ...rootStyle, direction: 'auto', wordBreak: 'break-all' },
			userAgentStyles: null,
		})
		const texts = layout.lines[0].fragments.map((f) => f.text).join('')
		expect(texts.replace(/\u200B/g, '')).toHaveLength('ab שלום cd'.length)
		// visual order: every fragment keeps its width and the x positions tile the line
		const frags = layout.lines[0].fragments
		for (let i = 1; i < frags.length; i++) {
			expect(frags[i].x).toBeCloseTo(frags[i - 1].x + frags[i - 1].width)
		}
		expect(layout.lines[0].direction).toBe('ltr')
	})
})
