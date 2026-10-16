import { describe, test } from 'vitest'
import { InputParser } from './InputParser'

function sgrMoves(count: number): Uint8Array {
	let s = ''
	for (let i = 0; i < count; i++) s += `\x1b[<35;${1 + (i % 200)};${1 + ((i / 200) | 0)}M`
	return new Uint8Array(Buffer.from(s, 'ascii'))
}

function kittyKeys(count: number): Uint8Array {
	let s = ''
	for (let i = 0; i < count; i++) s += `\x1b[${97 + (i % 26)};${1 + (i % 3)}u`
	return new Uint8Array(Buffer.from(s, 'ascii'))
}

function legacyKeys(count: number): Uint8Array {
	let s = ''
	for (let i = 0; i < count; i++)
		s += i % 7 === 0 ? '\x1b[1;5A' : String.fromCharCode(97 + (i % 26))
	return new Uint8Array(Buffer.from(s, 'ascii'))
}

const sink = () => {}

describe('InputParser', () => {
	test('one stdin chunk of 1000 sequences', async ({ bench }) => {
		const parser = new InputParser()
		const moves = sgrMoves(1000)
		const kitty = kittyKeys(1000)
		const legacy = legacyKeys(1000)
		await bench.compare(
			bench('1000 SGR mouse moves', () => {
				parser.feed(moves, sink)
			}),
			bench('1000 kitty key sequences', () => {
				parser.feed(kitty, sink)
			}),
			bench('1000 legacy keys (letters and CSI arrows)', () => {
				parser.feed(legacy, sink)
			})
		)
	})

	test('one sequence per chunk', async ({ bench }) => {
		const parser = new InputParser()
		const move = sgrMoves(1)
		const letter = new Uint8Array([0x61])
		await bench.compare(
			bench('one SGR mouse move', () => {
				parser.feed(move, sink)
			}),
			bench('one letter', () => {
				parser.feed(letter, sink)
			})
		)
	})
})
