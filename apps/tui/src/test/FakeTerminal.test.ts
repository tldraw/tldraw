import { describe, expect, it } from 'vitest'
import { ansiToGrid, FakeInput, FakeOutput, FakeTerminal, stripAnsi } from './FakeTerminal'

describe('FakeInput', () => {
	it('tracks raw mode and flow state like a tty stream', () => {
		const input = new FakeInput()
		expect(input.isTTY).toBe(true)
		expect(input.rawMode).toBe(false)
		expect(input.paused).toBe(true)
		input.setRawMode(true)
		input.resume()
		expect(input.rawMode).toBe(true)
		expect(input.paused).toBe(false)
		input.pause()
		expect(input.paused).toBe(true)
	})
})

describe('FakeOutput', () => {
	it('logs writes with monotonic hrtime stamps and returns the configured result', () => {
		const out = new FakeOutput(80, 24)
		expect(out.columns).toBe(80)
		expect(out.rows).toBe(24)
		expect(out.isTTY).toBe(true)
		expect(out.write('a')).toBe(true)
		out.writeResult = false
		expect(out.write('b')).toBe(false)
		expect(out.writes.map((w) => w.data)).toEqual(['a', 'b'])
		expect(typeof out.writes[0].time).toBe('bigint')
		expect(out.writes[1].time >= out.writes[0].time).toBe(true)
	})

	it('exposes a handle whose setBlocking is observable and a drain emitter', () => {
		const out = new FakeOutput(10, 2)
		expect(out.blocking).toBe(true)
		out._handle.setBlocking(false)
		expect(out.blocking).toBe(false)
		let drained = 0
		out.on('drain', () => drained++)
		out.writableLength = 42
		out.emitDrain()
		expect(out.writableLength).toBe(0)
		expect(drained).toBe(1)
	})
})

describe('FakeTerminal', () => {
	it('feeds strings and byte arrays as Buffers on the input', () => {
		const fake = new FakeTerminal(20, 5)
		const chunks: Buffer[] = []
		fake.input.on('data', (c: Buffer) => chunks.push(c))
		fake.feed('aé')
		fake.feed(new Uint8Array([0x1b, 0x5b]))
		expect(chunks.every((c) => Buffer.isBuffer(c))).toBe(true)
		expect([...chunks[0]]).toEqual([0x61, 0xc3, 0xa9])
		expect([...chunks[1]]).toEqual([0x1b, 0x5b])
	})

	it('resizes and emits resize', () => {
		const fake = new FakeTerminal(20, 5)
		let resized = 0
		fake.output.on('resize', () => resized++)
		fake.resize(30, 8)
		expect(fake.output.columns).toBe(30)
		expect(fake.output.rows).toBe(8)
		expect(resized).toBe(1)
	})

	it('collects, joins and clears writes and replays them into a grid', () => {
		const fake = new FakeTerminal(6, 2)
		fake.output.write('\x1b[1;2Hab')
		fake.output.write('\x1b[2;1Hcd')
		expect(fake.getWrites()).toHaveLength(2)
		expect(fake.getOutput()).toBe('\x1b[1;2Hab\x1b[2;1Hcd')
		expect(fake.grid()).toEqual([' ab', 'cd'])
		fake.clearWrites()
		expect(fake.getWrites()).toEqual([])
		expect(fake.getOutput()).toBe('')
		expect(fake.grid()).toEqual(['', ''])
	})

	it('defaults to 100x30', () => {
		const fake = new FakeTerminal()
		expect(fake.output.columns).toBe(100)
		expect(fake.output.rows).toBe(30)
	})
})

describe('stripAnsi', () => {
	it('removes CSI, OSC and two-byte escapes but keeps text', () => {
		expect(stripAnsi('\x1b[1;2H\x1b[38;2;1;2;3mhi\x1b[0m')).toBe('hi')
		expect(stripAnsi('\x1b[?2026ha\x1b[?2026l')).toBe('a')
		expect(stripAnsi('\x1b]11;?\x1b\\b\x1b]52;c;xyz\x07c')).toBe('bc')
		expect(stripAnsi('\x1b=d\x1b>e')).toBe('de')
		expect(stripAnsi('plain')).toBe('plain')
		expect(stripAnsi('\x1b[<0;1;1M\x1b[>27u')).toBe('')
	})
})

describe('ansiToGrid', () => {
	it('starts blank and places text at the cursor', () => {
		expect(ansiToGrid('', 4, 2)).toEqual(['', ''])
		expect(ansiToGrid('ab', 4, 2)).toEqual(['ab', ''])
	})

	it('handles CUP with and without parameters, and the f alias', () => {
		expect(ansiToGrid('\x1b[2;3Hx\x1b[Hy', 4, 2)).toEqual(['y', '  x'])
		expect(ansiToGrid('\x1b[2;3fx', 4, 2)).toEqual(['', '  x'])
		expect(ansiToGrid('\x1b[;4Hx', 4, 2)).toEqual(['   x', ''])
		expect(ansiToGrid('\x1b[2Hx', 4, 2)).toEqual(['', 'x'])
	})

	it('handles relative cursor moves and column addressing with clamping', () => {
		// Unsupported CSI finals (CNL here) are ignored; Screen never emits them.
		expect(ansiToGrid('\x1b[2;2Ha\x1b[Ab\x1b[2Bc\x1b[2Cd\x1b[Ee\x1b[4Gf', 10, 3)).toEqual([
			'  b',
			' a',
			'   f  de',
		])
		expect(ansiToGrid('\x1b[5A\x1b[1;4Hx\x1b[9Dy', 4, 2)).toEqual(['y  x', ''])
	})

	it('handles ED and EL', () => {
		expect(ansiToGrid('abcd\x1b[2Jx', 4, 1)).toEqual(['   x'])
		expect(ansiToGrid('abcd\x1b[1;2H\x1b[K', 4, 1)).toEqual(['a'])
		expect(ansiToGrid('abcd\x1b[3J', 4, 1)).toEqual([''])
		expect(ansiToGrid('abcd\x1b[1;1H\x1b[J', 4, 1)).toEqual(['abcd'])
	})

	it('handles CR and LF', () => {
		expect(ansiToGrid('ab\rc', 4, 2)).toEqual(['cb', ''])
		expect(ansiToGrid('ab\nc', 4, 2)).toEqual(['ab', '  c'])
		expect(ansiToGrid('a\n\n\nb', 4, 2)).toEqual(['a', ' b'])
	})

	it('ignores SGR, private modes, OSC strings and other escapes', () => {
		expect(ansiToGrid('\x1b[?2026h\x1b[0;1;38;2;1;2;3ma\x1b[?25l\x1b[?2026l', 3, 1)).toEqual(['a'])
		expect(ansiToGrid('\x1b]11;rgb:00/00/00\x1b\\a\x1b]52;c;x\x07b', 3, 1)).toEqual(['ab'])
		expect(ansiToGrid('\x1b>a\x1b=b', 3, 1)).toEqual(['ab'])
		expect(ansiToGrid('\x1b[>27ua\x1b[<ub', 3, 1)).toEqual(['ab'])
	})

	it('gives wide graphemes two cells and skips zero-width ones', () => {
		expect(ansiToGrid('日a', 4, 1)).toEqual(['日a'])
		const grid = ansiToGrid('\x1b[1;2H日x', 5, 1)
		expect(grid).toEqual([' 日x'])
		expect(ansiToGrid('é​z', 4, 1)).toEqual(['éz'])
		expect(ansiToGrid('👨‍👩‍👧!', 4, 1)).toEqual(['👨‍👩‍👧!'])
	})

	it('does not wrap: writing past the last column overwrites it', () => {
		expect(ansiToGrid('abcdef', 4, 2)).toEqual(['abcf', ''])
		expect(ansiToGrid('\x1b[1;4H日', 4, 1)).toEqual(['   日'])
	})

	it('trims trailing spaces per row but keeps leading ones', () => {
		expect(ansiToGrid('\x1b[1;3Ha  ', 6, 1)).toEqual(['  a'])
	})

	it('treats an unterminated OSC as consuming the rest', () => {
		expect(ansiToGrid('a\x1b]11;rgb', 4, 1)).toEqual(['a'])
	})
})
