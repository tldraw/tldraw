import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { App, type AppOptions } from '../App'
import { getDomGlobals } from '../bootstrap/dom'
import { FrameScheduler } from '../bootstrap/frame'
import { Terminal, type TerminalOptions } from '../terminal/Terminal'
import { FakeTerminal } from './FakeTerminal'

export interface TestAppOptions {
	cols?: number
	rows?: number
	maxFps?: number
	terminal?: Partial<TerminalOptions>
	app?: Partial<Omit<AppOptions, 'terminal' | 'frame' | 'dom' | 'onQuit'>>
}

export interface TestApp {
	app: App
	fake: FakeTerminal
	terminal: Terminal
	frame: FrameScheduler
	quits: number[]
	/** A fresh directory for files the test writes; removed by `dispose()`. */
	dir: string
	dispose(): void
}

/**
 * A started App over an in-memory tty: the DOM from the vitest setup file, a real FrameScheduler
 * installed on the window for the test's duration, no probe, no process handlers, no prefs file.
 */
export async function startTestApp(opts: TestAppOptions = {}): Promise<TestApp> {
	const cols = opts.cols ?? 100
	const rows = opts.rows ?? 30
	const fake = new FakeTerminal(cols, rows)
	const terminal = new Terminal({
		input: fake.input,
		output: fake.output,
		env: {},
		assumeTTY: true,
		probe: false,
		processHandlers: false,
		...opts.terminal,
	})
	const frame = new FrameScheduler({ maxFps: opts.maxFps ?? 60 })
	const dom = getDomGlobals()
	if (!dom) throw new Error('installDomGlobals() must run before startTestApp()')
	frame.install(dom.window)
	const dir = mkdtempSync(join(tmpdir(), 'tldraw-tui-app-'))
	const quits: number[] = []
	const app = new App({
		terminal,
		frame,
		// The DOM is shared by every test in the worker; the App must not close it.
		dom: { window: dom.window, dispose() {} },
		env: { XDG_CONFIG_HOME: dir },
		colorMode: 'light',
		glyphs: 'rich',
		...opts.app,
		onQuit: (code) => quits.push(code),
	})
	await app.start()
	return {
		app,
		fake,
		terminal,
		frame,
		quits,
		dir,
		dispose() {
			app.dispose()
			frame.dispose()
			rmSync(dir, { recursive: true, force: true })
		},
	}
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Waits until the scheduler has run `count` more frames (or `timeoutMs` passed). */
export async function waitFrames(t: TestApp, count = 2, timeoutMs = 1000): Promise<void> {
	const target = t.frame.getStats().frames + count
	const deadline = performance.now() + timeoutMs
	t.frame.kick()
	while (t.frame.getStats().frames < target && performance.now() < deadline) {
		await sleep(2)
	}
}

/** SGR mouse report for a 0-based cell. */
export function sgrMouse(
	action: 'down' | 'up' | 'move' | 'drag' | 'wheelUp' | 'wheelDown',
	col: number,
	row: number,
	button = 0
): string {
	let b: number
	let final = 'M'
	switch (action) {
		case 'down':
			b = button
			break
		case 'up':
			b = button
			final = 'm'
			break
		case 'move':
			b = 32 + 3
			break
		case 'drag':
			b = 32 + button
			break
		case 'wheelUp':
			b = 64
			break
		case 'wheelDown':
			b = 65
			break
	}
	return `\x1b[<${b};${col + 1};${row + 1}${final}`
}

/** Feeds a left-button drag from one cell to another, one event per chunk, waiting for frames. */
export async function dragLeft(
	t: TestApp,
	col0: number,
	row0: number,
	col1: number,
	row1: number
): Promise<void> {
	t.fake.feed(sgrMouse('down', col0, row0))
	await waitFrames(t, 1)
	t.fake.feed(sgrMouse('drag', Math.floor((col0 + col1) / 2), Math.floor((row0 + row1) / 2)))
	await waitFrames(t, 1)
	t.fake.feed(sgrMouse('drag', col1, row1))
	await waitFrames(t, 1)
	t.fake.feed(sgrMouse('up', col1, row1))
	await waitFrames(t, 2)
}

export function gridText(t: TestApp): string {
	return t.fake.grid().join('\n')
}
