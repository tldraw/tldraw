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

describe('text measurement', () => {
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

	const getTextLinesOptions = {
		text: 'testing',
		width: 100,
		height: 1000,
		wrap: true,
		padding: 0,
		fontSize: 24,
		fontWeight: 'normal',
		fontFamily: 'var(--tl-font-draw)',
		fontStyle: 'normal',
		lineHeight: 1.35,
		textAlign: 'start' as 'start' | 'middle' | 'end',
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

		it('should get a single text line', async () => {
			await ui.app.setup()
			const lines = await browser.execute((options) => {
				return window.app.textMeasure.getTextLines({
					...options,
				})
			}, getTextLinesOptions)

			expect(lines).toEqual(['testing'])
		})

		it('should wrap a word when it has to', async () => {
			await ui.app.setup()
			const lines = await browser.execute((options) => {
				return window.app.textMeasure.getTextLines({
					...options,
					width: 50,
				})
			}, getTextLinesOptions)

			expect(lines).toEqual(['test', 'ing'])
		})

		it('should wrap between words when it has to', async () => {
			await ui.app.setup()
			const lines = await browser.execute((options) => {
				return window.app.textMeasure.getTextLines({
					...options,
					text: 'testing testing',
				})
			}, getTextLinesOptions)

			expect(lines).toEqual(['testing', 'testing'])
		})

		it('should strip whitespace at line breaks', async () => {
			await ui.app.setup()
			const lines = await browser.execute((options) => {
				return window.app.textMeasure.getTextLines({
					...options,
					text: 'testing  testing',
				})
			}, getTextLinesOptions)

			expect(lines).toEqual(['testing', 'testing'])
		})

		it('should strip whitespace at the end of wrapped lines', async () => {
			await ui.app.setup()
			const lines = await browser.execute((options) => {
				return window.app.textMeasure.getTextLines({
					...options,
					text: 'testing testing  ',
				})
			}, getTextLinesOptions)

			expect(lines).toEqual(['testing', 'testing'])
		})

		it('strips whitespace at the end of unwrapped lines', async () => {
			await ui.app.setup()
			const lines = await browser.execute((options) => {
				return window.app.textMeasure.getTextLines({
					...options,
					width: 200,
					text: 'testing testing  ',
				})
			}, getTextLinesOptions)

			expect(lines).toEqual(['testing testing'])
		})

		it('preserves whitespace at the start of an unwrapped line', async () => {
			await ui.app.setup()
			const lines = await browser.execute((options) => {
				return window.app.textMeasure.getTextLines({
					...options,
					width: 200,
					text: '  testing testing',
				})
			}, getTextLinesOptions)

			expect(lines).toEqual(['  testing testing'])
		})

		it('should place starting whitespace on its own line if it has to', async () => {
			await ui.app.setup()
			const lines = await browser.execute((options) => {
				return window.app.textMeasure.getTextLines({
					...options,
					text: '  testing testing',
				})
			}, getTextLinesOptions)

			expect(lines).toEqual(['', 'testing', 'testing'])
		})

		it('trims ending whitespace', async () => {
			await ui.app.setup()
			const lines = await browser.execute((options) => {
				return window.app.textMeasure.getTextLines({
					...options,
					text: 'testing testing                  ',
				})
			}, getTextLinesOptions)

			expect(lines).toEqual(['testing', 'testing'])
		})

		it('allows whitespace to cause breaks, however trims it at the end anyway', async () => {
			await ui.app.setup()
			const lines = await browser.execute((options) => {
				return window.app.textMeasure.getTextLines({
					...options,
					text: 'ok hi                  testing',
				})
			}, getTextLinesOptions)

			expect(lines).toEqual(['ok hi', 'testing'])
		})

		it('respects leading whitespace', async () => {
			await ui.app.setup()
			const lines = await browser.execute((options) => {
				return window.app.textMeasure.getTextLines({
					...options,
					text: '  ok hi testing  ',
				})
			}, getTextLinesOptions)

			expect(lines).toEqual(['  ok hi', 'testing'])
		})

		it('should handle multiline text', async () => {
			await ui.app.setup()
			const lines = await browser.execute((options) => {
				return window.app.textMeasure.getTextLines({
					...options,
					text: 'testing testing  ',
				})
			}, getTextLinesOptions)

			expect(lines).toEqual(['testing', 'testing'])
		})

		it('should break long strings of text', async () => {
			await ui.app.setup()
			const lines = await browser.execute((options) => {
				return window.app.textMeasure.getTextLines({
					...options,
					text: 'testingtestingtestingtestingtestingtesting',
				})
			}, getTextLinesOptions)

			expect(lines).toEqual(['testingt', 'estingte', 'stingtes', 'tingtest', 'ingtesti', 'ng'])
		})

		it('should return an empty array if the text is empty', async () => {
			await ui.app.setup()
			const lines = await browser.execute((options) => {
				return window.app.textMeasure.getTextLines({
					...options,
					text: '',
				})
			}, getTextLinesOptions)

			expect(lines).toEqual([])
		})
	})
})
