import { EventEmitter } from 'node:events'
import { InputLike, OutputLike } from '../terminal/Terminal'
import { cellWidth, graphemes } from '../terminal/width'

export interface FakeWrite {
	data: string
	/** process.hrtime.bigint() at the moment of the write, for latency tests. */
	time: bigint
}

export class FakeInput extends EventEmitter implements InputLike {
	isTTY = true
	rawMode = false
	paused = true

	setRawMode(b: boolean): void {
		this.rawMode = b
	}

	resume(): void {
		this.paused = false
	}

	pause(): void {
		this.paused = true
	}
}

export class FakeOutput extends EventEmitter implements OutputLike {
	columns: number
	rows: number
	isTTY = true
	writableLength = 0
	blocking = true
	/** What `write()` returns; set false to simulate backpressure, then call `emitDrain()`. */
	writeResult = true
	readonly writes: FakeWrite[] = []
	_handle = { setBlocking: (b: boolean) => this.setBlocking(b) }

	constructor(columns: number, rows: number) {
		super()
		this.columns = columns
		this.rows = rows
	}

	setBlocking(b: boolean): void {
		this.blocking = b
	}

	write(s: string): boolean {
		this.writes.push({ data: s, time: process.hrtime.bigint() })
		return this.writeResult
	}

	emitDrain(): void {
		this.writableLength = 0
		this.emit('drain')
	}
}

/** An in-memory tty pair for tests: feed input bytes, inspect output writes or the resulting grid. */
export class FakeTerminal {
	readonly input = new FakeInput()
	readonly output: FakeOutput

	constructor(cols = 100, rows = 30) {
		this.output = new FakeOutput(cols, rows)
	}

	feed(bytes: Uint8Array | string): void {
		this.input.emit('data', typeof bytes === 'string' ? Buffer.from(bytes, 'utf8') : Buffer.from(bytes))
	}

	resize(cols: number, rows: number): void {
		this.output.columns = cols
		this.output.rows = rows
		this.output.emit('resize')
	}

	getWrites(): FakeWrite[] {
		return this.output.writes
	}

	getOutput(): string {
		return this.output.writes.map((w) => w.data).join('')
	}

	clearWrites(): void {
		this.output.writes.length = 0
	}

	/** Replays everything written so far into a cell grid (one string per row, trailing spaces trimmed). */
	grid(): string[] {
		return ansiToGrid(this.getOutput(), this.output.columns, this.output.rows)
	}
}

export function stripAnsi(s: string): string {
	// eslint-disable-next-line no-control-regex
	return s.replace(/\x1b\[[0-9;:<=>?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b./g, '')
}

/**
 * Minimal terminal emulation for assertions: CUP, relative cursor moves, ED/EL, autowrap off,
 * SGR and private modes ignored. Wide graphemes take two cells.
 */
export function ansiToGrid(ansi: string, cols: number, rows: number): string[] {
	const cells: string[][] = []
	for (let r = 0; r < rows; r++) cells.push(new Array<string>(cols).fill(' '))
	let row = 0
	let col = 0
	const clamp = () => {
		row = Math.max(0, Math.min(rows - 1, row))
		col = Math.max(0, Math.min(cols - 1, col))
	}
	let i = 0
	const n = ansi.length
	while (i < n) {
		const ch = ansi[i]
		if (ch === '\x1b') {
			const next = ansi[i + 1]
			if (next === '[') {
				let j = i + 2
				while (j < n && ansi.charCodeAt(j) >= 0x20 && ansi.charCodeAt(j) <= 0x3f) j++
				const params = ansi.slice(i + 2, j)
				const final = ansi[j]
				i = j + 1
				const nums = params.replace(/^[<=>?]/, '').split(';').map((p) => (p === '' ? NaN : Number(p)))
				const p0 = Number.isNaN(nums[0]) ? 1 : nums[0]
				if (/^[<=>?]/.test(params)) continue
				switch (final) {
					case 'H':
					case 'f':
						row = p0 - 1
						col = (Number.isNaN(nums[1]) || nums[1] === undefined ? 1 : nums[1]) - 1
						clamp()
						break
					case 'A':
						row -= p0
						clamp()
						break
					case 'B':
						row += p0
						clamp()
						break
					case 'C':
						col += p0
						clamp()
						break
					case 'D':
						col -= p0
						clamp()
						break
					case 'G':
						col = p0 - 1
						clamp()
						break
					case 'J':
						if (nums[0] === 2 || nums[0] === 3) {
							for (const r of cells) r.fill(' ')
						}
						break
					case 'K':
						for (let c = col; c < cols; c++) cells[row][c] = ' '
						break
					default:
						break
				}
				continue
			}
			if (next === ']') {
				const bel = ansi.indexOf('\x07', i)
				const st = ansi.indexOf('\x1b\\', i)
				const end = bel === -1 ? st : st === -1 ? bel : Math.min(bel, st)
				i = end === -1 ? n : end + (end === st ? 2 : 1)
				continue
			}
			i += 2
			continue
		}
		if (ch === '\r') {
			col = 0
			i++
			continue
		}
		if (ch === '\n') {
			row = Math.min(rows - 1, row + 1)
			i++
			continue
		}
		// Take one grapheme starting at i.
		let j = i + 1
		while (j < n && ansi[j] !== '\x1b' && ansi[j] !== '\r' && ansi[j] !== '\n') j++
		const run = ansi.slice(i, j)
		for (const g of graphemes(run)) {
			const w = cellWidth(g)
			if (w === 0) continue
			if (col < cols && row < rows) {
				cells[row][col] = g
				if (w === 2 && col + 1 < cols) cells[row][col + 1] = ''
			}
			col = Math.min(cols - 1, col + w)
		}
		i = j
	}
	return cells.map((r) => r.join('').replace(/ +$/, ''))
}
