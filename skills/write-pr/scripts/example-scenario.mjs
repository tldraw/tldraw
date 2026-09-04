// Example scenario for record-interaction.mjs: drag a shape, rotate it with the
// keyboard shortcut mid-drag, then keep dragging. Copy this file and change the
// body to match the interaction your PR affects.
//
// `page` is the Playwright page. `helpers` gives you:
//   editor(fn, arg)   run `fn(editor, arg)` inside the page against the live editor
//   drag(from, to)    move the mouse in small steps so the motion is visible
//   pause(ms)         wait

export default async function scenario(page, { editor, drag, pause }) {
	await editor((editor) => {
		editor.user.updateUserPreferences({ animationSpeed: 0, colorScheme: 'light' })
		editor.createShape({
			type: 'geo',
			x: 300,
			y: 240,
			props: { w: 320, h: 160, geo: 'rectangle', color: 'blue', fill: 'solid' },
		})
		editor.selectNone()
	})
	await pause(500)

	const start = { x: 460, y: 320 }
	await page.mouse.move(start.x, start.y)
	await pause(300)
	await page.mouse.down()
	await drag(start, { x: 620, y: 320 })
	await pause(400)

	// The external change: six rotate-clockwise presses for a full quarter turn
	for (let i = 0; i < 6; i++) {
		await page.keyboard.press('Shift+Period')
		await pause(120)
	}
	await pause(800)

	await drag({ x: 620, y: 320 }, { x: 640, y: 460 })
	await pause(400)
	await drag({ x: 640, y: 460 }, { x: 820, y: 420 })
	await pause(500)
	await page.mouse.up()
}
