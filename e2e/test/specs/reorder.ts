import { runtime, ui } from '../helpers'
import { app } from '../helpers/ui'
import { describe, it } from '../mocha-ext'

const sortByIndex = (a, b) => {
	if (a.index < b.index) {
		return -1
	} else if (a.index > b.index) {
		return 1
	}
	return 0
}

describe('reorder', () => {
	const createShapes = async () => {
		await ui.tools.click('rectangle')
		await ui.canvas.brush(10, 10, 60, 60)

		await ui.tools.click('rectangle')
		await ui.canvas.brush(30, 30, 80, 80)

		await ui.tools.click('rectangle')
		await ui.canvas.brush(50, 50, 100, 100)

		return (await runtime.getAllShapes()).sort(sortByIndex).map((s) => s.id)
	}

	const MODES = [/*'context', */ 'action']

	describe('bring-to-front', () => {
		for (const mode of MODES) {
			it(`${mode} menu`, async () => {
				await ui.app.setup()
				const ids = await createShapes()

				// TODO: Move back to front
				await ui.canvas.click(11, 11)
				const point = await app.pointWithinActiveArea(11, 11)

				if (mode === 'action') {
					await ui.main.actionMenu(['bring-to-front'])
				} else if (mode === 'context') {
					await ui.canvas.contextMenu(point.x, point.y, ['reorder', 'bring-to-front'])
				}

				const shapes = (await runtime.getAllShapes()).sort(sortByIndex)
				expect(shapes[0].id).toBe(ids[1])
				expect(shapes[1].id).toBe(ids[2])
				expect(shapes[2].id).toBe(ids[0])
			})
		}
	})

	describe('bring-forward', () => {
		for (const mode of MODES) {
			it(`${mode} menu`, async () => {
				await ui.app.setup()
				const ids = await createShapes()

				// TODO: Move back to front
				await ui.canvas.click(11, 11)
				const point = await app.pointWithinActiveArea(11, 11)
				if (mode === 'action') {
					await ui.main.actionMenu(['bring-forward'])
				} else if (mode === 'context') {
					await ui.canvas.contextMenu(point.x, point.y, ['reorder', 'bring-forward'])
				}

				const shapes = (await runtime.getAllShapes()).sort(sortByIndex)
				expect(shapes[0].id).toBe(ids[1])
				expect(shapes[1].id).toBe(ids[0])
				expect(shapes[2].id).toBe(ids[2])
			})
		}
	})

	describe('send-backward', () => {
		for (const mode of MODES) {
			it(`${mode} menu`, async () => {
				await ui.app.setup()
				const ids = await createShapes()

				// TODO: Move back to front
				await ui.canvas.click(51, 51)
				const point = await app.pointWithinActiveArea(51, 51)
				if (mode === 'action') {
					await ui.main.actionMenu(['send-backward'])
				} else if (mode === 'context') {
					await ui.canvas.contextMenu(point.x, point.y, ['reorder', 'send-backward'])
				}

				const shapes = (await runtime.getAllShapes()).sort(sortByIndex)
				expect(shapes[0].id).toBe(ids[0])
				expect(shapes[1].id).toBe(ids[2])
				expect(shapes[2].id).toBe(ids[1])
			})
		}
	})

	describe('send-to-back', () => {
		for (const mode of MODES) {
			it(`${mode} menu`, async () => {
				await ui.app.setup()
				const ids = await createShapes()

				// TODO: Move back to front
				await ui.canvas.click(51, 51)
				const point = await app.pointWithinActiveArea(51, 51)
				if (mode === 'action') {
					await ui.main.actionMenu(['send-to-back'])
				} else if (mode === 'context') {
					await ui.canvas.contextMenu(point.x, point.y, ['reorder', 'send-to-back'])
				}

				const shapes = (await runtime.getAllShapes()).sort(sortByIndex)
				expect(shapes[0].id).toBe(ids[2])
				expect(shapes[1].id).toBe(ids[0])
				expect(shapes[2].id).toBe(ids[1])
			})
		}
	})
})
