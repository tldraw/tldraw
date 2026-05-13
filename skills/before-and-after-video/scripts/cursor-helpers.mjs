export function createCursorController(page, options = {}) {
	const cursor = {
		x: options.startX ?? 80,
		y: options.startY ?? 80,
		down: false,
	}
	let moveCount = 0

	const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

	function easeInOutCubic(t) {
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
	}

	function cubicBezier(p0, p1, p2, p3, t) {
		const mt = 1 - t
		return (
			mt * mt * mt * p0 +
			3 * mt * mt * t * p1 +
			3 * mt * t * t * p2 +
			t * t * t * p3
		)
	}

	function curveForMove(dx, dy) {
		const distance = Math.hypot(dx, dy)
		if (distance < 16) return 0
		const direction = moveCount++ % 2 === 0 ? 1 : -1
		return Math.min(70, Math.max(18, distance * 0.13)) * direction
	}

	async function setCursor(x, y, down = cursor.down) {
		await page.mouse.move(x, y)
		await page.evaluate(
			([nextX, nextY, isDown]) => window.__beforeAfterDemoMoveCursor(nextX, nextY, isDown),
			[x, y, down]
		)
	}

	async function install() {
		await page.addStyleTag({
			content: `
				#before-after-demo-cursor {
					position: fixed;
					left: 0;
					top: 0;
					width: 18px;
					height: 18px;
					border: 2px solid white;
					background: #111;
					border-radius: 999px;
					box-shadow: 0 2px 10px rgba(0, 0, 0, .35);
					transform: translate(-100px, -100px);
					z-index: 2147483647;
					pointer-events: none;
					transition:
						width 100ms ease,
						height 100ms ease,
						background-color 100ms ease,
						box-shadow 100ms ease;
				}
				#before-after-demo-cursor[data-down="true"] {
					width: 24px;
					height: 24px;
					background: #0f6bff;
					box-shadow: 0 2px 14px rgba(15, 107, 255, .45);
				}
			`,
		})
		await page.evaluate(() => {
			const existing = document.getElementById('before-after-demo-cursor')
			if (existing) existing.remove()
			const demoCursor = document.createElement('div')
			demoCursor.id = 'before-after-demo-cursor'
			document.body.appendChild(demoCursor)
			window.__beforeAfterDemoMoveCursor = (x, y, down = false) => {
				demoCursor.dataset.down = String(down)
				demoCursor.style.transform = `translate(${x - demoCursor.offsetWidth / 2}px, ${
					y - demoCursor.offsetHeight / 2
				}px)`
			}
		})
		await setCursor(cursor.x, cursor.y, false)
	}

	async function moveTo(x, y, moveOptions = {}) {
		const dx = x - cursor.x
		const dy = y - cursor.y
		const distance = Math.hypot(dx, dy)
		const duration = moveOptions.duration ?? Math.min(980, Math.max(340, distance * 2.2))
		const steps = moveOptions.steps ?? Math.max(14, Math.min(48, Math.round(duration / 24)))
		const curve = moveOptions.curve ?? curveForMove(dx, dy)
		const perpLength = distance || 1
		const px = (-dy / perpLength) * curve
		const py = (dx / perpLength) * curve
		const p1 = { x: cursor.x + dx * 0.28 + px, y: cursor.y + dy * 0.28 + py }
		const p2 = { x: cursor.x + dx * 0.78 - px * 0.35, y: cursor.y + dy * 0.78 - py * 0.35 }
		const down = moveOptions.down ?? cursor.down

		for (let i = 1; i <= steps; i++) {
			const rawT = i / steps
			const t = easeInOutCubic(rawT)
			const wobble = Math.sin(rawT * Math.PI * 2.5) * Math.min(2.5, distance / 160)
			const nextX = cubicBezier(cursor.x, p1.x, p2.x, x, t) + wobble
			const nextY = cubicBezier(cursor.y, p1.y, p2.y, y, t) - wobble * 0.4
			await setCursor(nextX, nextY, down)
			await sleep(duration / steps)
		}

		cursor.x = x
		cursor.y = y
		cursor.down = down
		await setCursor(x, y, down)
	}

	async function clickAt(x, y) {
		await moveTo(x, y, { duration: 620 })
		await sleep(120)
		await page.mouse.down()
		cursor.down = true
		await setCursor(x, y, true)
		await sleep(140)
		await page.mouse.up()
		cursor.down = false
		await setCursor(x, y, false)
		await sleep(620)
	}

	async function doubleClickAt(x, y) {
		await moveTo(x, y, { duration: 580 })
		await sleep(120)
		cursor.down = true
		await setCursor(x, y, true)
		await page.mouse.dblclick(x, y, { delay: 90 })
		cursor.down = false
		await setCursor(x, y, false)
		await sleep(540)
	}

	async function drag(from, to, steps = 32) {
		await moveTo(from.x, from.y, { duration: 650 })
		await sleep(130)
		await page.mouse.down()
		cursor.down = true
		await setCursor(from.x, from.y, true)
		await sleep(260)
		await moveTo(to.x, to.y, {
			down: true,
			steps,
			duration: Math.max(900, steps * 32),
		})
		await sleep(320)
		await page.mouse.up()
		cursor.down = false
		await setCursor(to.x, to.y, false)
		await sleep(860)
	}

	async function center(locator) {
		const box = await locator.boundingBox()
		if (!box) throw new Error('Missing bounding box')
		return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
	}

	return { center, clickAt, doubleClickAt, drag, install, moveTo, sleep }
}
