import { beforeAll, describe, expect, it } from 'vitest'
import {
	NodeRegistry,
	StyleSheet,
	createFakeMeasureContext,
	installMeasureContext,
	layoutDocument,
	markRule,
	nodeRule,
	renderSvg,
} from './index'

// A second consumer with nothing in common with tldraw: its own node types, marks with
// attributes, its own fonts and a sheet built from scratch with no user agent defaults. The
// point of this test is that it needs nothing from the core beyond the public API.

const registry: NodeRegistry = {
	doc: { kind: 'block' },
	callout: { kind: 'block' },
	body: { kind: 'block' },
	checklist: { kind: 'list', ordered: false },
	check: { kind: 'listItem' },
	mention: { kind: 'inline', getText: (node) => `@${node.attrs?.name}` },
	emoji: { kind: 'inline', getText: (node) => String(node.attrs?.char) },
	softBreak: { kind: 'hardBreak' },
	text: { kind: 'text' },
}

const styles: StyleSheet = [
	nodeRule('callout', (ctx) => ({
		fontFamily: 'Display',
		fontSize: ctx.node.attrs?.level === 'warning' ? '1.5em' : '1.25em',
		marginBottom: '0.5lh',
		paddingLeft: '2ch',
	})),
	nodeRule('body', { marginBottom: '0.5em' }),
	nodeRule('checklist', { paddingLeft: 0, listStyleType: 'none' }),
	markRule('size', (ctx) => ({ fontSize: `${Number(ctx.marks[0].attrs?.px)}px` as const })),
	markRule('tone', (ctx) => ({ color: ctx.marks[0].attrs?.color as string })),
	markRule('flag', { background: '#ff0', fontWeight: 'bold' }),
	nodeRule('mention', { color: 'blue', textDecoration: 'underline' }),
]

// Display is twice as wide per glyph as Body, so the fonts are distinguishable in widths.
const fake = createFakeMeasureContext({ advance: 0.5 })
const measure = {
	measure: (text: string, font: Parameters<typeof fake.measure>[1]) => ({
		width: fake.measure(text, font).width * (font.family === 'Display' ? 2 : 1),
	}),
	metrics: fake.metrics,
}

const doc = {
	type: 'doc',
	content: [
		{ type: 'callout', attrs: { level: 'warning' }, content: [{ type: 'text', text: 'Heads up' }] },
		{
			type: 'body',
			content: [
				{ type: 'text', text: 'cc ' },
				{ type: 'mention', attrs: { name: 'sam' } },
				{ type: 'text', text: ' said ' },
				{
					type: 'text',
					text: 'no',
					marks: [{ type: 'flag' }, { type: 'size', attrs: { px: 40 } }],
				},
				{ type: 'softBreak' },
				{ type: 'emoji', attrs: { char: '✓' } },
			],
		},
		{
			type: 'checklist',
			content: [
				{ type: 'check', content: [{ type: 'body', content: [{ type: 'text', text: 'one' }] }] },
				{
					type: 'check',
					content: [
						{
							type: 'body',
							content: [
								{ type: 'text', text: 'two', marks: [{ type: 'tone', attrs: { color: 'red' } }] },
							],
						},
					],
				},
			],
		},
		{ type: 'unknownThing', content: [{ type: 'text', text: 'still laid out' }] },
	],
}

beforeAll(async () => {
	await installMeasureContext(fake)
})

describe('a consumer with its own schema, fonts and sheet', () => {
	const layout = () =>
		layoutDocument(doc, {
			registry,
			styles,
			userAgentStyles: null,
			rootStyle: { fontFamily: 'Body', fontSize: 20, lineHeight: 1.5 },
			measureContext: measure,
		})

	it('classifies and styles every node through the injected registry and sheet', () => {
		const l = layout()
		const [, callout, body] = l.blocks
		expect(callout.type).toBe('callout')
		expect(callout.style.fontFamily).toBe('Display')
		expect(callout.style.fontSize).toBe(30)
		expect(callout.style.paddingLeft).toBe(30) // 2ch at 30px; metrics come from the fake, unscaled
		expect(body.style.marginBottom).toBe(10)
		// 'Heads up' in Display: 8 glyphs × 15px × 2
		expect(l.lines[0].width).toBe(240)
		expect(l.lines[0].x).toBe(callout.style.paddingLeft)
	})

	it('degrades inline nodes to text, applies mark attributes and keeps the line box honest', () => {
		const l = layout()
		const line = l.lines[1]
		expect(line.fragments.map((f) => f.text)).toEqual(['cc', ' ', '@sam', ' ', 'said', ' ', 'no'])
		const mention = line.fragments[2]
		expect(mention.style.color).toBe('blue')
		expect(mention.style.textDecoration).toBe('underline')
		expect(mention.source).toEqual({ path: [1, 1], from: 0, to: 4 })
		const flagged = line.fragments[6]
		expect(flagged.style.fontSize).toBe(40)
		expect(flagged.style.fontWeight).toBe('bold')
		expect(flagged.style.background).toBe('#ff0')
		// the 40px run grows the line: 30px strut vs a 40px font with the inherited 1.5 factor
		expect(line.height).toBe(60)
		expect(l.lines[2].fragments.map((f) => f.text)).toEqual(['✓'])
	})

	it('lays out lists without markers when the sheet says so and survives unknown blocks', () => {
		const l = layout()
		const checks = l.lines.filter((line) =>
			line.fragments.some((f) => f.text === 'one' || f.text === 'two')
		)
		expect(checks).toHaveLength(2)
		expect(checks[0].fragments.some((f) => f.kind === 'marker')).toBe(false)
		expect(checks[0].x).toBe(0)
		expect(checks[1].fragments[0].style.color).toBe('red')
		expect(l.lines[l.lines.length - 1].fragments.map((f) => f.text).join('')).toBe('still laid out')
		expect(l.blocks[l.blocks.length - 1].type).toBe('unknownThing')
	})

	it('renders through the generic SVG renderer', () => {
		const svg = renderSvg(layout(), { fontFamily: (family) => `${family}-Web` })
		expect(svg).toContain('font-family="Display-Web"')
		expect(svg).toContain('<rect')
		expect(svg).toContain('fill="blue"')
		expect(svg).not.toContain('tldraw')
	})
})
