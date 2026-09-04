#!/usr/bin/env node
// Record a scripted canvas interaction as a 16:9 MP4 for a PR's Before/After
// sections. Drives the examples app with Playwright, injects a visible cursor
// (headless recordings have none), hides the tldraw chrome so the canvas fills
// the frame, runs a scenario module, then trims the setup frames and transcodes
// with ffmpeg.
//
// Usage (from the repo root, with `yarn dev` serving localhost:5420):
//   node skills/write-pr/scripts/record-interaction.mjs <scenario.mjs> <out.mp4> [--url URL] [--keep-ui]
//
// The scenario module default-exports `async (page, helpers) => {}`. See
// example-scenario.mjs next to this file for the available helpers.

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const args = process.argv.slice(2)
const positional = args.filter((a) => !a.startsWith('--'))
const flag = (name) => {
	const i = args.indexOf(name)
	return i === -1 ? undefined : args[i + 1]
}
const [scenarioPath, outPath] = positional
if (!scenarioPath || !outPath) {
	console.error('usage: record-interaction.mjs <scenario.mjs> <out.mp4> [--url URL] [--keep-ui]')
	process.exit(1)
}
const url = flag('--url') ?? 'http://localhost:5420/develop'
const keepUi = args.includes('--keep-ui')

const WIDTH = 1280
const HEIGHT = 720

const scenario = (await import(pathToFileURL(path.resolve(scenarioPath)).href)).default
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'record-interaction-'))
process.on('exit', () => fs.rmSync(tmpDir, { recursive: true, force: true }))

let browser
try {
	browser = await chromium.launch()
} catch (e) {
	console.error(
		'Could not launch Chromium. Install scripts are disabled in this repo, so run `yarn playwright install chromium` once first.'
	)
	throw e
}

let rawPath
let recordingStartedAt
let scenarioStartedAt
try {
	const context = await browser.newContext({
		viewport: { width: WIDTH, height: HEIGHT },
		deviceScaleFactor: 1,
		recordVideo: { dir: tmpDir, size: { width: WIDTH, height: HEIGHT } },
	})
	recordingStartedAt = Date.now()
	const page = await context.newPage()
	await page.goto(url)
	await page.waitForSelector('.tl-canvas')
	// Let the first render, fonts, and any HMR reload settle before we start.
	await page.waitForTimeout(1500)

	await page.evaluate((keepUi) => {
		if (!keepUi) {
			const style = document.createElement('style')
			style.textContent = '.tlui-layout, .tlui-debug-panel { display: none !important }'
			document.head.appendChild(style)
		}
		const cursor = document.createElement('div')
		cursor.innerHTML =
			'<svg width="28" height="28" viewBox="0 0 24 24"><path d="M5 3l14 8.5-6.5 1.5-3.5 6z" fill="#000" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>'
		Object.assign(cursor.style, {
			position: 'fixed',
			left: '-100px',
			top: '-100px',
			zIndex: 99999,
			pointerEvents: 'none',
		})
		document.body.appendChild(cursor)
		window.addEventListener(
			'pointermove',
			(e) => {
				cursor.style.left = e.clientX - 4 + 'px'
				cursor.style.top = e.clientY - 3 + 'px'
			},
			true
		)
	}, keepUi)

	const helpers = {
		/** Run `fn(editor)` inside the page. The examples app exposes `window.editor`. */
		editor: (fn, arg) => page.evaluate(([src, arg]) => new Function('editor', 'arg', `return (${src})(editor, arg)`)(window.editor, arg), [fn.toString(), arg]),
		/** Move the mouse from one point to another in small steps so the recording shows motion. */
		drag: async (from, to, { steps = 40, dwellMs = 12 } = {}) => {
			for (let i = 1; i <= steps; i++) {
				const t = i / steps
				await page.mouse.move(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t)
				await page.waitForTimeout(dwellMs)
			}
		},
		pause: (ms) => page.waitForTimeout(ms),
	}

	// Everything before this point is setup and gets trimmed from the output.
	scenarioStartedAt = Date.now()
	await scenario(page, helpers)
	await page.waitForTimeout(1000)

	rawPath = await page.video().path()
} finally {
	// Closing the context is what flushes the recording to disk, so it has to run
	// even when the scenario throws; otherwise a failed attempt leaks a browser.
	await browser.close()
}

const trimSeconds = ((scenarioStartedAt - recordingStartedAt) / 1000).toFixed(2)
fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true })
const ffmpeg = spawnSync(
	'ffmpeg',
	[
		'-v', 'error', '-y',
		'-ss', trimSeconds,
		'-i', rawPath,
		'-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '22', '-preset', 'slow',
		'-movflags', '+faststart', '-an',
		path.resolve(outPath),
	],
	{ stdio: 'inherit' }
)
if (ffmpeg.status !== 0) {
	console.error('ffmpeg failed; is it installed? (brew install ffmpeg)')
	process.exit(ffmpeg.status ?? 1)
}
console.log(`wrote ${path.resolve(outPath)}`)
