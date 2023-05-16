import { Box2dModel } from '@tldraw/editor'
import { runtime, ui } from '../helpers'
import { diffScreenshot, takeRegionScreenshot } from '../helpers/webdriver'
import { describe, env, it } from '../mocha-ext'

describe('text', () => {
	env(
		{
			// This can be removed once bugs resolved on mobile.
			// Tracked in <https://linear.app/tldraw/issue/TLD-1300/re-enable-text-rendering-tests-on-mobile>
			device: 'desktop',
		},
		() => {
			const tests = [
				{
					name: 'multiline (align center)',
					fails: true,
					handler: async () => {
						await ui.tools.click('select')
						await ui.tools.click('text')
						await ui.canvas.brush(100, 0, 150, 150)
						await browser.keys('testing\ntesting\n1, 2, 3')
					},
				},
				// {
				// 	name: 'diacritics (align center)',
				// 	fails: false,
				// 	handler: async () => {
				// 		await ui.tools.click('text')
				// 		await ui.canvas.brush(50, 100, 150, 150)
				// 		await browser.keys('âéīôù')
				// 	},
				// },
			]

			for (const test of tests) {
				const { name } = test
				const slugName = name.replace(/ /g, '-').replace(/[)(]/g, '')
				const prefix = [
					global.webdriverService,
					global.tldrawOptions.os,
					global.tldrawOptions.browser,
					global.tldrawOptions.ui,
					slugName,
				].join('-')

				const cleanUp = async () => {
					await ui.main.menu(['edit', 'select-all'])
					await ui.main.menu(['edit', 'delete'])
				}

				const testHandler = async () => {
					await ui.app.setup()
					await test.handler()

					await ui.main.menu(['edit', 'select-all'])
					const selectionBounds = await runtime.selectionBounds()
					await ui.main.menu(['edit', 'select-none'])

					const screenshotResults = await takeRegionScreenshot(selectionBounds, {
						writeTo: {
							path: `${__dirname}/../../screenshots/`,
							prefix,
						},
					})

					const { pxielDiff } = await diffScreenshot(screenshotResults, {
						writeTo: {
							path: `${__dirname}/../../screenshots/`,
							prefix,
						},
					})

					await cleanUp()
					expect(pxielDiff).toBeLessThan(70)
				}

				it[test.fails ? 'fails' : 'ok']('text: ' + test.name, testHandler)
			}
		}
	)
})

describe.only('text measurement', () => {
	const measureTextOptions = {
		text: 'testing',
		width: 'fit-content',
		fontFamily: 'var(--tl-font-draw)',
		fontSize: 24,
		lineHeight: 1.35,
		fontWeight: 'normal',
		fontStyle: 'normal',
		padding: '0px',
		maxWidth: 'auto',
	}

	const getTextSpansOptions = {
		text: 'testing',
		width: 100,
		height: 1000,
		wrap: 'wrap' as const,
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

		let currentLine = null
		let currentLineTop = null
		for (const span of spans) {
			if (currentLineTop !== span.box.y) {
				if (currentLine !== null) {
					lines.push(currentLine)
				}
				currentLine = []
				currentLineTop = span.box.y
			}
			currentLine.push([span.text, Math.round(span.box.x)])
		}

		if (currentLine !== null) {
			lines.push(currentLine)
		}

		return lines
	}

	env({}, () => {
		it('should measure text', async () => {
			await ui.app.setup()
			const { w, h } = await browser.execute((options) => {
				return window.app.textMeasure.measureText({
					...options,
				})
			}, measureTextOptions)

			expect(w).toBeCloseTo(85.828125, 1)
			expect(h).toBeCloseTo(32.3984375, 1)
		})

		it('should get a single text span', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.getTextSpans({
					...options,
				})
			}, getTextSpansOptions)

			expect(formatLines(spans)).toEqual([[['testing', 0]]])
		})

		it('should wrap a word when it has to', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.getTextSpans({
					...options,
					width: 50,
				})
			}, getTextSpansOptions)

			expect(formatLines(spans)).toEqual([[['test', 0]], [['ing', 0]]])
		})

		it('should wrap between words when it has to', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.getTextSpans({
					...options,
					text: 'testing testing',
				})
			}, getTextSpansOptions)

			expect(formatLines(spans)).toEqual([
				[
					['testing', 0],
					[' ', 86],
				],
				[['testing', 0]],
			])
		})

		it('should collapse whitespace at line breaks', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.getTextSpans({
					...options,
					text: 'testing   testing',
				})
			}, getTextSpansOptions)

			expect(formatLines(spans)).toEqual([
				[
					['testing', 0],
					['   ', 86],
				],
				[['testing', 0]],
			])
		})

		it('should collapse whitespace at the end of wrapped lines', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.getTextSpans({
					...options,
					text: 'testing testing   ',
				})
			}, getTextSpansOptions)

			expect(formatLines(spans)).toEqual([
				[
					['testing', 0],
					[' ', 86],
				],
				[
					['testing', 0],
					['   ', 86],
				],
			])
		})

		it('preserves whitespace at the end of unwrapped lines', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.getTextSpans({
					...options,
					width: 200,
					text: 'testing testing   ',
				})
			}, getTextSpansOptions)

			expect(formatLines(spans)).toEqual([
				[
					['testing', 0],
					[' ', 86],
					['testing', 94],
					['   ', 180],
				],
			])
		})

		it('preserves whitespace at the start of an unwrapped line', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.getTextSpans({
					...options,
					width: 200,
					text: '  testing testing',
				})
			}, getTextSpansOptions)

			expect(formatLines(spans)).toEqual([
				[
					['  ', 0],
					['testing', 16],
					[' ', 102],
					['testing', 111],
				],
			])
		})

		it('should place starting whitespace on its own line if it has to', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.getTextSpans({
					...options,
					text: '  testing testing',
				})
			}, getTextSpansOptions)

			expect(formatLines(spans)).toEqual([
				[['  ', 0]],
				[
					['testing', 0],
					[' ', 86],
				],
				[['testing', 0]],
			])
		})

		it('should handle multiline text', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.getTextSpans({
					...options,
					text: '   test\ning testing   \n  t',
				})
			}, getTextSpansOptions)

			expect(formatLines(spans)).toEqual([
				[
					['   ', 0],
					['test', 25],
					['\n', 73],
				],
				[
					['ing', 0],
					[' ', 38],
				],
				[
					['testing', 0],
					['   \n', 86],
				],
				[
					['  ', 0],
					['t', 16],
				],
			])
		})

		it('should break long strings of text', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.getTextSpans({
					...options,
					text: 'testingtestingtestingtestingtestingtesting',
				})
			}, getTextSpansOptions)

			expect(formatLines(spans)).toEqual([
				[['testingt', 0]],
				[['estingte', 0]],
				[['stingtes', 0]],
				[['tingtest', 0]],
				[['ingtesti', 0]],
				[['ng', 0]],
			])
		})

		it('should return an empty array if the text is empty', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.getTextSpans({
					...options,
					text: '',
				})
			}, getTextSpansOptions)

			expect(formatLines(spans)).toEqual([])
		})

		it('preserves emojis and other multi-byte characters', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.getTextSpans({
					...options,
					text: '且🎉é世🧦丕👩‍👩‍👧‍👧丗é🧦丘👩🏽‍❤️‍💋‍👨🏼🧦',
				})
			}, getTextSpansOptions)

			expect(formatLines(spans)).toEqual([
				[['且🎉é世', 0]],
				[['🧦丕👩‍👩‍👧‍👧丗', 0]],
				[['é🧦丘👩🏽‍❤️‍💋‍👨🏼', 0]],
				[['🧦', 0]],
			])
		})

		it('handles right-aligned text', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.getTextSpans({
					...options,
					text: 'this is some right aligned text',
					textAlign: 'end',
				})
			}, getTextSpansOptions)

			expect(formatLines(spans)).toEqual([
				[
					['this', 18],
					[' ', 64],
					['is', 72],
					[' ', 92],
				],
				[
					['some', 29],
					[' ', 92],
				],
				[
					['right', 31],
					[' ', 92],
				],
				[
					['aligned', 0],
					[' ', 92],
				],
				[['text', 50]],
			])
		})

		it('handles center-aligned text', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.getTextSpans({
					...options,
					text: 'center aligned 4 lyf',
					textAlign: 'middle',
				})
			}, getTextSpansOptions)

			expect(formatLines(spans)).toEqual([
				[
					['center', 7],
					[' ', 85],
				],
				[
					['aligned', 0],
					[' ', 92],
				],
				[
					['4', 22],
					[' ', 39],
					['lyf', 47],
				],
			])
		})
	})
})
