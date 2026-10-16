import { describe, expect, it } from 'vitest'
import { InputParser, TerminalEvent } from './InputParser'

/**
 * Chunk-boundary fuzz: every known sequence is fed whole, then split at every byte position (and
 * every pair of positions), and the events must be identical. Each parser is driven the way
 * Terminal.onData drives it: after a chunk, a pending tail whose deadline has already passed is
 * flushed at once.
 */

function b(s: string): number[] {
	return Array.from(Buffer.from(s, 'utf8'))
}

const SEQUENCES: Record<string, number[]> = {
	letter: b('a'),
	'ctrl+a': b('\x01'),
	up: b('\x1b[A'),
	'ctrl+up': b('\x1b[1;5A'),
	'kitty release shift+up': b('\x1b[1;2:3A'),
	'ss3 F1': b('\x1bOP'),
	'F1 tilde': b('\x1b[11~'),
	'shift+F5': b('\x1b[15;2~'),
	'shift+tab': b('\x1b[Z'),
	'mok ctrl+enter': b('\x1b[27;5;13~'),
	'kitty shift+a with text': b('\x1b[97:65;2;65u'),
	'kitty shift press': b('\x1b[57441u'),
	'kitty shift+tab': b('\x1b[9;2u'),
	'kitty escape': b('\x1b[27u'),
	delete: b('\x1b[3~'),
	'alt+b word left': b('\x1bb'),
	'alt+a': b('\x1ba'),
	'esc esc up': b('\x1b\x1b[A'),
	'two-byte char': b('é'),
	'three-byte char': b('日'),
	'four-byte char': b('👍'),
	'alt+é': b('\x1bé'),
	'sgr down': b('\x1b[<0;11;6M'),
	'sgr drag': b('\x1b[<32;20;10M'),
	'sgr up': b('\x1b[<0;31;16m'),
	'sgr wheel': b('\x1b[<64;5;5M'),
	'sgr far away': b('\x1b[<35;500;500M'),
	'x10 col 120': [0x1b, 0x5b, 0x4d, 32, 33 + 120, 33 + 40],
	paste: b('\x1b[200~hello\x1b[201~'),
	'paste with esc inside': b('\x1b[200~a\x1b[2b\x1b[201~'),
	'paste with end look-alike': b('\x1b[200~x\x1b[201y\x1b[201~'),
	'focus in': b('\x1b[I'),
	'focus out': b('\x1b[O'),
	da1: b('\x1b[?62;22c'),
	cpr: b('\x1b[?1;2R'),
	'kitty reply': b('\x1b[?0u'),
	'osc 11 st': b('\x1b]11;rgb:1a1a/2b2b/3c3c\x1b\\'),
	'osc 11 bel': b('\x1b]11;rgb:1a1a/2b2b/3c3c\x07'),
	dcs: b('\x1bP>|kitty\x1b\\'),
	'two arrows': b('\x1b[A\x1b[B'),
	'text mouse text': b('ab\x1b[<0;1;1Mc'),
	'arrow then char': b('\x1b[Aé'),
	'mouse burst': b('\x1b[<35;1;1M\x1b[<35;2;1M\x1b[<35;3;1M'),
}

interface Run {
	events: TerminalEvent[]
	/** A chunk that was exactly ESC arrived with nothing pending: the documented Escape shortcut. */
	loneEsc: boolean
}

function run(chunks: number[][], kitty: boolean): Run {
	const parser = new InputParser({ now: () => 1000 })
	parser.setKittyActive(kitty)
	const events: TerminalEvent[] = []
	const sink = (e: TerminalEvent) => events.push(e)
	let loneEsc = false
	for (const chunk of chunks) {
		if (!parser.hasPending() && chunk.length === 1 && chunk[0] === 0x1b) loneEsc = true
		parser.feed(new Uint8Array(chunk), sink)
		// Terminal.armPendingTimer: a deadline already reached is flushed synchronously.
		while (parser.hasPending() && parser.pendingTimeoutMs() <= 0) {
			const before = events.length
			parser.flushPending(sink)
			if (!parser.hasPending() || events.length === before) break
		}
	}
	return { events, loneEsc }
}

function splits(seq: number[]): { label: string; chunks: number[][] }[] {
	const out: { label: string; chunks: number[][] }[] = []
	for (let i = 1; i < seq.length; i++) {
		out.push({ label: `@${i}`, chunks: [seq.slice(0, i), seq.slice(i)] })
	}
	if (seq.length <= 16) {
		for (let i = 1; i < seq.length; i++) {
			for (let j = i + 1; j < seq.length; j++) {
				out.push({ label: `@${i},${j}`, chunks: [seq.slice(0, i), seq.slice(i, j), seq.slice(j)] })
			}
		}
	}
	return out
}

describe.each([
	['legacy', false],
	['kitty', true],
] as const)('split sequences (%s)', (_name, kitty) => {
	for (const [name, seq] of Object.entries(SEQUENCES)) {
		it(`${name} parses the same at every chunk boundary`, () => {
			const whole = run([seq], kitty).events
			const failures: string[] = []
			for (const { label, chunks } of splits(seq)) {
				const { events: got, loneEsc } = run(chunks, kitty)
				// Documented for legacy terminals: a chunk that is exactly ESC is the Escape key. Under
				// kitty, Escape arrives as CSI 27 u, so a bare ESC can only be a split sequence.
				if (loneEsc && !kitty) continue
				if (JSON.stringify(got) !== JSON.stringify(whole)) {
					failures.push(
						`${label}: ${JSON.stringify(chunks.map((c) => Buffer.from(c).toString('latin1')))} → ${JSON.stringify(got)}`
					)
				}
			}
			expect(failures, `expected ${JSON.stringify(whole)}`).toEqual([])
		})
	}
})
