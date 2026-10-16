import { describe, expect, it } from 'vitest'
import {
	codeForKey,
	InputParser,
	InputParserOptions,
	isShiftedChar,
	KEY_CODES,
	KeyEvent,
	MouseEvent,
	TerminalEvent,
} from './InputParser'

type Chunk = string | number[] | Uint8Array

function bytes(chunk: Chunk): Uint8Array {
	if (typeof chunk === 'string') return new Uint8Array(Buffer.from(chunk, 'utf8'))
	if (Array.isArray(chunk)) return new Uint8Array(chunk)
	return chunk
}

function parse(chunks: Chunk[], opts?: InputParserOptions) {
	const parser = new InputParser(opts)
	const events: TerminalEvent[] = []
	for (const c of chunks) parser.feed(bytes(c), (e) => events.push(e))
	return { parser, events }
}

function one(chunk: Chunk, opts?: InputParserOptions): TerminalEvent {
	const { events } = parse([chunk], opts)
	expect(events).toHaveLength(1)
	return events[0]
}

function key(key: string, code: string, extra: Partial<KeyEvent> = {}): KeyEvent {
	return { type: 'key', key, code, shift: false, ctrl: false, alt: false, meta: false, ...extra }
}

function typed(ch: string, extra: Partial<KeyEvent> = {}): KeyEvent {
	return key(ch, codeForKey(ch), { text: ch, ...extra })
}

function mouse(
	action: MouseEvent['action'],
	button: MouseEvent['button'],
	col: number,
	row: number,
	extra: Partial<MouseEvent> = {}
): MouseEvent {
	return {
		type: 'mouse',
		action,
		button,
		col,
		row,
		dx: 0,
		dy: 0,
		shift: false,
		ctrl: false,
		alt: false,
		...extra,
	}
}

function x10(cb: number, col: number, row: number): number[] {
	return [0x1b, 0x5b, 0x4d, 32 + cb, 33 + col, 33 + row]
}

describe('key names and codes', () => {
	it('maps the DOM code table like packages/driver KEY_CODES, with ControlLeft for Control', () => {
		expect(KEY_CODES.Shift).toBe('ShiftLeft')
		expect(KEY_CODES.Alt).toBe('AltLeft')
		expect(KEY_CODES.Control).toBe('ControlLeft')
		expect(KEY_CODES.Meta).toBe('MetaLeft')
		expect(KEY_CODES[' ']).toBe('Space')
		expect(KEY_CODES.ArrowLeft).toBe('ArrowLeft')
	})

	it('derives codes for letters, digits, punctuation and named keys', () => {
		expect(codeForKey('a')).toBe('KeyA')
		expect(codeForKey('Z')).toBe('KeyZ')
		expect(codeForKey('7')).toBe('Digit7')
		expect(codeForKey('!')).toBe('Digit1')
		expect(codeForKey('[')).toBe('BracketLeft')
		expect(codeForKey('{')).toBe('BracketLeft')
		expect(codeForKey('/')).toBe('Slash')
		expect(codeForKey('?')).toBe('Slash')
		expect(codeForKey('Enter')).toBe('Enter')
		expect(codeForKey('F12')).toBe('F12')
		expect(codeForKey('é')).toBe('Unidentified')
		expect(codeForKey('Unknown')).toBe('Unknown')
	})

	it('knows which US-layout characters need shift', () => {
		expect(isShiftedChar('A')).toBe(true)
		expect(isShiftedChar('?')).toBe(true)
		expect(isShiftedChar('{')).toBe(true)
		expect(isShiftedChar('a')).toBe(false)
		expect(isShiftedChar('1')).toBe(false)
		expect(isShiftedChar('[')).toBe(false)
		expect(isShiftedChar('ab')).toBe(false)
	})
})

describe('printable text', () => {
	it('emits one key per character with text for insertion', () => {
		expect(one('a')).toEqual(typed('a'))
		expect(one('A')).toEqual(typed('A', { shift: true }))
		expect(one('1')).toEqual(typed('1'))
		expect(one('?')).toEqual(typed('?', { shift: true }))
		expect(one(']')).toEqual(typed(']'))
		expect(one(' ')).toEqual(key(' ', 'Space', { text: ' ' }))
		const { events } = parse(['abc'])
		expect(events).toEqual([typed('a'), typed('b'), typed('c')])
	})

	it('emits non-ascii graphemes as single keys with Unidentified codes', () => {
		expect(one('é')).toEqual(key('é', 'Unidentified', { text: 'é' }))
		expect(parse(['日本']).events).toEqual([
			key('日', 'Unidentified', { text: '日' }),
			key('本', 'Unidentified', { text: '本' }),
		])
		expect(one('👨‍👩‍👧')).toEqual(key('👨‍👩‍👧', 'Unidentified', { text: '👨‍👩‍👧' }))
		expect(parse(['éx']).events).toEqual([key('é', 'Unidentified', { text: 'é' }), typed('x')])
	})

	it('keeps UTF-8 continuity across chunk boundaries', () => {
		const { events } = parse([[0xe6], [0x97, 0xa5], [0xe6, 0x9c], [0xac, 0x61]])
		expect(events).toEqual([
			key('日', 'Unidentified', { text: '日' }),
			key('本', 'Unidentified', { text: '本' }),
			typed('a'),
		])
	})
})

describe('legacy control bytes', () => {
	it('maps C0 controls to ctrl+letter and the special keys', () => {
		expect(one([0x01])).toEqual(key('a', 'KeyA', { ctrl: true }))
		expect(one([0x1a])).toEqual(key('z', 'KeyZ', { ctrl: true }))
		expect(one([0x13])).toEqual(key('s', 'KeyS', { ctrl: true }))
		expect(one([0x08])).toEqual(key('Backspace', 'Backspace'))
		expect(one([0x7f])).toEqual(key('Backspace', 'Backspace'))
		expect(one([0x09])).toEqual(key('Tab', 'Tab'))
		expect(one([0x0d])).toEqual(key('Enter', 'Enter'))
		expect(one([0x0a])).toEqual(key('Enter', 'Enter'))
		expect(one([0x1f])).toEqual(key('/', 'Slash', { ctrl: true }))
		expect(one([0x00])).toEqual(key(' ', 'Space', { ctrl: true }))
		expect(one([0x1c])).toEqual(key('\\', 'Backslash', { ctrl: true }))
		expect(one([0x1d])).toEqual(key(']', 'BracketRight', { ctrl: true }))
		expect(one([0x1e])).toEqual(key('^', 'Digit6', { ctrl: true, shift: true }))
	})
})

describe('escape key heuristics', () => {
	it('a chunk that is exactly ESC is the Escape key, synchronously', () => {
		const { parser, events } = parse(['\x1b'])
		expect(events).toEqual([key('Escape', 'Escape')])
		expect(parser.hasPending()).toBe(false)
		const more: TerminalEvent[] = []
		parser.flushPending((e) => more.push(e))
		expect(more).toEqual([])
	})

	it('a chunk ending in ESC after other input waits for the timer, then becomes Escape', () => {
		let t = 0
		const { parser, events } = parse(['a\x1b'], { now: () => t })
		expect(events).toEqual([typed('a')])
		expect(parser.hasPending()).toBe(true)
		expect(parser.pendingTimeoutMs()).toBe(35)
		t = 20
		expect(parser.pendingTimeoutMs()).toBe(15)
		t = 40
		expect(parser.pendingTimeoutMs()).toBe(0)
		const more: TerminalEvent[] = []
		parser.flushPending((e) => more.push(e))
		expect(more).toEqual([key('Escape', 'Escape')])
		expect(parser.hasPending()).toBe(false)
	})

	it('a pending ESC joins the next chunk to form one sequence instead of Escape', () => {
		const { events, parser } = parse(['x\x1b', '[A'])
		expect(events).toEqual([typed('x'), key('ArrowUp', 'ArrowUp')])
		expect(parser.hasPending()).toBe(false)
		expect(parse(['x\x1b', 'a']).events).toEqual([typed('x'), key('a', 'KeyA', { alt: true })])
		// Two Escapes at the same instant are indistinguishable from auto-repeat.
		expect(parse(['x\x1b', '\x1b']).events).toEqual([
			typed('x'),
			key('Escape', 'Escape'),
			key('Escape', 'Escape', { repeat: true }),
		])
	})

	it('uses a custom esc timeout and zero while the kitty protocol is active', () => {
		const t = 0
		const { parser } = parse(['a\x1b'], { now: () => t, escTimeoutMs: 10 })
		expect(parser.pendingTimeoutMs()).toBe(10)
		const kitty = new InputParser({ now: () => t })
		kitty.setKittyActive(true)
		expect(kitty.isKittyActive()).toBe(true)
		kitty.feed(bytes('a\x1b'), () => {})
		expect(kitty.pendingTimeoutMs()).toBe(0)
	})

	it('a partial sequence waits 500 ms and is then discarded, never reinterpreted', () => {
		let t = 0
		const { parser, events } = parse(['\x1b['], { now: () => t })
		expect(events).toEqual([])
		expect(parser.hasPending()).toBe(true)
		expect(parser.pendingTimeoutMs()).toBe(500)
		t = 600
		const more: TerminalEvent[] = []
		parser.flushPending((e) => more.push(e))
		expect(more).toEqual([])
		expect(parser.hasPending()).toBe(false)
		expect(
			parse(['\x1b[1;'], { now: () => t, partialTimeoutMs: 50 }).parser.pendingTimeoutMs()
		).toBe(50)
	})

	it('a partial sequence completes when the rest arrives, byte by byte', () => {
		expect(parse(['\x1b[1;', '5A']).events).toEqual([key('ArrowUp', 'ArrowUp', { ctrl: true })])
		// A chunk that is exactly ESC is Escape by design, so a split must start with the introducer.
		expect(parse(['\x1b[', '<', '0;5', ';6M']).events).toEqual([mouse('down', 0, 4, 5)])
		expect(parse(['\x1bO', 'A']).events).toEqual([key('ArrowUp', 'ArrowUp')])
		expect(parse(['\x1b[<', '35;1', '1;5M\x1b[<35;', '12;5M']).events).toEqual([
			mouse('move', -1, 10, 4),
			mouse('move', -1, 11, 4),
		])
		expect(parse(['\x1b]11;rgb:00/00', '/00\x1b', '\\']).events).toEqual([
			{
				type: 'reply',
				kind: 'osc11',
				raw: '\x1b]11;rgb:00/00/00',
				data: { color: 'rgb:00/00/00' },
			},
		])
	})

	it('ESC [ alone is never alt+[ even after the timeout', () => {
		let t = 0
		const { parser } = parse(['\x1b['], { now: () => t })
		t = 1000
		const more: TerminalEvent[] = []
		parser.flushPending((e) => more.push(e))
		expect(more).toEqual([])
	})
})

describe('alt chords', () => {
	it('ESC + printable is alt+key without insertion text', () => {
		expect(one('\x1ba')).toEqual(key('a', 'KeyA', { alt: true }))
		expect(one('\x1bA')).toEqual(key('A', 'KeyA', { alt: true, shift: true }))
		expect(one('\x1b=')).toEqual(key('=', 'Equal', { alt: true }))
		expect(one('\x1b\r')).toEqual(key('Enter', 'Enter', { alt: true }))
		expect(one('\x1b\x7f')).toEqual(key('Backspace', 'Backspace', { alt: true }))
		expect(one('\x1b\x01')).toEqual(key('a', 'KeyA', { alt: true, ctrl: true }))
	})

	it('ESC b / ESC f are alt+arrows (macOS Terminal and iTerm2 word motion)', () => {
		expect(one('\x1bb')).toEqual(key('ArrowLeft', 'ArrowLeft', { alt: true }))
		expect(one('\x1bf')).toEqual(key('ArrowRight', 'ArrowRight', { alt: true }))
	})

	it('ESC + a multi-byte character is alt+that character', () => {
		expect(one('\x1bé')).toEqual(key('é', 'Unidentified', { alt: true, text: 'é' }))
		expect(parse([[0x1b, 0xc3], [0xa9]]).events).toEqual([
			key('é', 'Unidentified', { alt: true, text: 'é' }),
		])
	})

	it('ESC ESC is two Escapes and ESC ESC [ A is alt+ArrowUp', () => {
		expect(parse(['\x1b\x1b']).events).toEqual([
			key('Escape', 'Escape'),
			key('Escape', 'Escape', { repeat: true }),
		])
		expect(one('\x1b\x1b[A')).toEqual(key('ArrowUp', 'ArrowUp', { alt: true }))
		expect(one('\x1b\x1bOB')).toEqual(key('ArrowDown', 'ArrowDown', { alt: true }))
		expect(parse(['\x1b\x1bq']).events).toEqual([
			key('Escape', 'Escape'),
			key('q', 'KeyQ', { alt: true }),
		])
	})

	it('ESC O followed by a non-SS3 byte is alt+O then the byte', () => {
		expect(parse(['\x1bOx']).events).toEqual([
			key('O', 'KeyO', { alt: true, shift: true }),
			typed('x'),
		])
	})
})

describe('CSI and SS3 keys', () => {
	it('decodes cursor keys with xterm modifier parameters', () => {
		expect(one('\x1b[A')).toEqual(key('ArrowUp', 'ArrowUp'))
		expect(one('\x1b[B')).toEqual(key('ArrowDown', 'ArrowDown'))
		expect(one('\x1b[C')).toEqual(key('ArrowRight', 'ArrowRight'))
		expect(one('\x1b[D')).toEqual(key('ArrowLeft', 'ArrowLeft'))
		expect(one('\x1b[H')).toEqual(key('Home', 'Home'))
		expect(one('\x1b[F')).toEqual(key('End', 'End'))
		expect(one('\x1b[1;2A')).toEqual(key('ArrowUp', 'ArrowUp', { shift: true }))
		expect(one('\x1b[1;3A')).toEqual(key('ArrowUp', 'ArrowUp', { alt: true }))
		expect(one('\x1b[1;5A')).toEqual(key('ArrowUp', 'ArrowUp', { ctrl: true }))
		expect(one('\x1b[1;6A')).toEqual(key('ArrowUp', 'ArrowUp', { ctrl: true, shift: true }))
		expect(one('\x1b[1;8D')).toEqual(
			key('ArrowLeft', 'ArrowLeft', { ctrl: true, shift: true, alt: true })
		)
		expect(one('\x1b[1;9A')).toEqual(key('ArrowUp', 'ArrowUp', { meta: true }))
		expect(one('\x1b[Z')).toEqual(key('Tab', 'Tab', { shift: true }))
		expect(one('\x1b[1;5Z')).toEqual(key('Tab', 'Tab', { shift: true, ctrl: true }))
	})

	it('decodes SS3 keys', () => {
		expect(one('\x1bOA')).toEqual(key('ArrowUp', 'ArrowUp'))
		expect(one('\x1bOD')).toEqual(key('ArrowLeft', 'ArrowLeft'))
		expect(one('\x1bOH')).toEqual(key('Home', 'Home'))
		expect(one('\x1bOF')).toEqual(key('End', 'End'))
		expect(one('\x1bOM')).toEqual(key('Enter', 'NumpadEnter'))
		expect(one('\x1bOP')).toEqual(key('F1', 'F1'))
		expect(one('\x1bOS')).toEqual(key('F4', 'F4'))
	})

	it('decodes tilde keys with modifiers', () => {
		expect(one('\x1b[1~')).toEqual(key('Home', 'Home'))
		expect(one('\x1b[2~')).toEqual(key('Insert', 'Insert'))
		expect(one('\x1b[3~')).toEqual(key('Delete', 'Delete'))
		expect(one('\x1b[4~')).toEqual(key('End', 'End'))
		expect(one('\x1b[5~')).toEqual(key('PageUp', 'PageUp'))
		expect(one('\x1b[6~')).toEqual(key('PageDown', 'PageDown'))
		expect(one('\x1b[7~')).toEqual(key('Home', 'Home'))
		expect(one('\x1b[8~')).toEqual(key('End', 'End'))
		expect(one('\x1b[3;5~')).toEqual(key('Delete', 'Delete', { ctrl: true }))
		expect(one('\x1b[5;2~')).toEqual(key('PageUp', 'PageUp', { shift: true }))
	})

	it('decodes function keys in every common encoding', () => {
		expect(one('\x1b[11~')).toEqual(key('F1', 'F1'))
		expect(one('\x1b[12~')).toEqual(key('F2', 'F2'))
		expect(one('\x1b[13~')).toEqual(key('F3', 'F3'))
		expect(one('\x1b[14~')).toEqual(key('F4', 'F4'))
		expect(one('\x1b[15~')).toEqual(key('F5', 'F5'))
		expect(one('\x1b[17~')).toEqual(key('F6', 'F6'))
		expect(one('\x1b[18~')).toEqual(key('F7', 'F7'))
		expect(one('\x1b[19~')).toEqual(key('F8', 'F8'))
		expect(one('\x1b[20~')).toEqual(key('F9', 'F9'))
		expect(one('\x1b[21~')).toEqual(key('F10', 'F10'))
		expect(one('\x1b[23~')).toEqual(key('F11', 'F11'))
		expect(one('\x1b[24~')).toEqual(key('F12', 'F12'))
		expect(one('\x1b[1;2P')).toEqual(key('F1', 'F1', { shift: true }))
		expect(one('\x1b[1;5Q')).toEqual(key('F2', 'F2', { ctrl: true }))
		expect(one('\x1b[1;2R')).toEqual(key('F3', 'F3', { shift: true }))
		expect(one('\x1b[1;3S')).toEqual(key('F4', 'F4', { alt: true }))
		expect(one('\x1b[15;2~')).toEqual(key('F5', 'F5', { shift: true }))
		expect(one('\x1b[21;3~')).toEqual(key('F10', 'F10', { alt: true }))
	})

	it('reports unknown CSI sequences as replies instead of dropping or mistyping them', () => {
		expect(one('\x1b[99~')).toEqual({ type: 'reply', kind: 'unknown', raw: '\x1b[99~' })
		expect(one('\x1b[?1h')).toEqual({ type: 'reply', kind: 'unknown', raw: '\x1b[?1h' })
		expect(one('\x1b[>1;2A')).toEqual({ type: 'reply', kind: 'unknown', raw: '\x1b[>1;2A' })
	})

	it('skips a CSI with an invalid final byte', () => {
		expect(parse(['\x1b[1\x01a']).events).toEqual([typed('a')])
	})
})

describe('xterm modifyOtherKeys', () => {
	it('decodes CSI 27 ; mods ; codepoint ~', () => {
		expect(one('\x1b[27;5;13~')).toEqual(key('Enter', 'Enter', { ctrl: true }))
		expect(one('\x1b[27;6;103~')).toEqual(key('G', 'KeyG', { ctrl: true, shift: true }))
		expect(one('\x1b[27;3;91~')).toEqual(key('[', 'BracketLeft', { alt: true }))
		expect(one('\x1b[27;5;61~')).toEqual(key('=', 'Equal', { ctrl: true }))
		expect(one('\x1b[27;5;39~')).toEqual(key("'", 'Quote', { ctrl: true }))
		expect(one('\x1b[27;2;97~')).toEqual(key('A', 'KeyA', { shift: true, text: 'A' }))
		expect(one('\x1b[27;5;32~')).toEqual(key(' ', 'Space', { ctrl: true }))
	})
})

describe('kitty keyboard protocol', () => {
	it('decodes Escape as CSI 27 u and the functional keys', () => {
		expect(one('\x1b[27u')).toEqual(key('Escape', 'Escape'))
		expect(one('\x1b[13u')).toEqual(key('Enter', 'Enter'))
		expect(one('\x1b[13;5u')).toEqual(key('Enter', 'Enter', { ctrl: true }))
		expect(one('\x1b[9;2u')).toEqual(key('Tab', 'Tab', { shift: true }))
		expect(one('\x1b[127;3u')).toEqual(key('Backspace', 'Backspace', { alt: true }))
		expect(one('\x1b[57417u')).toEqual(key('ArrowLeft', 'ArrowLeft'))
		expect(one('\x1b[57426;5u')).toEqual(key('Delete', 'Delete', { ctrl: true }))
		expect(one('\x1b[57414u')).toEqual(key('Enter', 'NumpadEnter'))
		expect(one('\x1b[57376u')).toEqual(key('F13', 'F13'))
	})

	it('decodes letters with the base layout key for shortcuts and the text field for insertion', () => {
		expect(one('\x1b[97;5u')).toEqual(key('a', 'KeyA', { ctrl: true }))
		expect(one('\x1b[97:65;2u')).toEqual(key('A', 'KeyA', { shift: true, text: 'A' }))
		expect(one('\x1b[97;;97u')).toEqual(key('a', 'KeyA', { text: 'a' }))
		expect(one('\x1b[97;1;97u')).toEqual(key('a', 'KeyA', { text: 'a' }))
		expect(one('\x1b[1072:1040:97u')).toEqual(key('а', 'KeyA', { text: 'а' }))
		expect(one('\x1b[1072:1040:97;2u')).toEqual(key('А', 'KeyA', { shift: true, text: 'А' }))
		expect(one('\x1b[97;3u')).toEqual(key('a', 'KeyA', { alt: true }))
		expect(one('\x1b[97;7u')).toEqual(key('a', 'KeyA', { alt: true, ctrl: true }))
		expect(one('\x1b[97;9u')).toEqual(key('a', 'KeyA', { meta: true }))
		expect(one('\x1b[97;33u')).toEqual(key('a', 'KeyA', { meta: true }))
	})

	it('decodes punctuation, digits and space', () => {
		expect(one('\x1b[91;3u')).toEqual(key('[', 'BracketLeft', { alt: true }))
		expect(one('\x1b[93u')).toEqual(key(']', 'BracketRight', { text: ']' }))
		expect(one('\x1b[61;2u')).toEqual(key('+', 'Equal', { shift: true, text: '+' }))
		expect(one('\x1b[61:43;2u')).toEqual(key('+', 'Equal', { shift: true, text: '+' }))
		expect(one('\x1b[47;2u')).toEqual(key('?', 'Slash', { shift: true, text: '?' }))
		expect(one('\x1b[49u')).toEqual(key('1', 'Digit1', { text: '1' }))
		expect(one('\x1b[49;2u')).toEqual(key('!', 'Digit1', { shift: true, text: '!' }))
		expect(one('\x1b[32u')).toEqual(key(' ', 'Space', { text: ' ' }))
		expect(one('\x1b[32;5u')).toEqual(key(' ', 'Space', { ctrl: true }))
		expect(one('\x1b[32;3u')).toEqual(key(' ', 'Space', { alt: true }))
	})

	it('reports repeat and release events', () => {
		expect(one('\x1b[97;1:2u')).toEqual(key('a', 'KeyA', { text: 'a', repeat: true }))
		expect(one('\x1b[97;1:3u')).toEqual(key('a', 'KeyA', { release: true }))
		expect(one('\x1b[97;5:3u')).toEqual(key('a', 'KeyA', { ctrl: true, release: true }))
		expect(one('\x1b[1;5:3A')).toEqual(key('ArrowUp', 'ArrowUp', { ctrl: true, release: true }))
		expect(one('\x1b[1;1:2B')).toEqual(key('ArrowDown', 'ArrowDown', { repeat: true }))
		expect(one('\x1b[3;1:3~')).toEqual(key('Delete', 'Delete', { release: true }))
		expect(one('\x1b[27;1:3u')).toEqual(key('Escape', 'Escape', { release: true }))
	})

	it('reports modifier keys pressed alone so holds can drive latches', () => {
		expect(one('\x1b[57441;2u')).toEqual(key('Shift', 'ShiftLeft', { shift: true }))
		expect(one('\x1b[57441;2:3u')).toEqual(
			key('Shift', 'ShiftLeft', { shift: true, release: true })
		)
		expect(one('\x1b[57442;5u')).toEqual(key('Control', 'ControlLeft', { ctrl: true }))
		expect(one('\x1b[57443;3u')).toEqual(key('Alt', 'AltLeft', { alt: true }))
		expect(one('\x1b[57447;2u')).toEqual(key('Shift', 'ShiftRight', { shift: true }))
		expect(one('\x1b[57444;9u')).toEqual(key('Meta', 'MetaLeft', { meta: true }))
	})

	it('ignores lock-key modifier bits and a zero code point', () => {
		expect(one('\x1b[97;65u')).toEqual(key('a', 'KeyA', { text: 'a' }))
		expect(one('\x1b[97;129u')).toEqual(key('a', 'KeyA', { text: 'a' }))
		expect(parse(['\x1b[0u']).events).toEqual([])
	})

	it('decodes the flags query reply', () => {
		expect(one('\x1b[?0u')).toEqual({
			type: 'reply',
			kind: 'kitty',
			raw: '\x1b[?0u',
			data: { flags: 0 },
		})
		expect(one('\x1b[?27u')).toEqual({
			type: 'reply',
			kind: 'kitty',
			raw: '\x1b[?27u',
			data: { flags: 27 },
		})
	})
})

describe('SGR mouse', () => {
	it('decodes press, release, drag, motion and buttons with 0-based cells', () => {
		expect(one('\x1b[<0;10;5M')).toEqual(mouse('down', 0, 9, 4))
		expect(one('\x1b[<0;10;5m')).toEqual(mouse('up', 0, 9, 4))
		expect(one('\x1b[<1;1;1M')).toEqual(mouse('down', 1, 0, 0))
		expect(one('\x1b[<2;1;1M')).toEqual(mouse('down', 2, 0, 0))
		expect(one('\x1b[<2;1;1m')).toEqual(mouse('up', 2, 0, 0))
		expect(one('\x1b[<32;11;5M')).toEqual(mouse('drag', 0, 10, 4))
		expect(one('\x1b[<34;11;5M')).toEqual(mouse('drag', 2, 10, 4))
		expect(one('\x1b[<35;11;5M')).toEqual(mouse('move', -1, 10, 4))
		expect(one('\x1b[<3;4;4m')).toEqual(mouse('up', -1, 3, 3))
		expect(one('\x1b[<0;200;60M')).toEqual(mouse('down', 0, 199, 59))
	})

	it('decodes wheel ticks in both axes', () => {
		expect(one('\x1b[<64;3;3M')).toEqual(mouse('wheel', -1, 2, 2, { dy: -1 }))
		expect(one('\x1b[<65;3;3M')).toEqual(mouse('wheel', -1, 2, 2, { dy: 1 }))
		expect(one('\x1b[<66;3;3M')).toEqual(mouse('wheel', -1, 2, 2, { dx: -1 }))
		expect(one('\x1b[<67;3;3M')).toEqual(mouse('wheel', -1, 2, 2, { dx: 1 }))
		expect(one('\x1b[<81;3;3M')).toEqual(mouse('wheel', -1, 2, 2, { dy: 1, ctrl: true }))
	})

	it('decodes the modifier bits on every action', () => {
		expect(one('\x1b[<4;1;1M')).toEqual(mouse('down', 0, 0, 0, { shift: true }))
		expect(one('\x1b[<8;1;1M')).toEqual(mouse('down', 0, 0, 0, { alt: true }))
		expect(one('\x1b[<16;1;1M')).toEqual(mouse('down', 0, 0, 0, { ctrl: true }))
		expect(one('\x1b[<28;1;1M')).toEqual(
			mouse('down', 0, 0, 0, { shift: true, alt: true, ctrl: true })
		)
		expect(one('\x1b[<36;2;2M')).toEqual(mouse('drag', 0, 1, 1, { shift: true }))
		expect(one('\x1b[<51;2;2M')).toEqual(mouse('move', -1, 1, 1, { ctrl: true }))
		expect(one('\x1b[<72;2;2M')).toEqual(mouse('wheel', -1, 1, 1, { dy: -1, alt: true }))
	})

	it('ignores buttons 8–11 and never reports negative cells', () => {
		expect(parse(['\x1b[<128;1;1M']).events).toEqual([])
		expect(one('\x1b[<0;0;0M')).toEqual(mouse('down', 0, 0, 0))
	})

	it('parses a burst of motion reports in one chunk, in order', () => {
		const chunk = '\x1b[<35;1;1M\x1b[<35;2;1M\x1b[<35;3;1Mq\x1b[<0;3;1M'
		expect(parse([chunk]).events).toEqual([
			mouse('move', -1, 0, 0),
			mouse('move', -1, 1, 0),
			mouse('move', -1, 2, 0),
			typed('q'),
			mouse('down', 0, 2, 0),
		])
	})
})

describe('X10 mouse fallback', () => {
	it('decodes CSI M Cb Cx Cy and remembers the button for the release', () => {
		const { events } = parse([x10(0, 10, 5), x10(32, 11, 5), x10(3, 11, 5)])
		expect(events).toEqual([
			mouse('down', 0, 10, 5),
			mouse('drag', 0, 11, 5),
			mouse('up', 0, 11, 5),
		])
		expect(parse([x10(2, 1, 1), x10(3, 1, 1)]).events).toEqual([
			mouse('down', 2, 1, 1),
			mouse('up', 2, 1, 1),
		])
		expect(parse([x10(64, 1, 1)]).events).toEqual([mouse('wheel', -1, 1, 1, { dy: -1 })])
		expect(parse([x10(4, 1, 1)]).events).toEqual([mouse('down', 0, 1, 1, { shift: true })])
	})

	it('waits for the three payload bytes', () => {
		expect(
			parse([
				[0x1b, 0x5b, 0x4d, 32],
				[33 + 1, 33 + 2],
			]).events
		).toEqual([mouse('down', 0, 1, 2)])
	})
})

describe('bracketed paste', () => {
	it('delivers one paste event and no key events', () => {
		expect(parse(['\x1b[200~hello\x1b[201~']).events).toEqual([{ type: 'paste', text: 'hello' }])
	})

	it('buffers across chunks', () => {
		const { events } = parse(['\x1b[200~hel', 'lo wor', 'ld\x1b[201~', 'x'])
		expect(events).toEqual([{ type: 'paste', text: 'hello world' }, typed('x')])
	})

	it('normalises CRLF and CR to LF and strips C0 controls except newline and tab', () => {
		const { events } = parse(['\x1b[200~a\r\nb\rc\nd\te\x01f\x1b[31mg\x7f\x1b[201~'])
		expect(events).toEqual([{ type: 'paste', text: 'a\nb\nc\nd\tef[31mg' }])
	})

	it('handles an end mark split across chunks and a look-alike that is not the end mark', () => {
		expect(parse(['\x1b[200~abc\x1b[20', '1~x']).events).toEqual([
			{ type: 'paste', text: 'abc' },
			typed('x'),
		])
		expect(parse(['\x1b[200~a\x1b[2', '00~b\x1b[201~']).events).toEqual([
			{ type: 'paste', text: 'a[200~b' },
		])
		expect(parse(['\x1b[200~a\x1b', '[201~']).events).toEqual([{ type: 'paste', text: 'a' }])
	})

	it('keeps bytes that looked like an end mark when the timer gives up on them', () => {
		let t = 0
		const { parser, events } = parse(['\x1b[200~abc\x1b[20'], { now: () => t })
		expect(events).toEqual([])
		expect(parser.hasPending()).toBe(true)
		expect(parser.isPasting()).toBe(true)
		t = 600
		parser.flushPending((e) => events.push(e))
		expect(events).toEqual([])
		expect(parser.isPasting()).toBe(true)
		parser.feed(bytes('\x1b[201~'), (e) => events.push(e))
		expect(events).toEqual([{ type: 'paste', text: 'abc[20' }])
	})

	it('caps a paste at 2 s and delivers what arrived', () => {
		let t = 0
		const { parser, events } = parse(['\x1b[200~abc'], { now: () => t })
		expect(parser.hasPending()).toBe(true)
		expect(parser.pendingTimeoutMs()).toBe(2000)
		t = 1500
		expect(parser.pendingTimeoutMs()).toBe(500)
		t = 2500
		parser.flushPending((e) => events.push(e))
		expect(events).toEqual([{ type: 'paste', text: 'abc' }])
		expect(parser.hasPending()).toBe(false)
		expect(parser.isPasting()).toBe(false)
	})

	it('treats input after the cap as ordinary keys', () => {
		let t = 0
		const { parser, events } = parse(['\x1b[200~abc'], { now: () => t })
		t = 2500
		parser.feed(bytes('de'), (e) => events.push(e))
		expect(events).toEqual([{ type: 'paste', text: 'abc' }, typed('d'), typed('e')])
	})

	it('honours a custom paste timeout', () => {
		const t = 0
		const { parser } = parse(['\x1b[200~abc'], { now: () => t, pasteTimeoutMs: 100 })
		expect(parser.pendingTimeoutMs()).toBe(100)
	})

	it('ignores a stray end mark', () => {
		expect(parse(['\x1b[201~a']).events).toEqual([typed('a')])
	})
})

describe('focus and replies', () => {
	it('decodes focus in and out', () => {
		expect(one('\x1b[I')).toEqual({ type: 'focus', focused: true })
		expect(one('\x1b[O')).toEqual({ type: 'focus', focused: false })
	})

	it('decodes DA1, DECXCPR and OSC 11 with ST or BEL', () => {
		expect(one('\x1b[?62;22c')).toEqual({
			type: 'reply',
			kind: 'da1',
			raw: '\x1b[?62;22c',
			data: { params: '62;22' },
		})
		expect(one('\x1b[?1;3R')).toEqual({
			type: 'reply',
			kind: 'cpr',
			raw: '\x1b[?1;3R',
			data: { row: 1, col: 3 },
		})
		expect(one('\x1b[5;3R')).toEqual({
			type: 'reply',
			kind: 'cpr',
			raw: '\x1b[5;3R',
			data: { row: 5, col: 3 },
		})
		expect(one('\x1b]11;rgb:1e1e/1e1e/1e1e\x1b\\')).toEqual({
			type: 'reply',
			kind: 'osc11',
			raw: '\x1b]11;rgb:1e1e/1e1e/1e1e',
			data: { color: 'rgb:1e1e/1e1e/1e1e' },
		})
		expect(one('\x1b]11;#ffffff\x07')).toEqual({
			type: 'reply',
			kind: 'osc11',
			raw: '\x1b]11;#ffffff',
			data: { color: '#ffffff' },
		})
		expect(one('\x1b]10;x\x07')).toEqual({ type: 'reply', kind: 'unknown', raw: '\x1b]10;x' })
		expect(one('\x1bPabc\x1b\\')).toEqual({ type: 'reply', kind: 'unknown', raw: '\x1bPabc\x1b\\' })
	})

	it('keeps parsing input that follows a reply in the same chunk', () => {
		expect(parse(['\x1b[?62;22ca\x1b[?27ub']).events).toEqual([
			{ type: 'reply', kind: 'da1', raw: '\x1b[?62;22c', data: { params: '62;22' } },
			typed('a'),
			{ type: 'reply', kind: 'kitty', raw: '\x1b[?27u', data: { flags: 27 } },
			typed('b'),
		])
	})
})

describe('repeat detection', () => {
	it('flags the same key within 40 ms as a repeat', () => {
		let t = 0
		const parser = new InputParser({ now: () => t })
		const events: TerminalEvent[] = []
		const sink = (e: TerminalEvent) => events.push(e)
		parser.feed(bytes('a'), sink)
		t = 20
		parser.feed(bytes('a'), sink)
		t = 45
		parser.feed(bytes('a'), sink)
		t = 200
		parser.feed(bytes('a'), sink)
		t = 210
		parser.feed(bytes('b'), sink)
		t = 220
		parser.feed(bytes('\x1b[A'), sink)
		t = 230
		parser.feed(bytes('\x1b[A'), sink)
		expect(events).toEqual([
			typed('a'),
			typed('a', { repeat: true }),
			typed('a', { repeat: true }),
			typed('a'),
			typed('b'),
			key('ArrowUp', 'ArrowUp'),
			key('ArrowUp', 'ArrowUp', { repeat: true }),
		])
	})

	it('distinguishes modifiers and honours a custom window', () => {
		let t = 0
		const parser = new InputParser({ now: () => t, repeatWindowMs: 10 })
		const events: TerminalEvent[] = []
		const sink = (e: TerminalEvent) => events.push(e)
		parser.feed(bytes('a'), sink)
		t = 5
		parser.feed(bytes([0x01]), sink)
		t = 8
		parser.feed(bytes('a'), sink)
		t = 25
		parser.feed(bytes('a'), sink)
		expect(events.map((e) => (e as KeyEvent).repeat ?? false)).toEqual([false, false, false, false])
	})

	it('a kitty release resets the repeat signature', () => {
		let t = 0
		const parser = new InputParser({ now: () => t })
		const events: TerminalEvent[] = []
		const sink = (e: TerminalEvent) => events.push(e)
		parser.feed(bytes('\x1b[97u'), sink)
		t = 10
		parser.feed(bytes('\x1b[97;1:3u'), sink)
		t = 20
		parser.feed(bytes('\x1b[97u'), sink)
		expect(events.map((e) => (e as KeyEvent).repeat ?? false)).toEqual([false, false, false])
	})
})
