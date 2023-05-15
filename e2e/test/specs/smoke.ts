import { TLGeoShape } from '@tldraw/editor'
import { runtime, ui, util } from '../helpers'
import { describe, env, it } from '../mocha-ext'
import { SHAPES } from './constants'

describe('smoke', () => {
	env(
		{
			// FIXME
			skipBrowsers: ['firefox'],
		},
		() => {
			it('startup in correct state', async () => {
				await ui.app.setup()

				await ui.tools.click('rectangle')
				await ui.canvas.brush(110, 210, 160, 260)

				await browser.waitUntil(async () => {
					const isInGeoIdle = await browser.execute(() => window.app.isIn('select.idle'))
					return isInGeoIdle === true
				})
				expect(await browser.execute(() => window.app.isIn('select.idle'))).toBe(true)
				expect(await browser.execute(() => window.app.shapesArray.length)).toBe(1)
			})

			it('click/tap create/delete some shapes', async () => {
				await ui.app.setup()

				for (const shape of SHAPES) {
					await ui.tools.click(shape.tool)
					await ui.canvas.click(10, 10)
					await ui.tools.click(shape.tool)
					await ui.canvas.click(110, 210)
					await ui.tools.click(shape.tool)
					await ui.canvas.click(210, 310)

					const allShapes = await runtime.getAllShapes()
					expect(allShapes.length).toBe(3)
					expect(allShapes.every((s) => s.type === shape.type))

					await ui.main.menu(['edit', 'select-all'])
					await ui.main.menu(['edit', 'delete'])
				}
			})

			it('brush create/delete some shapes', async () => {
				await ui.app.setup()

				for (const shape of SHAPES) {
					await ui.tools.click(shape.tool)
					await ui.canvas.brush(10, 10, 60, 160)
					await ui.tools.click(shape.tool)
					await ui.canvas.brush(110, 210, 160, 260)
					await ui.tools.click(shape.tool)
					await ui.canvas.brush(210, 310, 260, 360)

					const allShapes = await runtime.getAllShapes()
					expect(allShapes.length).toBe(3)
					expect(allShapes.every((s) => s.type === shape.type))

					await ui.main.menu(['edit', 'select-all'])
					await ui.main.menu(['edit', 'delete'])
				}
				// -----------------------------

				// Text
				// await ui.tools.click('text')
				// // TODO: This fails if you don't hide the modal first
				// await ui.canvas.brush(10, 200, 250, 200)
				// await tldraw.app.activeInput()
				// await browser.keys("testing");

				// await ui.tools.click('text')
				// await ui.canvas.brush(10, 200, 250, 200)
				// await tldraw.app.activeInput()
				// await browser.keys("testing");

				// await ui.tools.click('text')
				// await ui.canvas.brush(10, 300, 250, 300)
				// await tldraw.app.activeInput()
				// await browser.keys("testing");

				// const allShapes = await runtime.getShapesOfType();
				// expect(allShapes.length).toBe(3)
				// expect(allShapes.every(s => s.type === 'text'));
				// expect(allShapes.every(s => s.props.text === 'testing'));

				// await cleanup();

				// // Note
				// await ui.tools.click('note')
				// await ui.canvas.click(100, 100)
				// await ui.tools.click('note')
				// await ui.canvas.click(210, 210)
				// await ui.tools.click('note')
				// await ui.canvas.click(310, 310)

				// for (const [index, [x, y]] of [
				// 	[70, 70],
				// 	[180, 180],
				// 	[280, 280],
				// ].entries()) {
				// 	// TODO: This only works if there is a small delay
				// 	await ui.canvas.doubleClick(x, y)
				// 	await browser.keys([`test${index}`])
				// 	await browser.action('key').down('\uE03D').down('\uE007').perform(true)
				// 	await util.sleep(20)
				// 	await browser.action('key').up('\uE007').up('\uE03D').perform(true)
				// }

				// const allNoteShapes = await runtime.getAllShapes()
				// expect(allNoteShapes.length).toBe(3)
				// expect(allNoteShapes.every((s) => s.type === 'note'))
				// expect(allNoteShapes[0].props.text).toBe('test0')
				// expect(allNoteShapes[1].props.text).toBe('test1')
				// expect(allNoteShapes[2].props.text).toBe('test2')

				// await ui.main.menu(['edit', 'select-all'])
				// await ui.main.menu(['edit', 'delete'])

				// Image
				// TODO

				// Frame
				// FIXME: Fails on mobile
				// await ui.tools.click('frame')
				// await ui.canvas.brush(10, 10, 60, 160)
				// await ui.tools.click('frame')
				// await ui.canvas.brush(110, 210, 160, 260)
				// await ui.tools.click('frame')
				// await ui.canvas.brush(210, 310, 260, 360)

				// await ui.canvas.doubleClick(10, 0)
				// await browser.keys([
				// 	'test1',
				// 	'\uE007', // ENTER
				// ])

				// await ui.canvas.doubleClick(110, 200)
				// await browser.keys([
				// 	'test2',
				// 	'\uE007', // ENTER
				// ])

				// await ui.canvas.doubleClick(210, 300)
				// await browser.keys([
				// 	'test3',
				// 	'\uE007', // ENTER
				// ])

				// const allShapes = await runtime.getAllShapes()
				// expect(allShapes.length).toBe(3)
				// expect(allShapes.every((s) => s.type === 'frame'))
				// expect(allShapes[0].props.name).toBe('test1')
				// expect(allShapes[1].props.name).toBe('test2')
				// expect(allShapes[2].props.name).toBe('test3')

				// await ui.main.menu(['edit', 'select-all'])
				// await ui.main.menu(['edit', 'delete'])
			})

			it.skip('[TODO] resize some shapes', async () => {
				await ui.app.setup()

				// await ui.canvas.brush(10, 10, 100, 100)

				for (const size of [30, 50, 70]) {
					await ui.tools.click('rectangle')
					await ui.canvas.brush(10, 10, 10 + size, 10 + size)

					await ui.main.menu(['edit', 'select-all'])

					const handle = await ui.canvas.selectionHandle('resize.bottom-right')
					await ui.canvas.dragBy(handle, 20, 20)

					const allShapes = (await runtime.getAllShapes()) as TLGeoShape[]
					expect(allShapes.length).toBe(1)
					expect(allShapes[0].props.w).toBe(size + 20)
					expect(allShapes[0].props.h).toBe(size + 20)

					await util.deleteAllShapesOnPage()
				}
			})

			// REMOTE:OK
			it.skip('[TODO] rotate some shapes', async () => {
				await ui.app.setup()

				for (const size of [70, 90, 100]) {
					await ui.tools.click('rectangle')
					await ui.canvas.brush(100, 120, 100 + size, 120 + size)

					await ui.main.menu(['edit', 'select-all'])

					const handle = await ui.canvas.selectionHandle('rotate.mobile', 'rotate.top-right')
					await ui.canvas.dragBy(handle, size / 2, size / 2)

					const allShapes = await runtime.getAllShapes()
					expect(allShapes.length).toBe(1)

					const rotation = allShapes[0].rotation

					// TODO: This isn't exact I assume because pixel issues with the DPR and webdriver
					expect(rotation > 0).toBe(true)

					await util.deleteAllShapesOnPage()
				}
			})

			// FIXME: Ok once resolved <https://linear.app/tldraw/issue/TLD-1290/clicking-with-the-selection-tools-creates-a-history-entry>
			it.skip('undo/redo', async () => {
				await ui.app.setup()

				await ui.tools.click('rectangle')
				await ui.canvas.brush(10, 10, 60, 60)

				await ui.tools.click('rectangle')
				await ui.canvas.brush(10, 110, 60, 160)

				await ui.tools.click('rectangle')
				await ui.canvas.brush(10, 210, 60, 260)

				expect((await runtime.getAllShapes()).length).toBe(3)

				await ui.main.click('undo')
				expect((await runtime.getAllShapes()).length).toBe(2)

				await ui.main.click('undo')
				expect((await runtime.getAllShapes()).length).toBe(1)

				await ui.main.click('undo')
				expect((await runtime.getAllShapes()).length).toBe(0)

				await ui.main.click('undo')
				expect((await runtime.getAllShapes()).length).toBe(0)

				await ui.main.click('redo')
				expect((await runtime.getAllShapes()).length).toBe(1)

				await ui.main.click('redo')
				expect((await runtime.getAllShapes()).length).toBe(2)

				await ui.main.click('redo')
				expect((await runtime.getAllShapes()).length).toBe(3)

				await ui.main.click('redo')
				expect((await runtime.getAllShapes()).length).toBe(3)
			})

			it.skip('reorder', async () => {
				await ui.app.setup()

				await ui.tools.click('rectangle')
				await ui.canvas.brush(10, 10, 60, 60)

				await ui.tools.click('rectangle')
				await ui.canvas.brush(30, 30, 80, 80)

				await ui.tools.click('rectangle')
				await ui.canvas.brush(50, 50, 100, 100)

				throw new Error('TODO: Not done yet')

				// await tldraw.canvas.contextMenu([x,y], ["reorder", "move-to-front"]);
				// // Assert order

				// await tldraw.canvas.contextMenu([x,y], ["reorder", "move-to-front"]);
				// // Assert order

				// await tldraw.canvas.contextMenu([x,y], ["reorder", "move-to-front"]);
				// // Assert order
			})

			it.skip('move page', async () => {
				await ui.app.setup()

				// await tldraw.main.pages.create()
				// await tldraw.main.pages.create()

				// const pages = await tldraw.app.getPages()

				await ui.tools.click('rectangle')
				await ui.canvas.brush(10, 10, 60, 60)

				await ui.tools.click('rectangle')
				await ui.canvas.brush(10, 10, 60, 60)

				await ui.tools.click('rectangle')
				await ui.canvas.brush(10, 10, 60, 60)
			})

			// REMOTE:OK
			it('group/ungroup', async () => {
				await ui.app.setup()

				await ui.tools.click('rectangle')
				await ui.canvas.brush(100, 100, 150, 150)
				await ui.tools.click('rectangle')
				await ui.canvas.brush(200, 200, 250, 250)
				await ui.tools.click('rectangle')
				await ui.canvas.brush(300, 300, 350, 350)

				await ui.main.menu(['edit', 'select-all'])
				await ui.main.menu(['edit', 'group'])

				const groupShapesBefore = await runtime.getShapesOfType('group')
				const geoShapesBefore = await runtime.getShapesOfType('geo')
				expect(groupShapesBefore.length).toBe(1)
				expect(geoShapesBefore.length).toBe(3)

				await ui.main.menu(['edit', 'select-all'])
				await ui.main.menu(['edit', 'ungroup'])

				const allShapes = await runtime.getAllShapes()
				const groupShapesAfter = allShapes.filter(
					(s) => s.typeName === 'shape' && s.type === 'group'
				)
				const geoShapesAfter = allShapes.filter((s) => s.typeName === 'shape' && s.type === 'geo')

				expect(groupShapesAfter.length).toBe(0)
				expect(geoShapesAfter.length).toBe(3)
			})
		}
	)
})
