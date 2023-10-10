import test, { Page, expect } from '@playwright/test'
import { Box2dModel, Editor } from '@tldraw/tldraw'
import { setupPage } from '../shared-e2e'

export function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

const measureTextOptions = {
	maxWidth: null,
	fontFamily: 'var(--tl-font-draw)',
	fontSize: 24,
	lineHeight: 1.35,
	fontWeight: 'normal',
	fontStyle: 'normal',
	padding: '0px',
}

const measureTextSpansOptions = {
	width: 100,
	height: 1000,
	overflow: 'wrap' as const,
	padding: 0,
	fontSize: 24,
	fontWeight: 'normal',
	fontFamily: 'var(--tl-font-draw)',
	fontStyle: 'normal',
	lineHeight: 1.35,
	textAlign: 'start' as 'start' | 'middle' | 'end',
}

function formatLines(spans: { box: Box2dModel; text: string }[]) {
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

		expect(w).toBeCloseTo(85.828125, 0)
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
			{ text: string; box: Box2dModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) => editor.textMeasure.measureTextSpans('testing', options),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([['testing']])
	})

	test('should wrap a word when it has to', async () => {
		const spans = await page.evaluate<
			{ text: string; box: Box2dModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) => editor.textMeasure.measureTextSpans('testing', { ...options, width: 50 }),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([['test'], ['ing']])
	})

	test('should preserve whitespace at line breaks', async () => {
		const spans = await page.evaluate<
			{ text: string; box: Box2dModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) => editor.textMeasure.measureTextSpans('testing   testing', options),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([['testing', '   '], ['testing']])
	})

	test('should preserve whitespace at the end of wrapped lines', async () => {
		const spans = await page.evaluate<
			{ text: string; box: Box2dModel }[],
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
			{ text: string; box: Box2dModel }[],
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
			{ text: string; box: Box2dModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) =>
				editor.textMeasure.measureTextSpans('  testing testing', { ...options, width: 200 }),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([['  ', 'testing', ' ', 'testing']])
	})

	test('should place starting whitespace on its own line if it has to', async () => {
		const spans = await page.evaluate<
			{ text: string; box: Box2dModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) => editor.textMeasure.measureTextSpans('  testing testing', options),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([['  '], ['testing', ' '], ['testing']])
	})

	test('should handle multiline text', async () => {
		const spans = await page.evaluate<
			{ text: string; box: Box2dModel }[],
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
			{ text: string; box: Box2dModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) =>
				editor.textMeasure.measureTextSpans('testingtestingtestingtestingtestingtesting', options),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([
			['testingt'],
			['estingte'],
			['stingtes'],
			['tingtest'],
			['ingtesti'],
			['ng'],
		])
	})

	test('should return an empty array if the text is empty', async () => {
		const spans = await page.evaluate<
			{ text: string; box: Box2dModel }[],
			typeof measureTextSpansOptions
		>(async (options) => editor.textMeasure.measureTextSpans('', options), measureTextSpansOptions)

		expect(formatLines(spans)).toEqual([])
	})

	test('should handle trailing newlines', async () => {
		const spans = await page.evaluate<
			{ text: string; box: Box2dModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) => editor.textMeasure.measureTextSpans('hi\n\n\n', options),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([['hi', '\n'], [' \n'], [' \n'], [' ']])
	})

	test('should handle only newlines', async () => {
		const spans = await page.evaluate<
			{ text: string; box: Box2dModel }[],
			typeof measureTextSpansOptions
		>(
			async (options) => editor.textMeasure.measureTextSpans('\n\n\n', options),
			measureTextSpansOptions
		)

		expect(formatLines(spans)).toEqual([[' \n'], [' \n'], [' \n'], [' ']])
	})
})
