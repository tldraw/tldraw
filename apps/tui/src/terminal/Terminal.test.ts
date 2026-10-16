import { afterEach, describe, expect, it } from 'vitest'
import { FakeTerminal } from '../test/FakeTerminal'
import { TerminalEvent } from './InputParser'
import { KITTY_FLAGS, PROBE_SEQUENCE } from './probe'
import { Terminal, TerminalOptions } from './Terminal'

const ENTER = '\x1b[?1049h\x1b[?25l\x1b[?7l\x1b[?1004h\x1b[?2004h'
const MOUSE_ON = '\x1b[?1000h\x1b[?1002h\x1b[?1003h\x1b[?1006h'
const MOUSE_OFF = '\x1b[?1007l'
const KITTY_PUSH = `\x1b[>${KITTY_FLAGS}u`
const MOK_ON = '\x1b[>4;2m'
const DA1 = '\x1b[?62;22c'

function restoreSequence(opts: { kitty?: boolean; mok?: boolean } = {}): string {
	let seq = '\x1b[?2026l'
	if (opts.kitty) seq += '\x1b[<u'
	if (opts.mok) seq += '\x1b[>4m'
	seq += '\x1b[?1003l\x1b[?1002l\x1b[?1000l\x1b[?1006l'
	seq += '\x1b[?2004l\x1b[?1004l\x1b[?1007h'
	seq += '\x1b[0m\x1b[?25h\x1b[?7h\x1b[?1049l'
	return seq
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

const live: Terminal[] = []

function create(fake: FakeTerminal, opts: Partial<TerminalOptions> = {}): Terminal {
	const t = new Terminal({
		input: fake.input,
		output: fake.output,
		env: {},
		assumeTTY: true,
		probe: false,
		...opts,
	})
	live.push(t)
	return t
}

/** Resolves once `start()` has written the probe, so replies can be fed. */
async function startProbing(fake: FakeTerminal, opts: Partial<TerminalOptions> = {}) {
	const t = create(fake, { probe: true, probeTimeoutMs: 200, ...opts })
	const started = t.start()
	await Promise.resolve()
	expect(fake.getOutput().includes(PROBE_SEQUENCE)).toBe(true)
	return { t, started }
}

afterEach(() => {
	for (const t of live.splice(0)) t.dispose()
})

describe('Terminal start', () => {
	it('refuses a non-tty unless told to assume one', async () => {
		const fake = new FakeTerminal()
		fake.output.isTTY = false
		const t = new Terminal({ input: fake.input, output: fake.output, env: {}, probe: false })
		await expect(t.start()).rejects.toThrow(/stdout is not a TTY/)
		fake.output.isTTY = true
		fake.input.isTTY = false
		await expect(t.start()).rejects.toThrow(/stdin is not a TTY/)
		expect(fake.getWrites()).toEqual([])
		expect(fake.input.rawMode).toBe(false)
	})

	it('enters raw mode, the alternate screen and the reporting modes, then enables modifyOtherKeys', async () => {
		const fake = new FakeTerminal(100, 30)
		const t = create(fake)
		const caps = await t.start()
		expect(fake.input.rawMode).toBe(true)
		expect(fake.input.paused).toBe(false)
		expect(fake.output.blocking).toBe(false)
		expect(fake.getOutput()).toBe(`${ENTER}${MOUSE_ON}\x1b[H${MOK_ON}`)
		expect(t.isStarted()).toBe(true)
		expect(caps).toEqual({
			kitty: false,
			truecolor: '256',
			background: null,
			ambiguousWide: false,
			mouse: true,
			hover: true,
			syncOutput: true,
			osc52: false,
			utf8: true,
			modifyOtherKeys: true,
		})
		expect(t.getCapabilities()).toBe(caps)
		expect(t.getSize()).toEqual({ cols: 100, rows: 30 })
	})

	it('is idempotent', async () => {
		const fake = new FakeTerminal()
		const t = create(fake)
		const caps = await t.start()
		const n = fake.getWrites().length
		expect(await t.start()).toBe(caps)
		expect(fake.getWrites().length).toBe(n)
	})

	it('disables alternate scroll instead of enabling the mouse when mouse is off', async () => {
		const fake = new FakeTerminal()
		const t = create(fake, { mouse: false })
		const caps = await t.start()
		expect(fake.getOutput()).toBe(`${ENTER}${MOUSE_OFF}\x1b[H${MOK_ON}`)
		expect(caps.mouse).toBe(false)
		expect(caps.hover).toBe(false)
	})

	it('derives capabilities from the environment', async () => {
		const fake = new FakeTerminal()
		const t = create(fake, {
			env: { COLORTERM: 'truecolor', STY: '1.pts', KITTY_WINDOW_ID: '1', LANG: 'C' },
		})
		const caps = await t.start()
		expect(caps.truecolor).toBe('24bit')
		expect(caps.hover).toBe(false)
		expect(caps.osc52).toBe(true)
		expect(caps.utf8).toBe(false)
		const forced = create(new FakeTerminal(), { env: { COLORTERM: 'truecolor' }, colorMode: '16' })
		expect((await forced.start()).truecolor).toBe('16')
	})

	it('can skip modifyOtherKeys', async () => {
		const fake = new FakeTerminal()
		const t = create(fake, { modifyOtherKeys: false })
		const caps = await t.start()
		expect(fake.getOutput().includes(MOK_ON)).toBe(false)
		expect(caps.modifyOtherKeys).toBe(false)
	})

	it('does not touch process handlers unless asked', async () => {
		const before = process.listenerCount('SIGCONT')
		const t = create(new FakeTerminal())
		await t.start()
		expect(process.listenerCount('SIGCONT')).toBe(before)
	})

	it('installs and removes process handlers when asked', async () => {
		const before = {
			exit: process.listenerCount('exit'),
			sigcont: process.listenerCount('SIGCONT'),
			sighup: process.listenerCount('SIGHUP'),
			rejection: process.listenerCount('unhandledRejection'),
		}
		const t = create(new FakeTerminal(), { processHandlers: true })
		await t.start()
		expect(process.listenerCount('exit')).toBe(before.exit + 1)
		expect(process.listenerCount('SIGCONT')).toBe(before.sigcont + 1)
		expect(process.listenerCount('SIGHUP')).toBe(before.sighup + 1)
		expect(process.listenerCount('unhandledRejection')).toBe(before.rejection + 1)
		t.dispose()
		expect(process.listenerCount('exit')).toBe(before.exit)
		expect(process.listenerCount('SIGCONT')).toBe(before.sigcont)
		expect(process.listenerCount('SIGHUP')).toBe(before.sighup)
		expect(process.listenerCount('unhandledRejection')).toBe(before.rejection)
	})
})

describe('Terminal probe', () => {
	it('writes the probe after entering the modes and resolves on the DA1 fence', async () => {
		const fake = new FakeTerminal()
		const { t, started } = await startProbing(fake)
		expect(fake.getOutput()).toBe(`${ENTER}${MOUSE_ON}\x1b[H${PROBE_SEQUENCE}`)
		fake.feed('\x1b[?1;2R')
		fake.feed('\x1b[?0u')
		fake.feed('\x1b]11;rgb:1e1e/1e1e/1e1e\x1b\\')
		fake.feed(DA1)
		const caps = await started
		expect(caps.kitty).toBe(true)
		expect(caps.background).toBe(0x1e1e1e)
		expect(caps.ambiguousWide).toBe(false)
		expect(caps.modifyOtherKeys).toBe(false)
		// The probe glyph is erased, then the kitty flags are pushed; modifyOtherKeys stays off.
		expect(fake.getOutput().slice(`${ENTER}${MOUSE_ON}\x1b[H${PROBE_SEQUENCE}`.length)).toBe(
			`\x1b[1;1H \x1b[H${KITTY_PUSH}`
		)
		expect(t.isStarted()).toBe(true)
	})

	it('pushes kitty flags only after a positive CSI ? u reply', async () => {
		const fake = new FakeTerminal()
		const { started } = await startProbing(fake)
		fake.feed('\x1b[?1;3R' + DA1)
		const caps = await started
		expect(caps.kitty).toBe(false)
		expect(caps.ambiguousWide).toBe(true)
		expect(caps.background).toBeNull()
		expect(caps.modifyOtherKeys).toBe(true)
		expect(fake.getOutput().includes(KITTY_PUSH)).toBe(false)
		expect(fake.getOutput().endsWith(`\x1b[1;1H \x1b[H${MOK_ON}`)).toBe(true)
	})

	it('accepts replies that arrive interleaved with user input and still delivers the input', async () => {
		const fake = new FakeTerminal()
		const { t, started } = await startProbing(fake)
		const events: TerminalEvent[] = []
		t.onEvent((e) => events.push(e))
		fake.feed('q\x1b[?27u\x1b[?1;2R' + DA1 + 'r')
		const caps = await started
		expect(caps.kitty).toBe(true)
		expect(events.map((e) => (e.type === 'key' ? e.key : e.type))).toEqual([
			'q',
			'reply',
			'reply',
			'reply',
			'r',
		])
	})

	it('gives up after the timeout when the terminal never answers', async () => {
		const fake = new FakeTerminal()
		const { started } = await startProbing(fake, { probeTimeoutMs: 20 })
		const caps = await started
		expect(caps.kitty).toBe(false)
		expect(caps.background).toBeNull()
		expect(fake.getOutput().endsWith(`\x1b[1;1H \x1b[H${MOK_ON}`)).toBe(true)
	})

	it('ignores replies that arrive after the probe settled', async () => {
		const fake = new FakeTerminal()
		const { t, started } = await startProbing(fake)
		fake.feed(DA1)
		const caps = await started
		fake.feed('\x1b[?27u')
		expect(t.getCapabilities()).toBe(caps)
		expect(caps.kitty).toBe(false)
		expect(fake.getOutput().includes(KITTY_PUSH)).toBe(false)
	})
})

describe('Terminal input', () => {
	it('delivers parsed events to listeners and supports unsubscribe', async () => {
		const fake = new FakeTerminal()
		const t = create(fake)
		await t.start()
		const a: TerminalEvent[] = []
		const b: TerminalEvent[] = []
		const offA = t.onEvent((e) => a.push(e))
		t.onEvent((e) => b.push(e))
		fake.feed('x\x1b[<0;2;3M')
		expect(a).toHaveLength(2)
		expect(a[0]).toMatchObject({ type: 'key', key: 'x' })
		expect(a[1]).toMatchObject({ type: 'mouse', action: 'down', col: 1, row: 2 })
		offA()
		fake.feed(new Uint8Array([0x0d]))
		expect(a).toHaveLength(2)
		expect(b).toHaveLength(3)
		expect(b[2]).toMatchObject({ type: 'key', key: 'Enter' })
	})

	it('reports resizes with the new size', async () => {
		const fake = new FakeTerminal(80, 24)
		const t = create(fake)
		await t.start()
		const events: TerminalEvent[] = []
		t.onEvent((e) => events.push(e))
		fake.resize(132, 43)
		expect(events).toEqual([{ type: 'resize', cols: 132, rows: 43 }])
		expect(t.getSize()).toEqual({ cols: 132, rows: 43 })
	})

	it('falls back to 80x24 when the output has no size', async () => {
		const fake = new FakeTerminal()
		;(fake.output as { columns?: number }).columns = undefined
		;(fake.output as { rows?: number }).rows = undefined
		const t = create(fake)
		expect(t.getSize()).toEqual({ cols: 80, rows: 24 })
	})

	it('releases a trailing ESC as Escape from a timer', async () => {
		const fake = new FakeTerminal()
		const t = create(fake, { parser: { escTimeoutMs: 5 } })
		await t.start()
		const events: TerminalEvent[] = []
		t.onEvent((e) => events.push(e))
		fake.feed('a\x1b')
		expect(events).toHaveLength(1)
		await wait(30)
		expect(events).toHaveLength(2)
		expect(events[1]).toMatchObject({ type: 'key', key: 'Escape' })
	})

	it('discards a split sequence that never completes', async () => {
		const fake = new FakeTerminal()
		const t = create(fake, { parser: { partialTimeoutMs: 5 } })
		await t.start()
		const events: TerminalEvent[] = []
		t.onEvent((e) => events.push(e))
		fake.feed('\x1b[1;')
		await wait(30)
		expect(events).toEqual([])
		fake.feed('5A')
		expect(events).toEqual([
			{
				type: 'key',
				key: '5',
				code: 'Digit5',
				shift: false,
				ctrl: false,
				alt: false,
				meta: false,
				text: '5',
			},
			{
				type: 'key',
				key: 'A',
				code: 'KeyA',
				shift: true,
				ctrl: false,
				alt: false,
				meta: false,
				text: 'A',
			},
		])
	})

	it('delivers an over-long paste when its cap expires', async () => {
		const fake = new FakeTerminal()
		const t = create(fake, { parser: { pasteTimeoutMs: 5 } })
		await t.start()
		const events: TerminalEvent[] = []
		t.onEvent((e) => events.push(e))
		fake.feed('\x1b[200~abc')
		expect(events).toEqual([])
		await wait(30)
		expect(events).toEqual([{ type: 'paste', text: 'abc' }])
	})

	it('turns the esc timeout off once kitty is negotiated', async () => {
		const fake = new FakeTerminal()
		const { t, started } = await startProbing(fake)
		fake.feed('\x1b[?1u' + DA1)
		await started
		const events: TerminalEvent[] = []
		t.onEvent((e) => events.push(e))
		fake.feed('a\x1b')
		expect(events).toHaveLength(2)
		expect(events[1]).toMatchObject({ type: 'key', key: 'Escape' })
	})
})

describe('Terminal output', () => {
	it('counts writes and reports backpressure when write returns false, until drain', async () => {
		const fake = new FakeTerminal()
		const t = create(fake)
		await t.start()
		fake.clearWrites()
		const before = t.getStats()
		t.write('')
		expect(fake.getWrites()).toEqual([])
		t.write('abc')
		expect(fake.getWrites().map((w) => w.data)).toEqual(['abc'])
		expect(t.getStats()).toEqual({
			bytesWritten: before.bytesWritten + 3,
			writeCount: before.writeCount + 1,
		})
		expect(t.isBlocked()).toBe(false)
		let drained = 0
		const off = t.onDrain(() => drained++)
		fake.output.writeResult = false
		t.write('frame')
		expect(t.isBlocked()).toBe(true)
		fake.output.writeResult = true
		fake.output.emitDrain()
		expect(t.isBlocked()).toBe(false)
		expect(drained).toBe(1)
		off()
		fake.output.writeResult = false
		t.write('frame')
		fake.output.emitDrain()
		expect(drained).toBe(1)
	})

	it('polls for a drain when bytes sit below the high-water mark', async () => {
		const fake = new FakeTerminal()
		const t = create(fake)
		await t.start()
		let drained = 0
		t.onDrain(() => drained++)
		fake.output.writableLength = 10
		t.write('frame')
		expect(t.isBlocked()).toBe(true)
		await wait(15)
		expect(drained).toBe(0)
		fake.output.writableLength = 0
		await wait(30)
		expect(drained).toBe(1)
		expect(t.isBlocked()).toBe(false)
	})

	it('shows the real cursor once and then only moves it; hides it once', async () => {
		const fake = new FakeTerminal()
		const t = create(fake)
		await t.start()
		fake.clearWrites()
		t.hideCursor()
		expect(fake.getWrites()).toEqual([])
		t.showCursorAt(4, 2)
		t.showCursorAt(5, 2)
		t.hideCursor()
		t.hideCursor()
		expect(fake.getWrites().map((w) => w.data)).toEqual([
			'\x1b[3;5H\x1b[?25h',
			'\x1b[3;6H',
			'\x1b[?25l',
		])
	})
})

describe('Terminal stop', () => {
	it('restores the terminal in the documented order and leaves raw mode', async () => {
		const fake = new FakeTerminal()
		const t = create(fake)
		await t.start()
		fake.clearWrites()
		t.stop()
		expect(fake.getWrites().map((w) => w.data)).toEqual([restoreSequence({ mok: true })])
		expect(fake.input.rawMode).toBe(false)
		expect(fake.input.paused).toBe(true)
		expect(t.isStarted()).toBe(false)
	})

	it('pops the kitty flags when they were pushed', async () => {
		const fake = new FakeTerminal()
		const { t, started } = await startProbing(fake)
		fake.feed('\x1b[?0u' + DA1)
		await started
		fake.clearWrites()
		t.stop()
		expect(fake.getWrites().map((w) => w.data)).toEqual([restoreSequence({ kitty: true })])
	})

	it('omits the modifyOtherKeys reset when it was never enabled', async () => {
		const fake = new FakeTerminal()
		const t = create(fake, { modifyOtherKeys: false })
		await t.start()
		fake.clearWrites()
		t.stop()
		expect(fake.getWrites().map((w) => w.data)).toEqual([restoreSequence()])
	})

	it('is idempotent and stops listening to the streams', async () => {
		const fake = new FakeTerminal()
		const t = create(fake)
		await t.start()
		const events: TerminalEvent[] = []
		t.onEvent((e) => events.push(e))
		t.stop()
		fake.clearWrites()
		t.stop()
		t.dispose()
		expect(fake.getWrites()).toEqual([])
		fake.feed('a')
		fake.resize(10, 10)
		expect(events).toEqual([])
		expect(fake.input.listenerCount('data')).toBe(0)
		expect(fake.output.listenerCount('resize')).toBe(0)
		expect(fake.output.listenerCount('drain')).toBe(0)
	})

	it('does nothing when never started', () => {
		const fake = new FakeTerminal()
		const t = create(fake)
		t.stop()
		expect(fake.getWrites()).toEqual([])
	})

	it('cancels a pending esc timer so no event fires after stop', async () => {
		const fake = new FakeTerminal()
		const t = create(fake, { parser: { escTimeoutMs: 5 } })
		await t.start()
		const events: TerminalEvent[] = []
		t.onEvent((e) => events.push(e))
		fake.feed('a\x1b')
		t.stop()
		await wait(30)
		expect(events).toHaveLength(1)
	})

	it('uses a synchronous fd write for the restore when the output has one', async () => {
		const fake = new FakeTerminal()
		const output = fake.output as typeof fake.output & { fd?: number }
		output.fd = -1
		const t = create(fake)
		await t.start()
		fake.clearWrites()
		// writeSync on an invalid fd throws; the stream write is the fallback.
		t.stop()
		expect(fake.getWrites().map((w) => w.data)).toEqual([restoreSequence({ mok: true })])
	})
})

describe('Terminal resume', () => {
	it('re-enters the modes after SIGCONT and asks the app to repaint', async () => {
		const fake = new FakeTerminal()
		const { t, started } = await startProbing(fake)
		fake.feed('\x1b[?0u' + DA1)
		await started
		let resumed = 0
		const off = t.onResume(() => resumed++)
		fake.clearWrites()
		t.resume()
		expect(fake.getOutput()).toBe(`${ENTER}${MOUSE_ON}\x1b[H\x1b[<u${KITTY_PUSH}`)
		expect(resumed).toBe(1)
		expect(fake.input.listenerCount('data')).toBe(1)
		fake.clearWrites()
		t.stop()
		expect(fake.getOutput()).toBe(restoreSequence({ kitty: true }))
		off()
		t.resume()
		expect(resumed).toBe(1)
	})
})
