import { runtime, ui } from '../helpers'
import { describe, env, it } from '../mocha-ext'

describe('basic keyboard shortcuts', () => {
	env({ device: 'desktop' }, () => {
		// If this one works, the others will work as well.
		it('draw — D', async () => {
			await ui.app.setup()
			await browser.keys(['d'])
			await browser.waitUntil(async () => {
				return await runtime.isIn('draw.idle')
			})
		})

		// Tools
		it.todo('select — V', async () => {
			await ui.app.setup()
			await browser.keys(['v'])
		})

		it('draw — D', async () => {
			await ui.app.setup()
			await browser.keys(['d'])
			await browser.waitUntil(async () => {
				return await runtime.isIn('draw.idle')
			})
		})

		it('eraser — E', async () => {
			await ui.app.setup()
			await browser.keys(['e'])
			await browser.waitUntil(async () => {
				return await runtime.isIn('eraser.idle')
			})
		})

		it('hand — H', async () => {
			await ui.app.setup()
			await browser.keys(['h'])
			await browser.waitUntil(async () => {
				return await runtime.isIn('hand.idle')
			})
		})

		it('rectangle — R', async () => {
			await ui.app.setup()
			await browser.keys(['r'])
			await browser.waitUntil(async () => {
				return (
					(await runtime.isIn('geo.idle')) &&
					(await runtime.propsForNextShape()).geo === 'rectangle'
				)
			})
		})

		it('ellipse — O', async () => {
			await ui.app.setup()
			await browser.keys(['o'])
			await browser.waitUntil(async () => {
				return (
					(await runtime.isIn('geo.idle')) && (await runtime.propsForNextShape()).geo === 'ellipse'
				)
			})
		})

		it.fails('diamond — P', async () => {
			await ui.app.setup()
			await browser.keys(['p'])
			await browser.waitUntil(async () => {
				return (
					(await runtime.isIn('geo.idle')) && (await runtime.propsForNextShape()).geo === 'diamond'
				)
			})
		})

		it('arrow — A', async () => {
			await ui.app.setup()
			await browser.keys(['a'])
			await browser.waitUntil(async () => {
				return await runtime.isIn('arrow.idle')
			})
		})

		it('line — L', async () => {
			await ui.app.setup()
			await browser.keys(['l'])
			await browser.waitUntil(async () => {
				return await runtime.isIn('line.idle')
			})
		})

		it('text — T', async () => {
			await ui.app.setup()
			await browser.keys(['t'])
			await browser.waitUntil(async () => {
				return await runtime.isIn('text.idle')
			})
		})

		it('frame — F', async () => {
			await ui.app.setup()
			await browser.keys(['f'])
			await browser.waitUntil(async () => {
				return await runtime.isIn('frame.idle')
			})
		})

		it('sticky — N', async () => {
			await ui.app.setup()
			await browser.keys(['n'])
			await browser.waitUntil(async () => {
				return await runtime.isIn('note.idle')
			})
		})

		// View
		it.todo('zoom-in — ⌘+', () => {})
		it.todo('zoom-in — ⌘-', () => {})
		it.todo('zoom-in — ⌘0', () => {})
		it.todo('zoom-in — ⌘1', () => {})
		it.todo('zoom-in — ⌘2', () => {})
		it.todo('zoom-in — ⌘/', () => {})
		it.todo('zoom-in — ⌘.', () => {})
		it.todo("zoom-in — ⌘'", () => {})

		// Transform
		it.todo('flip-h — ⇧H', () => {})
		it.todo('flip-v — ⇧V', () => {})
		it.todo('lock/unlock — ⌘L', () => {})
		it.todo('move-to-front — ]', () => {})
		it.todo('move-forward — ⌥]', () => {})
		it.todo('move-backward — ⌥[', () => {})
		it.todo('move-to-back — [', () => {})
		it.todo('group — ⌘G', () => {})
		it.todo('ungroup — ⌘⇧G', () => {})

		// File
		it.todo('new-project — ⌘N', () => {})
		it.todo('open — ⌘O', () => {})
		it.todo('save — ⌘S', () => {})
		it.todo('save-as — ⌘⇧S', () => {})
		it.todo('upload-media — ⌘I', () => {})

		// Edit
		it.todo('undo — ⌘Z', () => {})
		it.todo('redo — ⌘⇧Z', () => {})
		it.todo('cut — ⌘X', () => {})
		it.todo('copy — ⌘C', () => {})
		it.todo('paste — ⌘V', () => {})
		it.todo('select-all — ⌘A', () => {})
		it.todo('delete — ⌫', () => {})
		it.todo('duplicate — ⌘D', () => {})
	})
})
