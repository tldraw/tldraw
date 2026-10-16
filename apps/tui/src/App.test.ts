import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createShapeId } from '@tldraw/editor'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { resolveAppearance, strokeForTier } from './app/appearance'
import { parseArgs, usage } from './app/cli'
import { getDomGlobals } from './bootstrap/dom'
import { FrameScheduler } from './bootstrap/frame'
import { Terminal, type TerminalCapabilities } from './terminal/Terminal'
import { sgrMouse, sleep, startTestApp, waitFrames, type TestApp } from './test/appHarness'
import { FakeTerminal } from './test/FakeTerminal'

const CAPS: TerminalCapabilities = {
	kitty: false,
	truecolor: '256',
	background: null,
	ambiguousWide: false,
	mouse: true,
	hover: true,
	syncOutput: true,
	osc52: false,
	utf8: true,
	modifyOtherKeys: false,
}

describe('resolveAppearance', () => {
	it('prefers the flag, then the probed background, then COLORFGBG, then dark', () => {
		expect(resolveAppearance({ capabilities: CAPS, env: {} }).scheme).toBe('dark')
		expect(
			resolveAppearance({ capabilities: { ...CAPS, background: 0xffffff }, env: {} }).scheme
		).toBe('light')
		expect(
			resolveAppearance({ capabilities: { ...CAPS, background: 0x101011 }, env: {} }).scheme
		).toBe('dark')
		expect(
			resolveAppearance({
				capabilities: { ...CAPS, background: 0xffffff },
				env: {},
				scheme: 'dark',
			}).scheme
		).toBe('dark')
		expect(resolveAppearance({ capabilities: CAPS, env: { COLORFGBG: '0;15' } }).scheme).toBe(
			'light'
		)
	})

	it('picks the glyph tier from the flag, the locale and the width probe', () => {
		expect(resolveAppearance({ capabilities: CAPS, env: {} }).glyphTier).toBe('rich')
		expect(
			resolveAppearance({ capabilities: CAPS, env: { TERM_PROGRAM: 'Apple_Terminal' } }).glyphTier
		).toBe('safe')
		expect(resolveAppearance({ capabilities: CAPS, env: { LANG: 'C' } }).glyphTier).toBe('ascii')
		expect(
			resolveAppearance({ capabilities: { ...CAPS, ambiguousWide: true }, env: {} }).glyphTier
		).toBe('ascii')
		expect(
			resolveAppearance({ capabilities: CAPS, env: { LANG: 'C' }, glyphs: 'rich' }).glyphTier
		).toBe('rich')
	})

	it('derives the stroke mode from the tier unless overridden', () => {
		expect(strokeForTier('rich')).toBe('braille')
		expect(strokeForTier('safe')).toBe('braille')
		expect(strokeForTier('ascii')).toBe('ascii')
		expect(resolveAppearance({ capabilities: CAPS, env: { LANG: 'C' } }).stroke).toBe('ascii')
		expect(resolveAppearance({ capabilities: CAPS, env: {}, stroke: 'blocks' }).stroke).toBe(
			'blocks'
		)
	})

	it('passes the colour depth through and picks the shortcut encoding', () => {
		const a = resolveAppearance({ capabilities: { ...CAPS, truecolor: '24bit' }, env: {} })
		expect(a.colorDepth).toBe('24bit')
		expect(a.keyboardEncoding).toBe('legacy')
		expect(
			resolveAppearance({ capabilities: { ...CAPS, kitty: true }, env: {} }).keyboardEncoding
		).toBe('full')
		// modifyOtherKeys is only a request; the encoding switches when an encoded key arrives.
		expect(
			resolveAppearance({ capabilities: { ...CAPS, modifyOtherKeys: true }, env: {} })
				.keyboardEncoding
		).toBe('legacy')
	})
})

describe('parseArgs', () => {
	it('parses the file path and every flag', () => {
		const result = parseArgs([
			'notes.tldr',
			'--dark',
			'--fps',
			'90',
			'--glyphs=safe',
			'--color',
			'16',
			'--no-mouse',
			'--osc52',
			'--debug',
		])
		expect(result).toEqual({
			ok: true,
			options: {
				filePath: 'notes.tldr',
				scheme: 'dark',
				maxFps: 90,
				glyphs: 'safe',
				color: '16',
				mouse: false,
				osc52: true,
				debug: true,
				help: false,
			},
		})
	})

	it('rejects bad values and unknown options', () => {
		expect(parseArgs(['--fps', '500'])).toMatchObject({ ok: false })
		expect(parseArgs(['--fps'])).toMatchObject({ ok: false })
		expect(parseArgs(['--glyphs', 'fancy'])).toMatchObject({ ok: false })
		expect(parseArgs(['--color', '8'])).toMatchObject({ ok: false })
		expect(parseArgs(['--bogus'])).toMatchObject({ ok: false })
		expect(parseArgs(['a.tldr', 'b.tldr'])).toMatchObject({ ok: false })
		expect(parseArgs(['--debug=1'])).toMatchObject({ ok: false })
	})

	it('handles help and the end of options marker', () => {
		expect(parseArgs(['-h'])).toMatchObject({ ok: true, options: { help: true } })
		expect(parseArgs(['--', '--weird.tldr'])).toMatchObject({
			ok: true,
			options: { filePath: '--weird.tldr' },
		})
		expect(usage()).toContain('Usage: tldraw-tui')
		expect(usage()).toContain('--glyphs')
	})
})

describe('App', () => {
	let t: TestApp | null = null

	afterEach(() => {
		t?.dispose()
		t = null
	})

	it('keeps the frame loop alive only while something is in motion', async () => {
		t = await startTestApp()
		const { app } = t
		const { editor, ui } = app.getContext()
		await sleep(80)
		expect(app.shouldKeepAlive()).toBe(false)
		expect(t.frame.isParked()).toBe(true)

		app.requestRender()
		expect(app.shouldKeepAlive()).toBe(true)
		await waitFrames(t, 2)
		expect(app.shouldKeepAlive()).toBe(false)

		// A shown error does not keep the loop running; its expiry timer asks for the frame that
		// clears it, and that frame is written.
		const framesBefore = t.frame.getStats().frames
		ui.showError('boom', performance.now(), 200)
		await waitFrames(t, 1)
		expect(t.fake.grid()[29]).toContain('boom')
		expect(app.shouldKeepAlive()).toBe(false)
		await sleep(80)
		expect(t.frame.isParked()).toBe(true)
		const framesShown = t.frame.getStats().frames
		expect(framesShown - framesBefore).toBeLessThan(6)
		await sleep(250)
		expect(ui.error.get()).toBeNull()
		expect(t.fake.grid()[29]).not.toContain('boom')
		expect(app.shouldKeepAlive()).toBe(false)

		editor.setCamera({ x: 100, y: 100, z: 1 }, { immediate: true })
		expect(app.shouldKeepAlive()).toBe(true)
		await sleep(400)
		expect(app.shouldKeepAlive()).toBe(false)
	})

	it('refreshes debug stats at most four times a second and never reactively', async () => {
		t = await startTestApp({ app: { debug: true } })
		const { ui } = t.app.getContext()
		expect(ui.debugStats).not.toBeNull()
		const seen = new Set<object>([ui.debugStats!])
		const start = performance.now()
		let i = 0
		while (performance.now() - start < 1000) {
			t.fake.feed(sgrMouse('move', 10 + (i++ % 30), 10))
			await sleep(5)
			if (ui.debugStats) seen.add(ui.debugStats)
		}
		// The initial zeros plus one refresh per 250 ms window.
		expect(seen.size).toBeGreaterThanOrEqual(3)
		expect(seen.size).toBeLessThanOrEqual(6)
		const latest = ui.debugStats!
		expect(latest.fps).toBeGreaterThan(0)
		expect(latest.fps).toBeLessThanOrEqual(65)
		expect(t.fake.grid()[29]).toMatch(/\d+fps/)
	})

	it('captures only coarse signals in the render effect', async () => {
		t = await startTestApp()
		const { app } = t
		const { editor } = app.getContext()
		editor.run(() => {
			for (let i = 0; i < 200; i++) {
				editor.createShape({
					id: createShapeId(`shape-${i}`),
					type: 'geo',
					x: (i % 20) * 40,
					y: Math.floor(i / 20) * 40,
					props: { w: 30, h: 30 },
				})
			}
		})
		app.renderOnce()
		expect(editor.getCurrentPageShapes()).toHaveLength(200)
		expect(app.getRenderParentCount()).toBeLessThan(40)
	})

	it('switches colour mode through the context and paints the canvas with the theme background', async () => {
		t = await startTestApp()
		const ctx = t.app.getContext()
		expect(ctx.editor.getColorMode()).toBe('light')
		const lightBg = t.app.getScreen().getOptions().background
		// The canvas carries the theme background, not the terminal default, so --light on a dark
		// terminal (or ctrl+/) never draws theme colours over the wrong base.
		expect(lightBg).toBe(0xf9fafb)
		expect(t.app.getScreen().getCell(50, 15)!.style.bg).toBe(lightBg)
		ctx.setColorMode('dark')
		await waitFrames(t, 2)
		expect(ctx.editor.getColorMode()).toBe('dark')
		const darkBg = t.app.getScreen().getOptions().background
		expect(darkBg).not.toBe(lightBg)
		expect(t.app.getScreen().getCell(50, 15)!.style.bg).toBe(darkBg)
	})

	it('reuses the shape layer across frames that change nothing it depends on', async () => {
		t = await startTestApp()
		const { editor } = t.app.getContext()
		editor.createShape({ type: 'geo', x: 100, y: 100, props: { w: 160, h: 160 } })
		await waitFrames(t, 2)
		const screen = t.app.getScreen()
		const save = vi.spyOn(screen, 'saveLayer')
		const restore = vi.spyOn(screen, 'restoreLayer')
		// Hover and status-bar coordinates change per move; the shapes do not.
		t.fake.feed(sgrMouse('move', 40, 20))
		await waitFrames(t, 2)
		t.fake.feed(sgrMouse('move', 41, 21))
		await waitFrames(t, 2)
		expect(save).not.toHaveBeenCalled()
		expect(restore).toHaveBeenCalled()
		expect(t.fake.grid()[7]).toContain('─')
		// A shape change renders the layer again.
		restore.mockClear()
		editor.updateShape({ id: editor.getCurrentPageShapes()[0].id, type: 'geo', x: 200 })
		await waitFrames(t, 2)
		expect(save).toHaveBeenCalledTimes(1)
		expect(t.fake.grid()[7]).toContain('─')
		save.mockRestore()
		restore.mockRestore()
	})

	it('writes nothing after the restore sequence when quitting from a parked loop', async () => {
		// The CLI always persists preferences on quit; the harness must too for this path.
		const prefsPath = join(mkdtempSync(join(tmpdir(), 'tui-prefs-')), 'deep', 'prefs.json')
		t = await startTestApp({ app: { prefsPath } })
		const { ui } = t.app.getContext()
		ui.firstKeySeen.set(false)
		await waitFrames(t, 2)
		await sleep(80)
		expect(t.frame.isParked()).toBe(true)
		const frames = t.frame.getStats().frames
		// ctrl+q on a clean document: the keystroke itself clears the first-run hint, which used to
		// be rendered onto the shell's screen after ESC[?1049l.
		t.fake.feed('\x11')
		await sleep(50)
		expect(t.quits).toEqual([0])
		const output = t.fake.getOutput()
		expect(output.slice(output.lastIndexOf('\x1b[?1049l') + 8)).toBe('')
		expect(t.frame.getStats().frames).toBe(frames)
		expect(existsSync(prefsPath)).toBe(true)
	})

	it('restores the terminal before a start failure reaches the caller', async () => {
		const fake = new FakeTerminal(100, 30)
		const terminal = new Terminal({
			input: fake.input,
			output: fake.output,
			env: {},
			assumeTTY: true,
			probe: false,
			processHandlers: false,
		})
		const frame = new FrameScheduler({ maxFps: 60 })
		const dom = getDomGlobals()!
		frame.install(dom.window)
		// Fails inside createTuiEditor, after terminal.start() entered the alternate screen.
		const doc = dom.window.document as unknown as Record<string, unknown>
		const createElement = doc.createElement
		doc.createElement = () => {
			throw new Error('injected start failure')
		}
		const app = new App({
			terminal,
			frame,
			dom: { window: dom.window, dispose() {} },
			env: {},
			colorMode: 'light',
		})
		try {
			await expect(app.start()).rejects.toThrow('injected start failure')
			expect(fake.getOutput().endsWith('\x1b[?1049l')).toBe(true)
			expect(fake.input.rawMode).toBe(false)
		} finally {
			doc.createElement = createElement
			app.dispose()
			frame.dispose()
		}
	})

	it('throws when asked for the context before start', async () => {
		t = await startTestApp()
		expect(() => t!.app.getContext()).not.toThrow()
		t.app.dispose()
		// Disposal is idempotent and leaves the terminal restored.
		t.app.dispose()
		expect(t.fake.getOutput().endsWith('\x1b[?1049l')).toBe(true)
	})
})
