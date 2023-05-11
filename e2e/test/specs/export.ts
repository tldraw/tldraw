import { runtime, ui, util } from '../helpers'
import { describe, env, it } from '../mocha-ext'

describe('export', () => {
	before(async () => {
		await ui.app.open()
	})

	const createShape = async () => {
		await ui.tools.click('text')
		await ui.canvas.brush(70, 200, 250, 200)
		await browser.keys('testing')
	}

	describe.skip('export-as', () => {
		for (const mode of ['main' /*, 'context'*/]) {
			describe(`${mode} menu`, () => {
				env(
					// It turns out we can't grab the file on mobile devices... urgh!
					{
						device: 'desktop',
						skipBrowsers: ['firefox'],
					},
					() => {
						const fileNameFromShape = async (shape) => {
							return await browser.execute((shapeId) => {
								return window.app.getShapeById(shapeId)?.id.replace(/:/, '_')
							}, shape.id)
						}

						it('svg', async () => {
							await util.grantPermissions(['clipboard-read'])
							await util.clearClipboard()
							await ui.app.setup()
							await createShape()

							if (mode === 'context') {
								await ui.canvas.contextMenu(100, 120, ['export-as', 'export-as-svg'])
							} else if (mode === 'main') {
								await ui.main.menu(['edit', 'export-as', 'export-as-svg'])
							}

							// FIXME: This shouldn't be a timer... but what to do???
							await browser.execute(() => new Promise((resolve) => setTimeout(resolve, 3000)))
							const allShapes = await runtime.getAllShapes()
							const fileName = await fileNameFromShape(allShapes[0])
							const file = await util.getDownloadFile(fileName + '.svg')

							// TODO: Also check the buffer is correct here...
							expect(file).toExist()
						})

						it('png', async () => {
							await util.grantPermissions(['clipboard-read'])
							await util.clearClipboard()
							await ui.app.setup()
							await createShape()

							if (mode === 'context') {
								await ui.canvas.contextMenu(100, 120, ['export-as', 'export-as-png'])
							} else if (mode === 'main') {
								await ui.main.menu(['edit', 'export-as', 'export-as-png'])
							}

							// FIXME: This shouldn't be a timer... but what to do???
							await browser.execute(() => new Promise((resolve) => setTimeout(resolve, 3000)))
							const allShapes = await runtime.getAllShapes()
							const fileName = await fileNameFromShape(allShapes[0])
							const file = await util.getDownloadFile(fileName + '.png')

							// TODO: Also check the buffer is correct here...
							expect(file).toExist()
						})

						it('json', async () => {
							await util.grantPermissions(['clipboard-read'])
							await util.clearClipboard()
							await ui.app.setup()
							await createShape()

							if (mode === 'context') {
								await ui.canvas.contextMenu(100, 120, ['export-as', 'export-as-json'])
							} else if (mode === 'main') {
								await ui.main.menu(['edit', 'export-as', 'export-as-json'])
							}

							// FIXME: This shouldn't be a timer... but what to do???
							await browser.execute(() => new Promise((resolve) => setTimeout(resolve, 3000)))
							const allShapes = await runtime.getAllShapes()
							const fileName = await fileNameFromShape(allShapes[0])
							const file = await util.getDownloadFile(fileName + '.json')

							// TODO: Also check the buffer is correct here...
							expect(file).toExist()
						})
					}
				)
			})
		}
	})

	describe('copy-as', () => {
		for (const mode of ['main' /*, 'context'*/]) {
			describe(`${mode} menu`, () => {
				env(
					{
						// NOTE: Will be abled once mobile browsers support the '/permissions' API endpoint.
						device: 'desktop',
						// FIXME
						skipBrowsers: ['firefox', 'vscode'],
					},
					() => {
						it('svg', async () => {
							await util.grantPermissions(['clipboard-read'])
							await ui.app.setup()
							await util.clearClipboard()
							await createShape()

							if (mode === 'context') {
								await ui.canvas.contextMenu(100, 120, ['copy-as', 'copy-as-svg'])
							} else if (mode === 'main') {
								await ui.main.menu(['edit', 'copy-as', 'copy-as-svg'])
							}

							await util.waitForClipboardContents()
							const clipboardContents = await util.clipboardContents()
							expect(clipboardContents.length).toEqual(1)
							expect(clipboardContents[0]['text/plain']).toMatch(/<svg/)
						})

						it('png', async () => {
							await util.grantPermissions(['clipboard-read'])
							await ui.app.setup()
							await util.clearClipboard()
							await createShape()

							if (mode === 'context') {
								await ui.canvas.contextMenu(100, 120, ['copy-as', 'copy-as-png'])
							} else if (mode === 'main') {
								await ui.main.menu(['edit', 'copy-as', 'copy-as-png'])
							}

							await util.waitForClipboardContents()
							const clipboardContents = await util.clipboardContents()
							expect(clipboardContents.length).toEqual(1)
							expect(clipboardContents[0]['image/png']).toBeDefined()
						})

						it('json', async () => {
							await util.grantPermissions(['clipboard-read'])
							await ui.app.setup()
							await util.clearClipboard()
							await createShape()

							if (mode === 'context') {
								await ui.canvas.contextMenu(100, 120, ['copy-as', 'copy-as-json'])
							} else if (mode === 'main') {
								await ui.main.menu(['edit', 'copy-as', 'copy-as-json'])
							}

							await util.waitForClipboardContents()
							const clipboardContents = await util.clipboardContents()
							expect(clipboardContents.length).toEqual(1)
							expect(clipboardContents[0]['text/plain']).toBeDefined()
							expect(clipboardContents[0]['text/plain']).toMatch(/^{/)
						})
					}
				)
			})
		}
	})
})
