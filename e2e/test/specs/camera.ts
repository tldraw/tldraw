import { MOVE_DEFAULTS, runtime, ui } from '../helpers'
import { describe, env, it } from '../mocha-ext'

describe('camera', () => {
	env(
		{
			skipBrowsers: ['firefox'],
		},
		() => {
			describe('panning', () => {
				it('hand tool', async () => {
					await ui.app.setup()

					const c1 = await runtime.getCamera()
					await ui.tools.click('hand')
					await browser.actions([
						browser
							.action('pointer')
							.move({ x: 200, y: 200, ...MOVE_DEFAULTS })
							.down('left')
							.move({ x: 300, y: 300, ...MOVE_DEFAULTS })
							.up(),
					])

					const c2 = await runtime.getCamera()
					expect(c1).not.toMatchObject(c2 as any)
					expect(c1.z).toBe(c2.z)
				})

				env(
					{
						input: ['mouse'],
					},
					() => {
						// Failed in <https://automate.browserstack.com/dashboard/v2/public-build/Nyt1KzhUQ1FXNVRrcWFsaE4vSUREQzN1ZFNMaW5YUGpaL0UyU2RvUFd1WFBsK3lBSXRRZHUwSHlyaWk1a0dqelJlbUsvL0xUM2xadnhFY28xODE4aUE9PS0tUDNQbHorbWFPeTVQNGJzWHVXNUp4Zz09--581e9085c67c6e1508b22e4757f4936e70bb68d1>
						it('wheel', async () => {
							await ui.app.setup()

							const c1 = await runtime.getCamera()
							await browser
								.action('wheel')
								.scroll({ x: 200, y: 200, deltaX: 100, deltaY: 100, duration: 100 })
								.perform()

							const c2 = await runtime.getCamera()
							expect(c1).not.toMatchObject(c2 as any)
							expect(c1.z).toBe(c2.z)
						})

						// REMOTE:OK
						it('spacebar', async () => {
							await ui.app.setup()

							const c1 = await runtime.getCamera()
							await browser.actions([
								browser.action('key').down(' '),
								browser
									.action('pointer')
									.move({ x: 200, y: 200, ...MOVE_DEFAULTS })
									.down('left')
									.move({ x: 300, y: 300, ...MOVE_DEFAULTS })
									.up(),
							])

							const c2 = await runtime.getCamera()
							expect(c1).not.toMatchObject(c2 as any)
							expect(c1.z).toBe(c2.z)
						})
					}
				)
			})

			describe('zooming', () => {
				env(
					{
						ui: 'desktop',
						input: ['mouse'],
						skipBrowsers: ['firefox'],
					},
					() => {
						it('wheel', async () => {
							await ui.app.setup()
							const c1 = await runtime.getCamera()
							await browser.actions([
								// For some reason the import isn't working...
								// From <https://github.com/webdriverio/webdriverio/blob/3620e90e47b6d3e62832f5de24f43cee6b31e972/packages/webdriverio/src/constants.ts#L360>
								browser.action('key').down('WDIO_CONTROL'),
								browser
									.action('wheel')
									.scroll({ x: 200, y: 200, deltaX: 100, deltaY: 100, duration: 100 }),
							])
							const c2 = await runtime.getCamera()
							expect(c1).not.toMatchObject(c2 as any)
							expect(c1.z).not.toBe(c2.z)
						})
					}
				)

				env(
					{
						input: ['touch'],
					},
					() => {
						it('pinch-in', async () => {
							await ui.app.setup()

							const c1 = await runtime.getCamera()
							await browser.actions([
								browser
									.action('pointer', { parameters: { pointerType: 'touch' } })
									.move({ x: 200, y: 200, ...MOVE_DEFAULTS })
									.down('left')
									.move({ x: 300, y: 300, ...MOVE_DEFAULTS })
									.up(),
								browser
									.action('pointer', { parameters: { pointerType: 'touch' } })
									.move({ x: 200, y: 200, ...MOVE_DEFAULTS })
									.down('left')
									.move({ x: 100, y: 100, ...MOVE_DEFAULTS })
									.up(),
							])

							const c2 = await runtime.getCamera()
							expect(c1).not.toMatchObject(c2 as any)
							expect(c1.z).toBeLessThan(c2.z)
						})

						it('pinch-out', async () => {
							await ui.app.setup()

							const c1 = await runtime.getCamera()
							await browser.actions([
								browser
									.action('pointer', { parameters: { pointerType: 'touch' } })
									.move({ x: 300, y: 300, ...MOVE_DEFAULTS })
									.down('left')
									.move({ x: 220, y: 220, ...MOVE_DEFAULTS })
									.up(),
								browser
									.action('pointer', { parameters: { pointerType: 'touch' } })
									.move({ x: 100, y: 100, ...MOVE_DEFAULTS })
									.down('left')
									.move({ x: 180, y: 180, ...MOVE_DEFAULTS })
									.up(),
							])

							const c2 = await runtime.getCamera()
							expect(c1).not.toMatchObject(c2 as any)
							expect(c1.z).toBeGreaterThan(c2.z)
						})
					}
				)

				env(
					{
						ui: 'desktop',
					},
					() => {
						describe('minimap', () => {
							describe('buttons', () => {
								// REMOTE:OK
								it('zoom in', async () => {
									await ui.app.setup()
									const c1 = await runtime.getCamera()
									await ui.minimap.zoomIn()

									await browser.waitUntil(async () => {
										const text = await (await ui.minimap.menuButton()).getText()
										return text === '200%'
									})

									const c2 = await runtime.getCamera()
									expect(c1).not.toMatchObject(c2 as any)
									expect(c2.z).toBe(2)
								})

								it('zoom out', async () => {
									await ui.app.setup()
									const c1 = await runtime.getCamera()
									await ui.minimap.zoomOut()

									await browser.waitUntil(async () => {
										const text = await (await ui.minimap.menuButton()).getText()
										return text === '50%'
									})

									const c2 = await runtime.getCamera()
									expect(c1).not.toMatchObject(c2 as any)
									expect(c2.z).toBeCloseTo(0.5)
								})
							})

							describe('menu', () => {
								// REMOTE:OK
								it('zoom in', async () => {
									await ui.app.setup()
									const c1 = await runtime.getCamera()
									await ui.minimap.menu(['zoom-in'])

									await browser.waitUntil(async () => {
										const text = await (await ui.minimap.menuButton()).getText()
										return text === '200%'
									})

									const c2 = await runtime.getCamera()
									expect(c1).not.toMatchObject(c2 as any)
									expect(c2.z).toBeCloseTo(2)
								})

								// REMOTE:OK
								it('zoom out', async () => {
									await ui.app.setup()
									const c1 = await runtime.getCamera()
									await ui.minimap.menu(['zoom-out'])

									await browser.waitUntil(async () => {
										const text = await (await ui.minimap.menuButton()).getText()
										return text === '50%'
									})

									const c2 = await runtime.getCamera()
									expect(c1).not.toMatchObject(c2 as any)
									expect(c2.z).toBeCloseTo(0.5)
								})

								// REMOTE:OK
								it('zoom 100%', async () => {
									await ui.app.setup()
									await browser.execute(() => {
										window.app.setCamera(0, 0, 0.5)
									})
									const c1 = await runtime.getCamera()
									expect(c1.z).toBeCloseTo(0.5)

									await ui.minimap.menu(['zoom-to-100'])
									await browser.waitUntil(async () => {
										const text = await (await ui.minimap.menuButton()).getText()
										return text === '100%'
									})

									const c2 = await runtime.getCamera()
									expect(c2.z).toBeCloseTo(1)
								})

								it('zoom to fit', async () => {
									await ui.app.setup()

									await ui.tools.click('rectangle')
									await ui.canvas.brush(10, 10, 60, 60)

									await browser.execute(() => {
										window.app.setCamera(0, 0, 0.5)
									})
									const c1 = await runtime.getCamera()
									expect(c1.z).toBeCloseTo(0.5)

									await ui.minimap.menu(['zoom-to-fit'])
									await browser.waitUntil(async () => {
										const text = await (await ui.minimap.menuButton()).getText()
										return text === '800%'
									})

									const c2 = await runtime.getCamera()
									expect(c2.z).toBeCloseTo(8)
								})

								it('zoom to selection', async () => {
									await ui.app.setup()

									await ui.tools.click('rectangle')
									await ui.canvas.brush(10, 10, 60, 60)

									await browser.execute(() => {
										window.app.setCamera(0, 0, 0.5)
									})
									const c1 = await runtime.getCamera()
									expect(c1.z).toBeCloseTo(0.5)

									await ui.minimap.menu(['zoom-to-selection'])
									await browser.waitUntil(async () => {
										const text = await (await ui.minimap.menuButton()).getText()
										return text === '100%'
									})

									const c2 = await runtime.getCamera()
									expect(c2.z).toBeCloseTo(1)
								})
							})
						})
					}
				)
			})
		}
	)
})
