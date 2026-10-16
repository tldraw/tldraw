import { describe, test } from 'vitest'
import { LINE_E, LINE_N, LINE_S, LINE_W, Screen } from './Screen'

const COLS = 200
const ROWS = 50
const GLYPHS = ['─', '│', '┼', 'a', 'Z', ' ', '█', '░']
const STYLES = [
	{ fg: 0xff0000 },
	{ fg: 0x00ff00, bg: 0x000000 },
	{ fg: -1 },
	{ fg: 0x1e90ff, bold: true },
]

function fill(screen: Screen, seed: number) {
	let s = seed
	const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
	for (let y = 0; y < ROWS; y++) {
		let style = STYLES[0]
		for (let x = 0; x < COLS; x++) {
			if (x % 8 === 0) style = STYLES[(rnd() * STYLES.length) | 0]
			screen.put(x, y, GLYPHS[(rnd() * GLYPHS.length) | 0], style)
		}
	}
}

/** Cells touched by a partial update: a scattered 5% of the screen. */
function sparsePositions(fraction: number): [number, number][] {
	const out: [number, number][] = []
	const step = Math.round(1 / fraction)
	for (let i = 0; i < COLS * ROWS; i += step) out.push([i % COLS, (i / COLS) | 0])
	return out
}

describe('Screen.flush 200x50', () => {
	test('diff and encode at 0%, 5% and 100% change', async ({ bench }) => {
		const idle = new Screen(COLS, ROWS)
		fill(idle, 1)
		idle.flush()

		const sparse = new Screen(COLS, ROWS)
		fill(sparse, 2)
		sparse.flush()
		const positions = sparsePositions(0.05)
		let tick = 0

		const full = new Screen(COLS, ROWS)
		let seed = 3

		const redraw = new Screen(COLS, ROWS)
		fill(redraw, 4)

		await bench.compare(
			bench('0% changed (diff only)', () => {
				idle.flush()
			}),
			bench('5% changed', () => {
				const g = tick++ & 1 ? 'x' : 'y'
				for (const [x, y] of positions) sparse.put(x, y, g)
				sparse.flush()
			}),
			bench('100% changed (fill + flush)', () => {
				fill(full, seed++)
				full.flush()
			}),
			bench('full redraw of an unchanged buffer', () => {
				redraw.setFullRedraw()
				redraw.flush()
			})
		)
	})
})

describe('Screen drawing 200x50', () => {
	test('fills, text and the line layer', async ({ bench }) => {
		const screen = new Screen(COLS, ROWS)
		const line = { fg: 0x333333, weight: 'light' as const }
		await bench.compare(
			bench('clear + fillRect + 200 text labels', () => {
				screen.clear()
				screen.fillRect({ x: 10, y: 5, w: 150, h: 30 }, ' ', { bg: 0x202020 })
				for (let i = 0; i < 200; i++) {
					screen.text((i * 7) % COLS, i % ROWS, 'label text', { fg: 0xffffff })
				}
			}),
			bench('100 boxes through the line layer + resolveLines', () => {
				screen.clear()
				for (let i = 0; i < 100; i++) {
					const x = (i * 13) % (COLS - 20)
					const y = (i * 7) % (ROWS - 6)
					for (let c = x; c < x + 20; c++) {
						screen.line(c, y, LINE_E | LINE_W, line)
						screen.line(c, y + 5, LINE_E | LINE_W, line)
					}
					for (let r = y; r <= y + 5; r++) {
						screen.line(x, r, LINE_N | LINE_S, line)
						screen.line(x + 19, r, LINE_N | LINE_S, line)
					}
				}
				screen.resolveLines()
			})
		)
	})
})
