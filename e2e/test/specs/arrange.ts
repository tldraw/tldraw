import { runtime, ui } from '../helpers'
import { describe, it } from '../mocha-ext'

const createShapes = async (pos0 = [20, 20], pos1 = [70, 70], pos2 = [120, 120]) => {
	const size = 30

	await ui.tools.click('rectangle')
	await ui.canvas.brush(pos0[0], pos0[1], pos0[0] + size, pos0[1] + size)

	await ui.tools.click('rectangle')
	await ui.canvas.brush(pos1[0], pos1[1], pos1[0] + size, pos1[1] + size)

	await ui.tools.click('rectangle')
	await ui.canvas.brush(pos2[0], pos2[1], pos2[0] + size, pos2[1] + size)

	return await runtime.getAllShapes()
}

const MODES = [/*'context', */ 'action']

describe('arrange', () => {
	describe('align-left', () => {
		for (const mode of MODES) {
			it(`${mode} menu`, async () => {
				await ui.app.setup()
				const origShapes = await createShapes()

				await ui.canvas.brush(10, 10, 170, 170)

				if (mode === 'context') {
					const point = await ui.app.pointWithinActiveArea(11, 11)
					await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'align-left'])
				} else if (mode === 'action') {
					await ui.main.actionMenu(['align-left'])
				}

				const shapes = await runtime.getAllShapes()
				expect(origShapes[0].x).toBe(shapes[0].x)
				expect(origShapes[0].x).toBe(shapes[1].x)
				expect(origShapes[0].x).toBe(shapes[2].x)
			})
		}
	})

	describe('align-center-horizontal', () => {
		for (const mode of MODES) {
			it(`${mode} menu`, async () => {
				await ui.app.setup()
				const origShapes = await createShapes()

				await ui.canvas.brush(10, 10, 170, 170)
				if (mode === 'context') {
					const point = await ui.app.pointWithinActiveArea(21, 21)
					await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'align-center-horizontal'])
				} else if (mode === 'action') {
					await ui.main.actionMenu(['align-center-horizontal'])
				}
				const shapes = await runtime.getAllShapes()
				expect(origShapes[1].x).toBe(shapes[0].x)
				expect(origShapes[1].x).toBe(shapes[1].x)
				expect(origShapes[1].x).toBe(shapes[2].x)
			})
		}
	})

	describe('align-right', () => {
		for (const mode of MODES) {
			it(`${mode} menu`, async () => {
				await ui.app.setup()
				const origShapes = await createShapes()

				await ui.canvas.brush(10, 10, 170, 170)
				if (mode === 'context') {
					const point = await ui.app.pointWithinActiveArea(21, 21)
					await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'align-right'])
				} else if (mode === 'action') {
					await ui.main.actionMenu(['align-right'])
				}

				const shapes = await runtime.getAllShapes()
				expect(origShapes[2].x).toBe(shapes[0].x)
				expect(origShapes[2].x).toBe(shapes[1].x)
				expect(origShapes[2].x).toBe(shapes[2].x)
			})
		}
	})

	describe('align-top', () => {
		for (const mode of MODES) {
			it(`${mode} menu`, async () => {
				await ui.app.setup()
				const origShapes = await createShapes()

				await ui.canvas.brush(10, 10, 170, 170)
				if (mode === 'context') {
					const point = await ui.app.pointWithinActiveArea(21, 21)
					await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'align-top'])
				} else if (mode === 'action') {
					await ui.main.actionMenu(['align-top'])
				}

				const shapes = await runtime.getAllShapes()
				expect(origShapes[0].y).toBe(shapes[0].y)
				expect(origShapes[0].y).toBe(shapes[1].y)
				expect(origShapes[0].y).toBe(shapes[2].y)
			})
		}
	})

	describe('align-center-vertical', () => {
		for (const mode of MODES) {
			it(`${mode} menu`, async () => {
				await ui.app.setup()
				const origShapes = await createShapes()

				await ui.canvas.brush(10, 10, 170, 170)
				if (mode === 'context') {
					const point = await ui.app.pointWithinActiveArea(21, 21)
					await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'align-center-vertical'])
				} else if (mode === 'action') {
					await ui.main.actionMenu(['align-center-vertical'])
				}

				const shapes = await runtime.getAllShapes()
				expect(origShapes[1].y).toBe(shapes[0].y)
				expect(origShapes[1].y).toBe(shapes[1].y)
				expect(origShapes[1].y).toBe(shapes[2].y)
			})
		}
	})

	describe('align-bottom', () => {
		for (const mode of MODES) {
			it(`${mode} menu`, async () => {
				await ui.app.setup()
				const origShapes = await createShapes()

				await ui.canvas.brush(10, 10, 170, 170)
				await ui.app.pointWithinActiveArea(11, 11)
				if (mode === 'context') {
					const point = await ui.app.pointWithinActiveArea(11, 11)
					await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'align-bottom'])
				} else if (mode === 'action') {
					await ui.main.actionMenu(['align-bottom'])
				}

				const shapes = await runtime.getAllShapes()
				expect(origShapes[2].y).toBe(shapes[0].y)
				expect(origShapes[2].y).toBe(shapes[1].y)
				expect(origShapes[2].y).toBe(shapes[2].y)
			})
		}
	})

	describe('distribute-horizontal', () => {
		for (const mode of MODES) {
			const createHorzShapes = async () => {
				await ui.tools.click('rectangle')
				await ui.canvas.brush(20, 20, 50, 50)

				await ui.tools.click('rectangle')
				await ui.canvas.brush(90, 70, 120, 100)

				await ui.tools.click('rectangle')
				await ui.canvas.brush(120, 120, 150, 150)

				return await runtime.getAllShapes()
			}

			it(`${mode} menu`, async () => {
				await ui.app.setup()
				const origShapes = await createHorzShapes()

				await ui.canvas.brush(10, 10, 170, 170)
				if (mode === 'context') {
					const point = await ui.app.pointWithinActiveArea(21, 21)
					await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'distribute-horizontal'])
				} else if (mode === 'action') {
					await ui.main.actionMenu(['distribute-horizontal'])
				}

				const shapes = await runtime.getAllShapes()
				expect(origShapes[0].x).toBe(shapes[0].x)
				expect(origShapes[0].x + 50).toBe(shapes[1].x)
				expect(origShapes[0].x + 100).toBe(shapes[2].x)
			})
		}
	})

	describe('distribute-vertical', () => {
		for (const mode of MODES) {
			const createVertShapes = async () => {
				await ui.tools.click('rectangle')
				await ui.canvas.brush(20, 20, 50, 50)

				await ui.tools.click('rectangle')
				await ui.canvas.brush(70, 90, 100, 120)

				await ui.tools.click('rectangle')
				await ui.canvas.brush(120, 120, 150, 150)

				return await runtime.getAllShapes()
			}

			it(`${mode} menu`, async () => {
				await ui.app.setup()
				const origShapes = await createVertShapes()

				await ui.canvas.brush(10, 10, 170, 170)

				if (mode === 'context') {
					const point = await ui.app.pointWithinActiveArea(21, 21)
					await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'distribute-vertical'])
				} else if (mode === 'action') {
					await ui.main.actionMenu(['distribute-vertical'])
				}

				const shapes = await runtime.getAllShapes()
				expect(origShapes[0].x).toBe(shapes[0].x)
				expect(origShapes[0].x + 50).toBe(shapes[1].x)
				expect(origShapes[0].x + 100).toBe(shapes[2].x)
			})
		}
	})

	describe('stretch-horizontal', () => {
		for (const mode of MODES) {
			it(`${mode} menu`, async () => {
				await ui.app.setup()
				await createShapes()

				await ui.canvas.brush(10, 10, 170, 170)
				if (mode === 'context') {
					const point = await ui.app.pointWithinActiveArea(21, 21)
					await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'stretch-horizontal'])
				} else if (mode === 'action') {
					await ui.main.actionMenu(['stretch-horizontal'])
				}

				const shapes = await runtime.getAllShapes()
				expect(shapes[0].props).toHaveProperty('w', 130)
				expect(shapes[1].props).toHaveProperty('w', 130)
				expect(shapes[2].props).toHaveProperty('w', 130)
			})
		}
	})

	describe('stretch-vertical', () => {
		for (const mode of MODES) {
			it(`${mode} menu`, async () => {
				await ui.app.setup()
				await createShapes()

				await ui.canvas.brush(10, 10, 170, 170)
				if (mode === 'context') {
					const point = await ui.app.pointWithinActiveArea(21, 21)
					await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'stretch-vertical'])
				} else if (mode === 'action') {
					await ui.main.actionMenu(['stretch-vertical'])
				}

				const shapes = await runtime.getAllShapes()
				expect(shapes[0].props).toHaveProperty('h', 130)
				expect(shapes[1].props).toHaveProperty('h', 130)
				expect(shapes[2].props).toHaveProperty('h', 130)
			})
		}
	})

	// describe('flip-horizontal', () => {
	// 	for (const mode of ['context']) {
	// 		it(`${mode} menu`, async () => {
	// 			await ui.app.setup()
	// 			const origShapes = await createShapes()

	// 			// TODO: Move back to front
	// 			await ui.canvas.brush(0, 0, 150, 150)
	// 			const point = await ui.app.pointWithinActiveArea(11, 11)
	// 			if (mode === 'context') {
	// 				const point = await ui.app.pointWithinActiveArea(11, 11)
	// 				await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'flip-horizontal'])
	// 			} else if (mode === 'action') {
	// 				await ui.main.actionMenu(['flip-horizontal'])
	// 			}

	// 			const shapes = await runtime.getAllShapes()
	// 			expect(shapes[0].x).toBe(origShapes[2].x)
	// 			expect(shapes[1].x).toBe(origShapes[1].x)
	// 			expect(shapes[2].x).toBe(origShapes[0].x)
	// 		})
	// 	}
	// })

	// describe('flip-vertical', () => {
	// 	for (const mode of ['context']) {
	// 		it(`${mode} menu`, async () => {
	// 			await ui.app.setup()
	// 			const origShapes = await createShapes()

	// 			// TODO: Move back to front
	// 			await ui.canvas.brush(0, 0, 150, 150)
	// 			const point = await ui.app.pointWithinActiveArea(11, 11)
	// 			if (mode === 'context') {
	// 				const point = await ui.app.pointWithinActiveArea(11, 11)
	// 				await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'flip-vertical'])
	// 			} else if (mode === 'action') {
	// 				await ui.main.actionMenu(['flip-vertical'])
	// 			}

	// 			const shapes = await runtime.getAllShapes()
	// 			expect(shapes[0].y).toBe(origShapes[2].y)
	// 			expect(shapes[1].y).toBe(origShapes[1].y)
	// 			expect(shapes[2].y).toBe(origShapes[0].y)
	// 		})
	// 	}
	// })

	// describe('pack', () => {
	// 	for (const mode of ['context']) {
	// 		it(`${mode} menu`, async () => {
	// 			await ui.app.setup()
	// 			const origShapes = await createShapes()

	// 			// TODO: Move back to front
	// 			await ui.canvas.brush(0, 0, 150, 150)
	// 			const point = await ui.app.pointWithinActiveArea(11, 11)
	// 			if (mode === 'context') {
	// 				const point = await ui.app.pointWithinActiveArea(11, 11)
	// 				await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'pack'])
	// 			} else if (mode === 'action') {
	// 				await ui.main.actionMenu(['pack'])
	// 			}

	// 			const shapes = await runtime.getAllShapes()
	// 			expect(shapes.length).toBe(3)
	// 			expect(shapes[0].x).toBe(339)
	// 			expect(shapes[0].y).toBe(122)
	// 			expect(shapes[1].x).toBe(385)
	// 			expect(shapes[1].y).toBe(122)
	// 			expect(shapes[2].x).toBe(431)
	// 			expect(shapes[2].y).toBe(122)
	// 		})
	// 	}
	// })

	// describe('stack-vertical', () => {
	// 	for (const mode of MODES) {
	// 		it(`${mode} menu`, async () => {
	// 			await ui.app.setup()
	// 			const origShapes = await createShapes([10, 10], [60, 16], [110, 24])

	// 			await ui.canvas.brush(0, 0, 150, 150)
	// 			if (mode === 'context') {
	// 				const point = await ui.app.pointWithinActiveArea(11, 11)
	// 				await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'stack-vertical'])
	// 			} else if (mode === 'action') {
	// 				await ui.main.actionMenu(['stack-vertical'])
	// 			}

	// 			const shapes = await runtime.getAllShapes()
	// 			console.log(shapes)
	// 			expect(shapes[0].y).toBe(72)
	// 			expect(shapes[1].y).toBe(102)
	// 			expect(shapes[2].y).toBe(132)
	// 		})
	// 	}
	// })

	// describe('stack-horizontal', () => {
	// 	for (const mode of MODES) {
	// 		it(`${mode} menu`, async () => {
	// 			await ui.app.setup()
	// 			const origShapes = await createShapes([10, 10], [16, 60], [24, 110])

	// 			await ui.canvas.brush(0, 0, 150, 150)
	// 			if (mode === 'context') {
	// 				const point = await ui.app.pointWithinActiveArea(11, 11)
	// 				await ui.canvas.contextMenu(point.x, point.y, ['arrange', 'stack-horizontal'])
	// 			} else if (mode === 'action') {
	// 				await ui.main.actionMenu(['stack-horizontal'])
	// 			}

	// 			const shapes = await runtime.getAllShapes()
	// 			console.log(shapes)
	// 			expect(shapes[0].x).toBe(335)
	// 			expect(shapes[1].x).toBe(365)
	// 			expect(shapes[2].x).toBe(395)
	// 		})
	// 	}
	// })
})
