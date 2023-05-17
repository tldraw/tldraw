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
					fails: false,
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

describe('text measurement', () => {
	const measureTextOptions = {
		width: 'fit-content',
		fontFamily: 'var(--tl-font-draw)',
		fontSize: 24,
		lineHeight: 1.35,
		fontWeight: 'normal',
		fontStyle: 'normal',
		padding: '0px',
		maxWidth: 'auto',
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
			currentLine.push(span.text)
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
				return window.app.textMeasure.measureText('testing', options)
			}, measureTextOptions)

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

		it('should get a single text span', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.measureTextSpans('testing', options)
			}, measureTextSpansOptions)

			expect(formatLines(spans)).toEqual([['testing']])
		})

		it('should wrap a word when it has to', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.measureTextSpans('testing', { ...options, width: 50 })
			}, measureTextSpansOptions)

			expect(formatLines(spans)).toEqual([['test'], ['ing']])
		})

		it('should wrap between words when it has to', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.measureTextSpans('testing testing', options)
			}, measureTextSpansOptions)

			expect(formatLines(spans)).toEqual([['testing', ' '], ['testing']])
		})

		it('should preserve whitespace at line breaks', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.measureTextSpans('testing   testing', options)
			}, measureTextSpansOptions)

			expect(formatLines(spans)).toEqual([['testing', '   '], ['testing']])
		})

		it('should preserve whitespace at the end of wrapped lines', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.measureTextSpans('testing testing   ', options)
			}, measureTextSpansOptions)

			expect(formatLines(spans)).toEqual([
				['testing', ' '],
				['testing', '   '],
			])
		})

		it('preserves whitespace at the end of unwrapped lines', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.measureTextSpans('testing testing   ', {
					...options,
					width: 200,
				})
			}, measureTextSpansOptions)

			expect(formatLines(spans)).toEqual([['testing', ' ', 'testing', '   ']])
		})

		it('preserves whitespace at the start of an unwrapped line', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.measureTextSpans('  testing testing', {
					...options,
					width: 200,
				})
			}, measureTextSpansOptions)

			expect(formatLines(spans)).toEqual([['  ', 'testing', ' ', 'testing']])
		})

		it('should place starting whitespace on its own line if it has to', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.measureTextSpans('  testing testing', options)
			}, measureTextSpansOptions)

			expect(formatLines(spans)).toEqual([['  '], ['testing', ' '], ['testing']])
		})

		it('should handle multiline text', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.measureTextSpans('   test\ning testing   \n  t', options)
			}, measureTextSpansOptions)

			expect(formatLines(spans)).toEqual([
				['   ', 'test', '\n'],
				['ing', ' '],
				['testing', '   \n'],
				['  ', 't'],
			])
		})

		it('should break long strings of text', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.measureTextSpans(
					'testingtestingtestingtestingtestingtesting',
					options
				)
			}, measureTextSpansOptions)

			expect(formatLines(spans)).toEqual([
				['testingt'],
				['estingte'],
				['stingtes'],
				['tingtest'],
				['ingtesti'],
				['ng'],
			])
		})

		it('should return an empty array if the text is empty', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.measureTextSpans('', options)
			}, measureTextSpansOptions)

			expect(formatLines(spans)).toEqual([])
		})

		it('preserves emojis and other multi-byte characters', async () => {
			await ui.app.setup()
			const spans = await browser.execute((options) => {
				return window.app.textMeasure.measureTextSpans('且🎉é世🧦丕👩‍👩‍👧‍👧丗é🧦丘👩🏽‍❤️‍💋‍👨🏼🧦', options)
			}, measureTextSpansOptions)

			const { tldrawOptions } = global as any
			const expectedResult =
				tldrawOptions.os === 'linux'
					? [['且🎉é世'], ['🧦丕👩‍👩‍👧‍👧'], ['丗é🧦丘'], ['👩🏽‍❤️‍💋‍👨🏼🧦']]
					: [['且🎉é世'], ['🧦丕👩‍👩‍👧‍👧丗'], ['é🧦丘👩🏽‍❤️‍💋‍👨🏼'], ['🧦']]

			expect(formatLines(spans)).toEqual(expectedResult)
		})
	})
})
