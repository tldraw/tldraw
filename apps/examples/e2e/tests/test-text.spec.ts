import test, { Page, expect } from '@playwright/test'
import {
	BoxModel,
	Editor,
	TLMeasureTextOpts,
	TLMeasureTextSpanOpts,
	TLNoteShape,
	TLShapeId,
} from 'tldraw'
import { EndToEndApi } from '../../src/misc/EndToEndApi'
import { setupPage } from '../shared-e2e'

declare const tldrawApi: EndToEndApi

const measureTextOptions: TLMeasureTextOpts = {
	fontFamily: 'var(--tl-font-draw)',
	fontSize: 24,
	lineHeight: 1.35,
	fontWeight: 'normal',
	fontStyle: 'normal',
	padding: '0px',
	maxWidth: null,
}

const measureTextSpansOptions: TLMeasureTextSpanOpts = {
	fontFamily: 'var(--tl-font-draw)',
	fontSize: 24,
	lineHeight: 1.35,
	fontWeight: 'normal',
	fontStyle: 'normal',
	padding: 0,
	width: 100,
	height: 1000,
	overflow: 'wrap' as const,
	textAlign: 'start' as 'start' | 'middle' | 'end',
}

function formatLines(spans: { box: BoxModel; text: string }[]) {
	const lines = []

	let currentLine: string[] | null = null
	let currentLineTop = null
	for (const span of spans) {
		if (currentLineTop !== span.box.y) {
			if (currentLine !== null) {
				lines.push(currentLine)
			}
			currentLine = []
			currentLineTop = span.box.y
		}
		currentLine!.push(span.text)
	}

	if (currentLine !== null) {
		lines.push(currentLine)
	}

	return lines
}

declare const editor: Editor
let page: Page

test.describe('text measurement', () => {
	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage()
		await setupPage(page)
	})

	test('measures text', async () => {
		const { w, h } = await page.evaluate<{ w: number; h: number }, typeof measureTextOptions>(
			async (options) => editor.textMeasure.measureText('testing', options),
			measureTextOptions
		)

		// works on github actions
		expect(w).toBeCloseTo(87, 0)
		expect(h).toBeCloseTo(32.3984375, 0)
	})

	// The text-measurement tests below this point aren't super useful any
	// more. They were added when we had a different approach to text SVG
	// exports (trying to replicate browser decisions with our own code) to
	// what we do now (letting the browser make those decisions then
	// measuring the results).
	//
	// It's hard to write better tests here (e.g. ones where we actually
	// look at the measured values) because the specifics of text layout
	// vary from browser to browser. The ideal thing would be to replace
	// these with visual regression tests for text SVG exports, but we don't
	// have a way of doing visual regression testing right now.

	test('should get a single text span', async () => {
		const spans = await page.evaluate<
			{ text: string; box: BoxModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) => editor.textMeasure.measureTextSpans('testing', options),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([['testing']])
	})

	test('should wrap a word when it has to', async () => {
		const spans = await page.evaluate<
			{ text: string; box: BoxModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) => editor.textMeasure.measureTextSpans('testing', { ...options, width: 50 }),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([['tes'], ['ting']])
	})

	test('should preserve whitespace at line breaks', async () => {
		const spans = await page.evaluate<
			{ text: string; box: BoxModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) => editor.textMeasure.measureTextSpans('testing   testing', options),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([['testing', '   '], ['testing']])
	})

	test('should preserve whitespace at the end of wrapped lines', async () => {
		const spans = await page.evaluate<
			{ text: string; box: BoxModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) => editor.textMeasure.measureTextSpans('testing testing   ', options),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([
			['testing', ' '],
			['testing', '   '],
		])
	})

	test('preserves whitespace at the end of unwrapped lines', async () => {
		const spans = await page.evaluate<
			{ text: string; box: BoxModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) =>
				editor.textMeasure.measureTextSpans('testing testing   ', { ...options, width: 200 }),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([['testing', ' ', 'testing', '   ']])
	})

	test('preserves whitespace at the start of an unwrapped line', async () => {
		const spans = await page.evaluate<
			{ text: string; box: BoxModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) =>
				editor.textMeasure.measureTextSpans('  testing testing', { ...options, width: 200 }),
			measureTextSpansOptions
		)

		expect(formatLines(spans)[0]?.[0]).toEqual('  ')
	})

	test('should place starting whitespace on its own line if it has to', async () => {
		const spans = await page.evaluate<
			{ text: string; box: BoxModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) => editor.textMeasure.measureTextSpans('  testing testing', options),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([['  '], ['testing', ' '], ['testing']])
	})

	test('should handle multiline text', async () => {
		const spans = await page.evaluate<
			{ text: string; box: BoxModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) =>
				editor.textMeasure.measureTextSpans('   test\ning testing   \n  t', options),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([
			['   ', 'test', '\n'],
			['ing', ' '],
			['testing', '   \n'],
			['  ', 't'],
		])
	})

	test('should break long strings of text', async () => {
		const spans = await page.evaluate<
			{ text: string; box: BoxModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) =>
				editor.textMeasure.measureTextSpans('testingtestingtestingtestingtestingtesting', options),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([
			['testingt'],
			['estingt'],
			['estingt'],
			['estingt'],
			['estingt'],
			['esting'],
		])
	})

	test('should return an empty array if the text is empty', async () => {
		const spans = await page.evaluate<
			{ text: string; box: BoxModel }[],
			typeof measureTextSpansOptions
		>(async (options) => editor.textMeasure.measureTextSpans('', options), measureTextSpansOptions)

		expect(formatLines(spans)).toEqual([])
	})

	test('should handle trailing newlines', async () => {
		const spans = await page.evaluate<
			{ text: string; box: BoxModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) => editor.textMeasure.measureTextSpans('hi\n\n\n', options),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([['hi', '\n'], [' \n'], [' \n'], [' ']])
	})

	test('should handle only newlines', async () => {
		const spans = await page.evaluate<
			{ text: string; box: BoxModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) => editor.textMeasure.measureTextSpans('\n\n\n', options),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([[' \n'], [' \n'], [' \n'], [' ']])
	})

	test('for auto-font-sizing shapes, should do normal font size for text that does not have long words', async () => {
		const shape = await page.evaluate(() => {
			const id = 'shape:testShape' as TLShapeId
			editor.createShapes<TLNoteShape>([
				{
					id,
					type: 'note',
					x: 0,
					y: 0,
					props: {
						richText: tldrawApi.toRichText('this is just some regular text'),
						size: 'xl',
					},
				},
			])

			return editor.getShape(id) as TLNoteShape
		})

		expect(shape.props.fontSizeAdjustment).toEqual(32)
	})

	test('for auto-font-sizing shapes, should auto-size text that have slightly long words', async () => {
		const shape = await page.evaluate(() => {
			const id = 'shape:testShape' as TLShapeId
			editor.createShapes<TLNoteShape>([
				{
					id,
					type: 'note',
					x: 0,
					y: 0,
					props: {
						richText: tldrawApi.toRichText('Amsterdam'),
						size: 'xl',
					},
				},
			])

			return editor.getShape(id) as TLNoteShape
		})

		expect(shape.props.fontSizeAdjustment).toEqual(27)
	})

	test('for auto-font-sizing shapes, should auto-size text that have long words', async () => {
		const shape = await page.evaluate(() => {
			const id = 'shape:testShape' as TLShapeId
			editor.createShapes<TLNoteShape>([
				{
					id,
					type: 'note',
					x: 0,
					y: 0,
					props: {
						richText: tldrawApi.toRichText('this is a tentoonstelling'),
						size: 'xl',
					},
				},
			])

			return editor.getShape(id) as TLNoteShape
		})

		expect(shape.props.fontSizeAdjustment).toEqual(20)
	})

	test('for auto-font-sizing shapes, should wrap text that has words that are way too long', async () => {
		const shape = await page.evaluate(() => {
			const id = 'shape:testShape' as TLShapeId
			editor.createShapes<TLNoteShape>([
				{
					id,
					type: 'note',
					x: 0,
					y: 0,
					props: {
						richText: tldrawApi.toRichText(
							'a very long dutch word like ziekenhuisinrichtingsmaatschappij'
						),
						size: 'xl',
					},
				},
			])

			return editor.getShape(id) as TLNoteShape
		})

		expect(shape.props.fontSizeAdjustment).toEqual(14)
	})

	test('should use custom renderMethod for text measurement', async () => {
		const { w, h } = await page.evaluate<{ w: number; h: number }, typeof measureTextOptions>(
			async (options) => {
				return editor.textMeasure.measureHtml(`<div><strong>HELLO WORLD</strong></div>`, options)
			},
			measureTextOptions
		)

		// Assuming the custom render method affects the width and height
		// Adjust these expected values based on how renderMethod is supposed to affect the output
		// Works on github actions, annoyingly
		expect(w).toBeGreaterThanOrEqual(165)
		expect(w).toBeLessThanOrEqual(167)
		expect(h).toBeCloseTo(32.390625, 0)
	})

	test('element should have no leftover properties', async () => {
		const measure = page.locator('div.tl-text-measure')

		await page.evaluate<{ w: number; h: number }, typeof measureTextOptions>(async (options) => {
			return editor.textMeasure.measureHtml(`<div><strong>HELLO WORLD</strong></div>`, options)
		}, measureTextOptions)

		const firstStyle = (await measure.getAttribute('style')) ?? ''

		expect(await measure.getAttribute('style')).toMatch(firstStyle)

		await page.evaluate(() => {
			const id = 'shape:testShape' as TLShapeId
			editor.createShapes<TLNoteShape>([
				{
					id,
					type: 'note',
					x: 0,
					y: 0,
					props: {
						richText: tldrawApi.toRichText(
							'a very long dutch word like ziekenhuisinrichtingsmaatschappij'
						),
						size: 'xl',
					},
				},
			])
		})

		await page.evaluate<{ w: number; h: number }, typeof measureTextOptions>(async (options) => {
			return editor.textMeasure.measureHtml(`<div><strong>HELLO WORLD</strong></div>`, options)
		}, measureTextOptions)

		expect(await page.locator('div.tl-text-measure').getAttribute('style')).toMatch(firstStyle)
	})
})
