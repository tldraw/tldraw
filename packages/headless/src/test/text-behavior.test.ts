import {
	Editor,
	Rectangle2d,
	TLArrowShape,
	TLGeoShape,
	TLNoteShape,
	TLTextShape,
	approximateTextMeasurer,
	createShapeId,
} from '@tldraw/editor'
import { TLRichText, toRichText } from '@tldraw/tlschema'
import { renderPlaintextFromRichText } from 'tldraw/headless-defaults'
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from '../lib/createHeadlessEditor'

const editors: Editor[] = []
function makeEditor(opts: Parameters<typeof createHeadlessEditor>[0] = {}) {
	const editor = createHeadlessEditor({ frameLoop: 'manual', ...opts })
	editors.push(editor)
	return editor
}

afterEach(() => {
	for (const editor of editors.splice(0)) editor.dispose()
})

function makeText(editor: Editor, richText: TLRichText, props?: Partial<TLTextShape['props']>) {
	const id = createShapeId()
	editor.createShape<TLTextShape>({ id, type: 'text', x: 0, y: 0, props: { richText, ...props } })
	return id
}

// Rich text documents the interactive editor can't produce with toRichText (headings, lists,
// hard breaks, dir attrs) — built by hand in tiptap's JSON shape.
function doc(...content: object[]): TLRichText {
	return { type: 'doc', content } as TLRichText
}
function paragraph(text?: string, attrs?: object) {
	return {
		type: 'paragraph',
		...(attrs ? { attrs } : {}),
		...(text !== undefined ? { content: [{ type: 'text', text }] } : {}),
	}
}

describe('auto-size text', () => {
	// The default headless measurer estimates w = chars * fontSize / 2 and h = lines * fontSize.
	// The text shape's size 'm' resolves to a 24px font, and the shape util adds 1px to the
	// measured width to avoid wrapping — so 'Hello' is 5 * 12 + 1 = 61 wide and 24 tall. These
	// exact values are deterministic and pin that the real measurement path ran.
	it('measures a one-line auto-size shape from character count', () => {
		const editor = makeEditor()
		const id = makeText(editor, toRichText('Hello'))
		expect(editor.getShapePageBounds(id)).toMatchObject({ w: 61, h: 24 })
	})

	it('grows wider as characters are added', () => {
		const editor = makeEditor()
		const id = makeText(editor, toRichText('Hello'))
		const before = editor.getShapePageBounds(id)!
		editor.updateShape<TLTextShape>({
			id,
			type: 'text',
			props: { richText: toRichText('Hello world more') },
		})
		const after = editor.getShapePageBounds(id)!
		expect(after.w).toBeGreaterThan(before.w)
		expect(after).toMatchObject({ w: 16 * 12 + 1, h: 24 })
	})

	it('grows taller (not wider) as paragraphs are added', () => {
		const editor = makeEditor()
		const id = makeText(editor, toRichText('Hello'))
		editor.updateShape<TLTextShape>({
			id,
			type: 'text',
			props: { richText: toRichText('Hello\nworld\nagain') },
		})
		// Three lines of equal length: same width as one 'Hello', three line-heights tall.
		expect(editor.getShapePageBounds(id)).toMatchObject({ w: 61, h: 72 })
	})

	it('wraps fixed-width text: w stays fixed, h grows', () => {
		const editor = makeEditor()
		const id = makeText(editor, toRichText('abcdefghij abcdefghij abcdefghij'), {
			autoSize: false,
			w: 100,
		})
		// 32 chars measure 384px unwrapped; the approximate wrap model adds ceil(384/100) = 4
		// wrapped lines to the 1 explicit line, giving 5 * 24 = 120 tall at the fixed 100 width.
		expect(editor.getShapePageBounds(id)).toMatchObject({ w: 100, h: 120 })
		expect(editor.getShape<TLTextShape>(id)!.props.w).toBe(100)
	})

	it('clamps tiny content to the 16px minimum width', () => {
		const editor = makeEditor()
		const id = makeText(editor, toRichText('a'))
		expect(editor.getShapePageBounds(id)).toMatchObject({ w: 16, h: 24 })
	})
})

describe('label sizing (note, geo, arrow)', () => {
	it('an empty note is the default 200x200 with growY 0', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLNoteShape>({ id, type: 'note', x: 0, y: 0 })
		expect(editor.getShapePageBounds(id)).toMatchObject({ w: 200, h: 200 })
		expect(editor.getShape<TLNoteShape>(id)!.props.growY).toBe(0)
	})

	it('a note grows (growY) when its label overflows, at create time', () => {
		const editor = makeEditor()
		const id = createShapeId()
		const long = Array.from({ length: 30 }, (_, i) => `line number ${i}`).join('\n')
		editor.createShape<TLNoteShape>({
			id,
			type: 'note',
			x: 0,
			y: 0,
			props: { richText: toRichText(long) },
		})
		// growY is written into the stored shape by onBeforeCreate — no bounds read needed —
		// so headless documents carry the same growY a browser session would recompute. The
		// exact value is the approximate measurer's deterministic output for 30 lines.
		const note = editor.getShape<TLNoteShape>(id)!
		expect(note.props.growY).toBe(514)
		// The note keeps its default font size rather than shrinking to fit.
		expect(note.props.fontSizeAdjustment).toBe(1)
		expect(editor.getShapePageBounds(id)).toMatchObject({ w: 200, h: 200 + 514 })
	})

	it('a geo shape grows (growY) when its label overflows', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLGeoShape>({
			id,
			type: 'geo',
			x: 0,
			y: 0,
			props: { w: 100, h: 40, richText: toRichText('a\nb\nc\nd\ne\nf\ng\nh') },
		})
		const geo = editor.getShape<TLGeoShape>(id)!
		// props.h stays at the authored 40; the overflow lives entirely in growY, and page
		// bounds are h + growY.
		expect(geo.props.h).toBe(40)
		expect(geo.props.growY).toBe(190)
		expect(editor.getShapePageBounds(id)).toMatchObject({ w: 100, h: 230 })
	})

	it('an arrow label gets a measured label geometry', () => {
		const editor = makeEditor()
		const id = createShapeId()
		editor.createShape<TLArrowShape>({
			id,
			type: 'arrow',
			x: 0,
			y: 0,
			props: { start: { x: 0, y: 0 }, end: { x: 300, y: 0 }, richText: toRichText('label') },
		})
		const geom = editor.getShapeGeometry(id)
		// Select the label by type, not index — child order is an implementation detail
		const label = (geom as any).children.find((c: unknown) => c instanceof Rectangle2d)
		expect(label).toBeInstanceOf(Rectangle2d)
		// Centered on the arrow midline, sized from the measured text.
		expect(label.bounds).toMatchObject({ x: 120.75, y: -24.25, w: 58.5, h: 48.5 })

		editor.updateShape<TLArrowShape>({
			id,
			type: 'arrow',
			props: { richText: toRichText('a much longer arrow label') },
		})
		const longer = (editor.getShapeGeometry(id) as any).children[1]
		expect(longer.bounds.w).toBeGreaterThan(label.bounds.w)
	})
})

describe('rich text structures through the real serializer', () => {
	it('multi-paragraph height scales with paragraph count', () => {
		const editor = makeEditor()
		const two = makeText(editor, doc(paragraph('one'), paragraph('two')))
		const four = makeText(
			editor,
			doc(paragraph('one'), paragraph('two'), paragraph('three'), paragraph('four'))
		)
		expect(editor.getShapePageBounds(two)!.h).toBe(48)
		expect(editor.getShapePageBounds(four)!.h).toBe(96)
	})

	// PINNED DIVERGENCE: the approximate measurer ignores the larger font size of headings, so
	// an h1 measures exactly like a paragraph. A browser would measure it larger. Deliberate
	// approximation behavior — do not "fix".
	it('measures a heading the same as a paragraph (heading multiplier ignored)', () => {
		const editor = makeEditor()
		const para = makeText(editor, doc(paragraph('Hello')))
		const heading = makeText(
			editor,
			doc({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Hello' }] })
		)
		expect(editor.getShapePageBounds(heading)).toEqual(editor.getShapePageBounds(para))
		expect(editor.getShapePageBounds(heading)).toMatchObject({ w: 61, h: 24 })
	})

	function listItem(text: string) {
		return { type: 'listItem', content: [paragraph(text)] }
	}

	it('a bullet list measures one line per item', () => {
		const editor = makeEditor()
		const id = makeText(
			editor,
			doc({ type: 'bulletList', content: [listItem('one'), listItem('two'), listItem('three')] })
		)
		expect(editor.getShapePageBounds(id)).toMatchObject({ w: 61, h: 72 })
	})

	it('an ordered list measures one line per item', () => {
		const editor = makeEditor()
		const id = makeText(
			editor,
			doc({
				type: 'orderedList',
				attrs: { start: 1 },
				content: [listItem('one'), listItem('two')],
			})
		)
		expect(editor.getShapePageBounds(id)!.h).toBe(48)
	})

	it('hard breaks count as line breaks', () => {
		const editor = makeEditor()
		const id = makeText(
			editor,
			doc({
				type: 'paragraph',
				content: [
					{ type: 'text', text: 'a' },
					{ type: 'hardBreak' },
					{ type: 'text', text: 'b' },
					{ type: 'hardBreak' },
					{ type: 'text', text: 'c' },
				],
			})
		)
		expect(editor.getShapePageBounds(id)).toMatchObject({ w: 16, h: 72 })
	})

	it('empty paragraphs count as lines rather than collapsing', () => {
		const editor = makeEditor()
		const id = makeText(editor, doc(paragraph('a'), paragraph(), paragraph('b')))
		expect(editor.getShapePageBounds(id)).toMatchObject({ w: 16, h: 72 })
	})

	it('explicit RTL dir attributes serialize and measure', () => {
		const editor = makeEditor()
		const id = makeText(editor, doc(paragraph('שלום', { dir: 'rtl' })))
		expect(editor.getShapePageBounds(id)).toMatchObject({ w: 4 * 12 + 1, h: 24 })
	})
})

describe('renderPlaintextFromRichText', () => {
	it('joins paragraphs with newlines', () => {
		const editor = makeEditor()
		expect(renderPlaintextFromRichText(editor, toRichText('a\nb\nc'))).toBe('a\nb\nc')
	})

	it('renders hard breaks as newlines', () => {
		const editor = makeEditor()
		const rt = doc({
			type: 'paragraph',
			content: [{ type: 'text', text: 'a' }, { type: 'hardBreak' }, { type: 'text', text: 'b' }],
		})
		expect(renderPlaintextFromRichText(editor, rt)).toBe('a\nb')
	})

	it('renders code blocks and other non-paragraph textblocks instead of dropping them', () => {
		// The walker treats any node with direct text children as a textblock — an allowlist
		// of paragraph/heading would render code blocks as '', which routes into the
		// editor's delete-shape-when-empty paths.
		const editor = makeEditor()
		const rt = doc({ type: 'codeBlock', content: [{ type: 'text', text: 'const a = 1' }] })
		expect(renderPlaintextFromRichText(editor, rt)).toBe('const a = 1')
	})

	// The plaintext walker emits one line per textblock — tiptap's generateText used to
	// double the separators here ('\n\none\n\ntwo\n\nthree').
	it('renders bullet lists one item per line', () => {
		const editor = makeEditor()
		const rt = doc({
			type: 'bulletList',
			content: [
				{ type: 'listItem', content: [paragraph('one')] },
				{ type: 'listItem', content: [paragraph('two')] },
				{ type: 'listItem', content: [paragraph('three')] },
			],
		})
		expect(renderPlaintextFromRichText(editor, rt)).toBe('one\ntwo\nthree')
	})

	it('renders empty rich text as the empty string', () => {
		const editor = makeEditor()
		expect(renderPlaintextFromRichText(editor, toRichText(''))).toBe('')
	})
})

describe('measurer injection', () => {
	const fixedResult = { x: 0, y: 0, w: 123, h: 45, scrollWidth: 123 }
	function makeCountingMeasurer() {
		const calls = { text: 0, html: 0, batch: 0, spans: 0, lastText: '' }
		return {
			calls,
			measurer: {
				measureText: (text: string) => {
					calls.text++
					calls.lastText = text
					return fixedResult
				},
				measureHtml: () => {
					calls.html++
					return fixedResult
				},
				measureHtmlBatch: (requests: any[]) => {
					calls.batch++
					return requests.map(() => fixedResult)
				},
				measureTextSpans: (text: string) => {
					calls.spans++
					return [{ box: { x: 0, y: 0, w: 123, h: 45 }, text }]
				},
			},
		}
	}

	it('exposes the default approximate measurer as textMeasure.injected', () => {
		const editor = makeEditor()
		// Headless editors always inject — .injected is never null here, unlike in a browser.
		expect(editor.textMeasure.injected).toBe(approximateTextMeasurer)
	})

	it('a custom measurer drives shape geometry and is exposed as injected', () => {
		const { measurer, calls } = makeCountingMeasurer()
		const editor = makeEditor({ textMeasurer: measurer })
		expect(editor.textMeasure.injected).toBe(measurer)

		const id = makeText(editor, toRichText('anything at all'))
		const bounds = editor.getShapePageBounds(id)!
		// The shape util adds 1px to the measured width, so geometry is measurer-driven, not exact.
		expect(bounds.w).toBe(124)
		expect(bounds.h).toBe(45)
		expect(calls.html).toBeGreaterThan(0)
	})

	it('routes the single measureHtml path to the injected measurer', () => {
		const { measurer, calls } = makeCountingMeasurer()
		const editor = makeEditor({ textMeasurer: measurer })
		const result = editor.textMeasure.measureHtml('<p>x</p>', {
			fontStyle: 'normal',
			fontWeight: 'normal',
			fontFamily: 'sans-serif',
			fontSize: 20,
			lineHeight: 1.35,
			maxWidth: null,
			padding: '0px',
		})
		expect(result).toEqual(fixedResult)
		expect(calls.html).toBe(1)
		expect(calls.batch).toBe(0)
	})

	it('routes the batch path to the injected measurer', () => {
		const { measurer, calls } = makeCountingMeasurer()
		const editor = makeEditor({ textMeasurer: measurer })
		const opts = {
			fontStyle: 'normal',
			fontWeight: 'normal',
			fontFamily: 'sans-serif',
			fontSize: 20,
			lineHeight: 1.35,
			maxWidth: null,
			padding: '0px',
		}
		const results = editor.textMeasure.measureHtmlBatch([
			{ html: '<p>a</p>', opts },
			{ html: '<p>b</p>', opts },
		])
		expect(results).toEqual([fixedResult, fixedResult])
		expect(calls.batch).toBe(1)
		expect(calls.html).toBe(0)

		// An empty batch short-circuits without delegating.
		expect(editor.textMeasure.measureHtmlBatch([])).toEqual([])
		expect(calls.batch).toBe(1)
	})

	it('normalizes \\r\\n to \\n before delegating measureText', () => {
		const { measurer, calls } = makeCountingMeasurer()
		const editor = makeEditor({ textMeasurer: measurer })
		editor.textMeasure.measureText('a\r\nb\rc', {
			fontStyle: 'normal',
			fontWeight: 'normal',
			fontFamily: 'sans-serif',
			fontSize: 20,
			lineHeight: 1.35,
			maxWidth: null,
			padding: '0px',
		})
		expect(calls.lastText).toBe('a\nb\nc')
	})

	// PINNED DIVERGENCE: with a maxWidth, the approximate measurer clamps the measured width UP
	// to maxWidth even when the text is far narrower — a browser would report the narrower
	// wrapped width. Deliberate approximation behavior — do not "fix".
	it('clamps wrapped width up to maxWidth', () => {
		const editor = makeEditor()
		const result = editor.textMeasure.measureText('ab', {
			fontStyle: 'normal',
			fontWeight: 'normal',
			fontFamily: 'sans-serif',
			fontSize: 20,
			lineHeight: 1.35,
			maxWidth: 100,
			padding: '0px',
		})
		// 'ab' is 20px of characters, but the wrapped result reports the full 100px, and the
		// height model still adds a wrapped-line term: (ceil(20/100) + 1 line) * 20 = 40.
		expect(result).toMatchObject({ w: 100, h: 40 })
	})
})

describe('textOptions: null', () => {
	it('still creates text shapes (validation needs no text stack)', () => {
		const editor = makeEditor({ textOptions: null })
		const id = makeText(editor, toRichText('hi'))
		expect(editor.getShape(id)).toBeDefined()
	})

	it('throws an actionable error when measuring a text shape', () => {
		const editor = makeEditor({ textOptions: null })
		const id = makeText(editor, toRichText('hi'))
		expect(() => editor.getShapePageBounds(id)).toThrow(
			'Cannot use text without setting textOptions'
		)
	})

	it('still renders plaintext (the walker needs no text extensions)', () => {
		const editor = makeEditor({ textOptions: null })
		expect(renderPlaintextFromRichText(editor, toRichText('hi'))).toBe('hi')
	})

	it('leaves label-free shapes fully working', () => {
		const editor = makeEditor({ textOptions: null })
		const id = createShapeId()
		// A geo shape with its default empty label never reaches the text stack.
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
		expect(editor.getShapePageBounds(id)).toMatchObject({ w: 100, h: 100 })
	})
})
