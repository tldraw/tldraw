#!/usr/bin/env node
// Record one take of a before/after clip, frame by frame on a frozen clock.
//
//   node shoot.mjs --shot <shot.mjs> --url <url> [--label <Before|After>] --out <dir>
//
// Leave out --label for an after-only clip: with nothing to compare against, "After" is noise.
//
// The same shot against two builds gives two takes with identical timing and framing. See
// ../references/shot-format.md for the shot format. Frames are written to <out>/frames as
// 2240x1260 PNGs (1120x630 at 2x), with meta.json and cursors.json beside them. Recording in real
// time drops frames whenever the machine is busy; on a frozen clock every frame is rendered.
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_ROOT = path.join(SKILL_DIR, 'tmp')

const { values: args } = parseArgs({
	options: {
		shot: { type: 'string' },
		url: { type: 'string' },
		label: { type: 'string' },
		out: { type: 'string' },
	},
})
for (const k of ['shot', 'url', 'out']) {
	if (!args[k]) fail(`missing --${k}`)
}

// Frames are wiped before each take, so only ever write inside the skill's tmp folder.
const outDir = path.resolve(args.out)
if (!outDir.startsWith(OUT_ROOT + path.sep)) fail(`--out must be inside ${OUT_ROOT}`)

const ACTIONS = ['idle', 'move', 'down', 'up', 'click', 'key', 'type']
const OPTIONS = { move: ['ms', 'arc'], down: ['ms'], up: ['ms'], click: ['ms'], key: ['show', 'showMs', 'ms'], type: ['perChar'], idle: [] }

const W = 1120 // 16:9, the size the team's before/afters use
const H = 630
const OUT_FPS = 50 // GIF delays are in 1/100s, so 50fps is the smoothest a GIF can play
const shot = await import(path.resolve(args.shot))
const SPEED = shot.speed ?? 1.2
if (SPEED < 1.2 || SPEED > 1.25) {
	console.warn(`[warn] speed ${SPEED}: 1.2-1.25 reads best (faster looks rushed, slower drags)`)
}
const STEP_MS = (1000 / OUT_FPS) * SPEED // page time per output frame
validateSteps(shot.steps)

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(path.join(outDir, 'frames'), { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({
	viewport: { width: W, height: H },
	deviceScaleFactor: 2,
	// tldraw picks Cmd or Ctrl (and the ⌘ or Ctrl hints in menus) from the user agent. Present as
	// a Mac everywhere, including Linux CI, so `Meta+k` works and the UI matches a Mac recording.
	userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.version()} Safari/537.36`,
})
await ctx.addInitScript(() => {
	// tldraw.com's debug mode schedules a "Want to build with tldraw?" toast after 10s
	localStorage.setItem('showDebugSdkToast', 'false')
	// The same as pressing "Opt out" on tldraw.com's cookie banner, so the banner never shows
	localStorage.setItem('tldraw_cookie_consent', JSON.stringify({ analytics: false }))
})
const page = await ctx.newPage()
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))

await page.goto(args.url, { waitUntil: 'networkidle' })
await page.waitForFunction(() => !!window.editor, null, { timeout: 30_000 })
await page.evaluate(() => document.fonts.ready.then(() => 0))

// Headless Chrome draws no cursor, so draw the one the page asks for. On the canvas that's tldraw's
// own SVG cursors. Plain CSS keywords are drawn by the OS on a real screen: `pointer` and `text`
// use system cursor images when CLIPS_SYSTEM_CURSORS is set, anything else tldraw's arrow.
const SYS = loadSystemCursors()
await page.evaluate(
	([W, H, SYS]) => {
		const parse = (css) => {
			// url("...") holds an SVG that itself contains url(#shadow), so match the quoted string
			const m = /url\("((?:[^"\\]|\\.)*)"\)\s*(\d+)?\s*(\d+)?/.exec(css ?? '')
			if (!m) return null
			const src = m[1].replace(/\\(.)/g, '$1').replace(/#/g, '%23') // '#' would start a URL fragment
			return { src, hx: Number(m[2] ?? 0), hy: Number(m[3] ?? 0), w: 32, h: 32, shadow: 'none' }
		}
		// Read before the shot's setup runs: if setup picks another tool, its cursor would become
		// the cursor shown over every button
		const canvas = document.querySelector('.tl-canvas') ?? document.elementFromPoint(W / 2, H / 2)
		const arrow = parse(getComputedStyle(canvas).cursor)
		if (!arrow) throw new Error("could not read tldraw's default cursor from the canvas")
		const known = new Set(['auto', 'default', 'inherit', 'initial'])
		window.__ba = { log: [], unmapped: new Set() }
		let last = arrow
		window.__ba.setCursor = async (x, y) => {
			const el = document.getElementById('ba-cursor')
			const hit = x >= 0 && y >= 0 && x < W && y < H ? document.elementFromPoint(x, y) : null
			const css = hit ? getComputedStyle(hit).cursor : null
			let c = last // off the page: keep the last cursor
			if (hit) {
				c = parse(css) ?? SYS[css] ?? arrow
				if (!parse(css) && !SYS[css] && !known.has(css)) window.__ba.unmapped.add(css)
			}
			window.__ba.current = css?.startsWith('url') ? 'tldraw-svg' : css
			if (el.dataset.src !== c.src) {
				el.src = c.src
				el.dataset.src = c.src
				await el.decode().catch(() => {})
			}
			last = c
			Object.assign(el.style, {
				width: c.w + 'px',
				height: c.h + 'px',
				filter: c.shadow,
				left: x - c.hx + 'px',
				top: y - c.hy + 'px',
			})
			return 0
		}
		return 0
	},
	[W, H, SYS]
)

const points = await page.evaluate(
	([src, label, W, H]) => {
		const e = window.editor
		// Keep our own handle: the debug menu deletes window.editor when it unmounts
		window.__ba.editor = e
		e.updateInstanceState({ isDebugMode: false })
		e.run(() => e.deleteShapes([...e.getCurrentPageShapeIds()]), { ignoreShapeLock: true })
		e.setCamera({ x: 0, y: 0, z: 1 })
		const h = {
			W,
			H,
			rt: (text) => ({
				type: 'doc',
				content: text.split('\n').map((line) => ({
					type: 'paragraph',
					content: line ? [{ type: 'text', text: line }] : [],
				})),
			}),
			screen: (x, y) => {
				const s = e.pageToScreen({ x, y })
				return { x: s.x, y: s.y }
			},
			label: (cx, y) => {
				if (!label) return
				e.createShape({ id: 'shape:ba-label', type: 'text', x: 0, y, props: { richText: h.rt(label), size: 'l' } })
				const b = e.getShapePageBounds('shape:ba-label')
				e.updateShape({ id: 'shape:ba-label', type: 'text', x: cx - b.w / 2 })
			},
		}
		const setup = new Function('return ' + src)()
		return setup(e, label, h) ?? {}
	},
	[shot.setup.toString(), args.label, W, H]
)
validatePoints(shot.steps, points)

// These clips are of tldraw itself. Local examples builds have no license key, so hide their
// "Get a license for production" watermark in the recording; the build is untouched.
await page.addStyleTag({ content: '.tl-watermark_SEE-LICENSE { display: none !important; }' })

await page.evaluate(() => {
	const root = document.createElement('div')
	root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647'
	root.innerHTML = `
	<div id="ba-ripple" style="position:absolute;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;background:rgba(255,200,0,.45);opacity:0"></div>
	<img id="ba-cursor" style="position:absolute;left:-100px;top:-100px;width:32px;height:32px">
	<div id="ba-keys" style="position:absolute;left:24px;bottom:96px;font:600 22px/1 Inter,system-ui,sans-serif;color:#fff;background:rgba(0,0,0,.75);padding:10px 14px;border-radius:10px;opacity:0"></div>`
	document.body.appendChild(root)
	return 0
})
await page.waitForTimeout(600)

// Freeze time, then replace requestAnimationFrame with a queue we flush once per output frame.
// Playwright's fake rAF fires on a 16ms grid, which at a 24ms frame alternates 16ms and 32ms ticks
// and makes animations judder. Don't jump the clock forward: tldraw measures ticks with
// Date.now(), and it would see the jump as one giant tick that finishes every animation at once.
await page.clock.install()
await page.clock.pauseAt(Date.now() + 100) // a small offset avoids racing the page's clock
await page.evaluate(() => {
	let q = []
	let id = 0
	window.requestAnimationFrame = (cb) => {
		q.push([++id, cb])
		return id
	}
	window.cancelAnimationFrame = (x) => {
		q = q.filter(([i]) => i !== x)
	}
	window.__ba.flushRaf = () => {
		const run = q
		q = []
		const now = performance.now()
		for (const [, cb] of run) cb(now)
		return 0
	}
	window.__ba.ticks = 0
	window.__ba.editor.on('tick', () => window.__ba.ticks++)
	return 0
})
// Wait until tldraw's tick loop is running on our rAF. If it never does, animations would jump.
let warm = false
for (let i = 0; i < 200 && !warm; i++) {
	await page.clock.runFor(STEP_MS)
	await page.evaluate(() => window.__ba.flushRaf())
	warm = (await page.evaluate(() => window.__ba.ticks)) >= 5
}
if (!warm) fail("tldraw's tick loop never started under the frozen clock")

const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
let cursor = resolve(shot.start ?? { x: W + 60, y: H - 80 }, points)
let ripple = -1e9
let keycast = { text: '', until: -1e9 }
let t = 0
let frame = 0
const cursorLog = []

async function frameOut() {
	t += STEP_MS
	await page.clock.runFor(STEP_MS)
	await page.evaluate(() => window.__ba.flushRaf())
	// CSS animations and transitions run on the browser's own clock, not the fake one. Pause each
	// one when it appears and step it by exactly one frame, so toasts and menus move in frame time.
	await page.evaluate((step) => {
		for (const a of document.getAnimations()) {
			if (!a.__ba) {
				a.__ba = true
				a.pause()
				a.currentTime = 0
			} else a.currentTime = (a.currentTime ?? 0) + step
		}
		return 0
	}, STEP_MS)
	await page.evaluate(([x, y]) => window.__ba.setCursor(x, y), [cursor.x, cursor.y])
	await page.evaluate(
		([c, rippleAge, kc]) => {
			const r = document.getElementById('ba-ripple')
			const k = Math.min(1, Math.max(0, rippleAge / 350))
			r.style.left = c.x + 'px'
			r.style.top = c.y + 'px'
			r.style.opacity = rippleAge >= 0 && rippleAge < 350 ? String(0.9 * (1 - k)) : '0'
			r.style.transform = `scale(${0.4 + 0.8 * k})`
			const kb = document.getElementById('ba-keys')
			kb.textContent = kc.text
			kb.style.opacity = kc.visible ? '1' : '0'
			return 0
		},
		[cursor, t - ripple, { text: keycast.text, visible: t < keycast.until }]
	)
	cursorLog.push([frame, Math.round(cursor.x), Math.round(cursor.y), await page.evaluate(() => window.__ba.current)])
	await page.screenshot({
		path: path.join(outDir, 'frames', `${String(frame++).padStart(5, '0')}.png`),
		scale: 'device',
	})
	if (pageErrors.length) fail(`the page threw during the take: ${pageErrors.join(' | ')}`)
}
async function hold(ms) {
	for (let i = 0; i < Math.max(1, Math.round(ms / STEP_MS)); i++) await frameOut()
}

for (const s of shot.steps) {
	if ('idle' in s) await hold(s.idle)
	else if ('move' in s) {
		const from = { ...cursor }
		const to = resolve(s.move, points)
		const arc = s.arc ?? 0
		const n = Math.max(1, Math.round((s.ms ?? 700) / STEP_MS))
		// Bend the path a little: ruled straight lines read as robotic
		const mx = (from.x + to.x) / 2
		const my = (from.y + to.y) / 2
		const dx = to.x - from.x
		const dy = to.y - from.y
		const len = Math.hypot(dx, dy) || 1
		const cx = mx - (dy / len) * arc
		const cy = my + (dx / len) * arc
		for (let i = 1; i <= n; i++) {
			const p = ease(i / n)
			cursor = {
				x: (1 - p) ** 2 * from.x + 2 * (1 - p) * p * cx + p * p * to.x,
				y: (1 - p) ** 2 * from.y + 2 * (1 - p) * p * cy + p * p * to.y,
			}
			await page.mouse.move(cursor.x, cursor.y)
			await frameOut()
		}
	} else if ('down' in s) {
		await page.mouse.down()
		ripple = t
		await hold(s.ms ?? 120)
	} else if ('up' in s) {
		await page.mouse.up()
		await hold(s.ms ?? 120)
	} else if ('click' in s) {
		await page.mouse.down()
		ripple = t
		await hold(60)
		await page.mouse.up()
		await hold(s.ms ?? 200)
	} else if ('key' in s) {
		await page.keyboard.press(s.key)
		keycast = { text: s.show ?? s.key, until: t + (s.showMs ?? 700) }
		await hold(s.ms ?? 200)
	} else if ('type' in s) {
		for (const ch of s.type) {
			await page.keyboard.type(ch)
			await hold(s.perChar ?? 70)
		}
	}
}

const unmapped = await page.evaluate(() => [...window.__ba.unmapped])
if (unmapped.length) {
	console.warn(`[warn] cursors drawn as tldraw's arrow because no image is mapped: ${unmapped.join(', ')}`)
}
fs.writeFileSync(path.join(outDir, 'cursors.json'), JSON.stringify(cursorLog))
const meta = { label: args.label, url: args.url, frames: frame, fps: OUT_FPS, speed: SPEED, pageMs: Math.round(t) }
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, '\t'))
console.log(JSON.stringify(meta))
await browser.close()


function fail(message) {
	console.error(`shoot.mjs: ${message}`)
	process.exit(1)
}

// Shots are often written by an agent. A typo should stop the take, not record a wrong clip.
function validateSteps(steps) {
	if (!Array.isArray(steps) || !steps.length) fail('the shot must export a non-empty `steps` array')
	steps.forEach((s, i) => {
		const actions = Object.keys(s).filter((k) => ACTIONS.includes(k))
		if (actions.length !== 1) fail(`step ${i}: needs exactly one of ${ACTIONS.join(', ')} (got ${JSON.stringify(s)})`)
		const [action] = actions
		for (const k of Object.keys(s)) {
			if (k !== action && !OPTIONS[action].includes(k)) fail(`step ${i}: unknown option "${k}" for ${action}`)
		}
		if (action === 'idle' && !(s.idle > 0)) fail(`step ${i}: idle needs a duration in ms`)
		if (action === 'type' && typeof s.type !== 'string') fail(`step ${i}: type needs a string`)
		if (action === 'key' && typeof s.key !== 'string') fail(`step ${i}: key needs a key name`)
	})
}

function validatePoints(steps, pts) {
	for (const p of [shot.start, ...steps.filter((s) => 'move' in s).map((s) => s.move)]) {
		if (p === undefined) continue
		const r = resolve(p, pts)
		if (!r || !Number.isFinite(r.x) || !Number.isFinite(r.y)) {
			fail(`point ${JSON.stringify(p)} doesn't resolve; setup returned: ${Object.keys(pts).join(', ') || 'nothing'}`)
		}
	}
}

function resolve(p, pts) {
	if (typeof p === 'string') return pts[p]
	if (p && p.at) return pts[p.at] && { x: pts[p.at].x + (p.dx ?? 0), y: pts[p.at].y + (p.dy ?? 0) }
	return p
}

function loadSystemCursors() {
	const dir = process.env.CLIPS_SYSTEM_CURSORS
	const out = {}
	if (!dir) return out
	const add = (keyword, file, hx, hy, w, h, shadow) => {
		const f = path.join(dir, file)
		if (!fs.existsSync(f)) return
		out[keyword] = { src: 'data:image/png;base64,' + fs.readFileSync(f).toString('base64'), hx, hy, w, h, shadow }
	}
	// Hotspots and sizes from each cursor's info.plist in HIServices
	add('pointer', 'pointinghand.png', 13, 8, 32, 32, 'drop-shadow(0 1px 1px rgba(0,0,0,.45))')
	add('text', 'ibeam.png', 12, 11, 23, 22, 'none')
	return out
}
