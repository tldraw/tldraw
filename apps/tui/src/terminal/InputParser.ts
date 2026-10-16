import { StringDecoder } from 'node:string_decoder'
import { graphemes } from './width'

export interface KeyEvent {
	type: 'key'
	key: string
	code: string
	shift: boolean
	ctrl: boolean
	alt: boolean
	meta: boolean
	text?: string
	release?: boolean
	repeat?: boolean
	/**
	 * Set when the key arrived in an extended encoding (xterm modifyOtherKeys `CSI 27 ; m ; k ~`,
	 * kitty `CSI k ; m u`): proof that the terminal honours the protocol the app asked for.
	 */
	encoding?: 'mok' | 'kitty'
}

export interface MouseEvent {
	type: 'mouse'
	action: 'down' | 'up' | 'move' | 'drag' | 'wheel'
	button: 0 | 1 | 2 | -1
	col: number
	row: number
	dx: number
	dy: number
	shift: boolean
	ctrl: boolean
	alt: boolean
}

export interface PasteEvent {
	type: 'paste'
	text: string
}

export interface FocusEvent {
	type: 'focus'
	focused: boolean
}

export interface ResizeEvent {
	type: 'resize'
	cols: number
	rows: number
}

export interface ReplyEvent {
	type: 'reply'
	kind: 'kitty' | 'da1' | 'osc11' | 'cpr' | 'unknown'
	raw: string
	data?: Record<string, number | string>
}

export type TerminalEvent =
	| KeyEvent
	| MouseEvent
	| PasteEvent
	| FocusEvent
	| ResizeEvent
	| ReplyEvent

export interface InputParserOptions {
	/** Wait after a chunk that ends in a lone ESC before calling it the Escape key. Default 35. */
	escTimeoutMs?: number
	/** Wait for the rest of a split escape sequence before discarding it. Default 500. */
	partialTimeoutMs?: number
	/** Longest bracketed paste; after this the text is delivered without waiting for the end mark. Default 2000. */
	pasteTimeoutMs?: number
	/** Two presses of the same key closer than this are reported as a repeat. Default 40. */
	repeatWindowMs?: number
	now?(): number
}

export type EventSink = (e: TerminalEvent) => void

const ESC = 0x1b
// 8-bit string terminator; terminals that answer OSC with it instead of ESC \ exist.
const ST8 = 0x9c
const INCOMPLETE = -1
const PASTE_END = [0x1b, 0x5b, 0x32, 0x30, 0x31, 0x7e] // CSI 201 ~
const MAX_CODE_POINT = 0x10ffff

/** CSI parameters are unbounded; String.fromCodePoint throws past U+10FFFF (and on Infinity). */
function isCodePoint(n: number): boolean {
	return Number.isInteger(n) && n >= 0 && n <= MAX_CODE_POINT
}

/** C1 controls (U+0080–U+009F) arrive as text when a terminal uses 8-bit controls; never insertable. */
function isC1Control(g: string): boolean {
	const c = g.codePointAt(0)!
	return c >= 0x80 && c <= 0x9f
}

/**
 * DOM `KeyboardEvent.code` for a key name, modelled on `KEY_CODES` in
 * packages/driver/src/lib/Driver.ts and extended to the whole US layout.
 */
export const KEY_CODES: Readonly<Record<string, string>> = {
	Shift: 'ShiftLeft',
	Alt: 'AltLeft',
	Control: 'ControlLeft',
	Meta: 'MetaLeft',
	' ': 'Space',
	Enter: 'Enter',
	Tab: 'Tab',
	Escape: 'Escape',
	Backspace: 'Backspace',
	Delete: 'Delete',
	Insert: 'Insert',
	Home: 'Home',
	End: 'End',
	PageUp: 'PageUp',
	PageDown: 'PageDown',
	ArrowRight: 'ArrowRight',
	ArrowLeft: 'ArrowLeft',
	ArrowUp: 'ArrowUp',
	ArrowDown: 'ArrowDown',
	'-': 'Minus',
	_: 'Minus',
	'=': 'Equal',
	'+': 'Equal',
	'[': 'BracketLeft',
	'{': 'BracketLeft',
	']': 'BracketRight',
	'}': 'BracketRight',
	'\\': 'Backslash',
	'|': 'Backslash',
	';': 'Semicolon',
	':': 'Semicolon',
	"'": 'Quote',
	'"': 'Quote',
	',': 'Comma',
	'<': 'Comma',
	'.': 'Period',
	'>': 'Period',
	'/': 'Slash',
	'?': 'Slash',
	'`': 'Backquote',
	'~': 'Backquote',
	'!': 'Digit1',
	'@': 'Digit2',
	'#': 'Digit3',
	$: 'Digit4',
	'%': 'Digit5',
	'^': 'Digit6',
	'&': 'Digit7',
	'*': 'Digit8',
	'(': 'Digit9',
	')': 'Digit0',
}

const SHIFTED_CHARS = new Set('~!@#$%^&*()_+{}|:"<>?')

const SHIFTED_BY_BASE: Readonly<Record<string, string>> = {
	'`': '~',
	'1': '!',
	'2': '@',
	'3': '#',
	'4': '$',
	'5': '%',
	'6': '^',
	'7': '&',
	'8': '*',
	'9': '(',
	'0': ')',
	'-': '_',
	'=': '+',
	'[': '{',
	']': '}',
	'\\': '|',
	';': ':',
	"'": '"',
	',': '<',
	'.': '>',
	'/': '?',
}

/** DOM code for a key value ('a' → KeyA, '1' → Digit1, named keys as themselves). */
export function codeForKey(key: string): string {
	const known = KEY_CODES[key]
	if (known) return known
	if (key.length === 1) {
		const c = key.charCodeAt(0)
		if (c >= 0x61 && c <= 0x7a) return 'Key' + key.toUpperCase()
		if (c >= 0x41 && c <= 0x5a) return 'Key' + key
		if (c >= 0x30 && c <= 0x39) return 'Digit' + key
		return 'Unidentified'
	}
	if (/^F\d{1,2}$/.test(key)) return key
	return key
}

/** Whether typing this US-layout character requires Shift. */
export function isShiftedChar(ch: string): boolean {
	if (ch.length !== 1) return false
	const c = ch.charCodeAt(0)
	if (c >= 0x41 && c <= 0x5a) return true
	return SHIFTED_CHARS.has(ch)
}

const TILDE_KEYS: Readonly<Record<number, string>> = {
	1: 'Home',
	2: 'Insert',
	3: 'Delete',
	4: 'End',
	5: 'PageUp',
	6: 'PageDown',
	7: 'Home',
	8: 'End',
	11: 'F1',
	12: 'F2',
	13: 'F3',
	14: 'F4',
	15: 'F5',
	17: 'F6',
	18: 'F7',
	19: 'F8',
	20: 'F9',
	21: 'F10',
	23: 'F11',
	24: 'F12',
	25: 'F13',
	26: 'F14',
	28: 'F15',
	29: 'F16',
	31: 'F17',
	32: 'F18',
	33: 'F19',
	34: 'F20',
}

const LETTER_KEYS: Readonly<Record<number, string>> = {
	0x41: 'ArrowUp',
	0x42: 'ArrowDown',
	0x43: 'ArrowRight',
	0x44: 'ArrowLeft',
	0x48: 'Home',
	0x46: 'End',
	0x50: 'F1',
	0x51: 'F2',
	0x52: 'F3',
	0x53: 'F4',
}

// Kitty keyboard protocol functional key code points (https://sw.kovidgoyal.net/kitty/keyboard-protocol/).
const KITTY_KEYS: Readonly<Record<number, [key: string, code: string]>> = {
	9: ['Tab', 'Tab'],
	13: ['Enter', 'Enter'],
	27: ['Escape', 'Escape'],
	127: ['Backspace', 'Backspace'],
	57358: ['CapsLock', 'CapsLock'],
	57359: ['ScrollLock', 'ScrollLock'],
	57360: ['NumLock', 'NumLock'],
	57361: ['PrintScreen', 'PrintScreen'],
	57362: ['Pause', 'Pause'],
	57363: ['ContextMenu', 'ContextMenu'],
	57399: ['0', 'Numpad0'],
	57400: ['1', 'Numpad1'],
	57401: ['2', 'Numpad2'],
	57402: ['3', 'Numpad3'],
	57403: ['4', 'Numpad4'],
	57404: ['5', 'Numpad5'],
	57405: ['6', 'Numpad6'],
	57406: ['7', 'Numpad7'],
	57407: ['8', 'Numpad8'],
	57408: ['9', 'Numpad9'],
	57409: ['.', 'NumpadDecimal'],
	57410: ['/', 'NumpadDivide'],
	57411: ['*', 'NumpadMultiply'],
	57412: ['-', 'NumpadSubtract'],
	57413: ['+', 'NumpadAdd'],
	57414: ['Enter', 'NumpadEnter'],
	57415: ['=', 'NumpadEqual'],
	57416: [',', 'NumpadComma'],
	57417: ['ArrowLeft', 'ArrowLeft'],
	57418: ['ArrowRight', 'ArrowRight'],
	57419: ['ArrowUp', 'ArrowUp'],
	57420: ['ArrowDown', 'ArrowDown'],
	57421: ['PageUp', 'PageUp'],
	57422: ['PageDown', 'PageDown'],
	57423: ['Home', 'Home'],
	57424: ['End', 'End'],
	57425: ['Insert', 'Insert'],
	57426: ['Delete', 'Delete'],
	57427: ['Clear', 'Clear'],
	57441: ['Shift', 'ShiftLeft'],
	57442: ['Control', 'ControlLeft'],
	57443: ['Alt', 'AltLeft'],
	57444: ['Meta', 'MetaLeft'],
	57445: ['Hyper', 'Hyper'],
	57446: ['Meta', 'MetaLeft'],
	57447: ['Shift', 'ShiftRight'],
	57448: ['Control', 'ControlRight'],
	57449: ['Alt', 'AltRight'],
	57450: ['Meta', 'MetaRight'],
	57451: ['Hyper', 'Hyper'],
	57452: ['Meta', 'MetaRight'],
}
for (let i = 0; i < 23; i++) {
	;(KITTY_KEYS as Record<number, [string, string]>)[57376 + i] = [`F${13 + i}`, `F${13 + i}`]
}

interface Mods {
	shift: boolean
	ctrl: boolean
	alt: boolean
	meta: boolean
}

const NO_MODS: Mods = { shift: false, ctrl: false, alt: false, meta: false }

function xtermMods(value: number): Mods {
	const bits = Math.max(0, value - 1)
	return {
		shift: (bits & 1) !== 0,
		alt: (bits & 2) !== 0,
		ctrl: (bits & 4) !== 0,
		meta: (bits & 8) !== 0,
	}
}

function utf8Length(lead: number): number {
	if (lead < 0x80) return 1
	if (lead >= 0xc2 && lead < 0xe0) return 2
	if (lead >= 0xe0 && lead < 0xf0) return 3
	if (lead >= 0xf0 && lead < 0xf5) return 4
	return 0
}

function asciiOf(buf: Uint8Array, from: number, to: number): string {
	let s = ''
	for (let k = from; k < to; k++) s += String.fromCharCode(buf[k])
	return s
}

function parseParams(s: string): number[][] {
	if (s.length === 0) return []
	const out: number[][] = []
	for (const part of s.split(';')) {
		const subs: number[] = []
		for (const sub of part.split(':')) subs.push(sub.length === 0 ? -1 : Number(sub))
		out.push(subs)
	}
	return out
}

function param(params: number[][], i: number, sub: number, fallback: number): number {
	const v = params[i]?.[sub]
	return v === undefined || v === -1 || Number.isNaN(v) ? fallback : v
}

/**
 * Turns raw stdin bytes into terminal events with a hand-written byte state machine. Chunks may
 * split escape sequences, UTF-8 characters and bracketed pastes; the parser keeps the tail and the
 * owner calls `flushPending` from a timer when the rest never arrives.
 */
export class InputParser {
	private readonly escTimeoutMs: number
	private readonly partialTimeoutMs: number
	private readonly pasteTimeoutMs: number
	private readonly repeatWindowMs: number
	private readonly now: () => number

	private pending: number[] = []
	private pendingKind: 'none' | 'esc' | 'partial' = 'none'
	private pendingDeadline = 0
	private readonly decoder = new StringDecoder('utf8')
	private pasteActive = false
	private pasteBytes: number[] = []
	private pasteStart = 0
	private kittyActive = false
	private lastKeySig: string | null = null
	private lastKeyTime = 0
	private x10Button: 0 | 1 | 2 | -1 = -1
	private sink: EventSink | null = null
	private time = 0

	constructor(opts?: InputParserOptions) {
		this.escTimeoutMs = opts?.escTimeoutMs ?? 35
		this.partialTimeoutMs = opts?.partialTimeoutMs ?? 500
		this.pasteTimeoutMs = opts?.pasteTimeoutMs ?? 2000
		this.repeatWindowMs = opts?.repeatWindowMs ?? 40
		this.now = opts?.now ?? (() => performance.now())
	}

	setKittyActive(on: boolean): void {
		this.kittyActive = on
	}

	isKittyActive(): boolean {
		return this.kittyActive
	}

	hasPending(): boolean {
		return this.pendingKind !== 'none' || this.pasteActive
	}

	isPasting(): boolean {
		return this.pasteActive
	}

	/** Milliseconds until `flushPending` should run; 0 means right away. */
	pendingTimeoutMs(): number {
		let ms = Infinity
		const now = this.now()
		if (this.pendingKind !== 'none') ms = this.pendingDeadline - now
		if (this.pasteActive) ms = Math.min(ms, this.pasteStart + this.pasteTimeoutMs - now)
		return ms === Infinity ? 0 : Math.max(0, ms)
	}

	feed(bytes: Uint8Array, onEvent: EventSink): void {
		this.sink = onEvent
		this.time = this.now()
		try {
			this.feedInner(bytes)
		} finally {
			this.sink = null
		}
	}

	/**
	 * Timer callback. A lone ESC becomes the Escape key; a split sequence that never completed is
	 * discarded rather than reinterpreted (ESC [ is both alt+[ and the CSI introducer); an
	 * over-long paste is delivered as is.
	 */
	flushPending(onEvent: EventSink): void {
		this.sink = onEvent
		this.time = this.now()
		try {
			if (this.pasteActive && this.time - this.pasteStart >= this.pasteTimeoutMs) {
				if (this.pendingKind !== 'none') {
					for (const b of this.pending) this.pasteBytes.push(b)
					this.clearPending()
				}
				this.finishPaste()
				return
			}
			if (this.pendingKind === 'none') return
			if (this.pasteActive) {
				// A chunk ended inside what looked like the paste end mark but the rest never came:
				// those bytes are paste content, and the paste itself keeps waiting for its cap.
				for (const b of this.pending) this.pasteBytes.push(b)
				this.clearPending()
				return
			}
			if (this.pendingKind === 'esc') {
				const count = this.pending.length
				this.clearPending()
				for (let k = 0; k < count; k++) this.emitKey('Escape', 'Escape', NO_MODS)
				return
			}
			this.clearPending()
		} finally {
			this.sink = null
		}
	}

	private clearPending(): void {
		this.pending = []
		this.pendingKind = 'none'
	}

	private emit(e: TerminalEvent): void {
		this.sink!(e)
	}

	private feedInner(bytes: Uint8Array): void {
		const hadPending = this.pending.length > 0
		let buf: Uint8Array
		if (hadPending) {
			const merged = new Uint8Array(this.pending.length + bytes.length)
			merged.set(this.pending, 0)
			merged.set(bytes, this.pending.length)
			buf = merged
			this.clearPending()
		} else {
			buf = bytes
		}
		const n = buf.length
		let i = 0
		while (i < n) {
			if (this.pasteActive) {
				i = this.consumePaste(buf, i, n)
				continue
			}
			if (buf[i] === ESC) {
				const r = this.parseEscape(buf, i, n, false)
				if (r === INCOMPLETE) {
					const rest = n - i
					if (rest <= 2 && (rest === 1 || buf[i + 1] === ESC) && !this.kittyActive) {
						// One or two bare ESCs end the chunk: Escape presses, or the start of a sequence
						// the next chunk completes (ESC ESC [ A is a meta arrow).
						if (rest === 1 && n === 1 && !hadPending) {
							// Terminals write a whole sequence per write(), so a chunk that is exactly
							// ESC is the Escape key; waiting would only add latency.
							this.emitKey('Escape', 'Escape', NO_MODS)
						} else {
							this.pending = Array.from(buf.subarray(i))
							this.pendingKind = 'esc'
							this.pendingDeadline = this.time + this.escTimeoutMs
						}
					} else {
						// Under the kitty protocol Escape arrives as CSI 27 u, so a trailing ESC can only
						// be a split sequence: held like any partial, never emitted as the key.
						this.pending = Array.from(buf.subarray(i))
						this.pendingKind = 'partial'
						this.pendingDeadline = this.time + this.partialTimeoutMs
					}
					return
				}
				i += r
			} else {
				let j = i + 1
				while (j < n && buf[j] !== ESC) j++
				this.emitText(buf.subarray(i, j))
				i = j
			}
		}
	}

	private emitText(bytes: Uint8Array): void {
		const s = this.decoder.write(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength))
		if (s.length === 0) return
		let ascii = true
		for (let k = 0; k < s.length; k++) {
			if (s.charCodeAt(k) >= 0x80) {
				ascii = false
				break
			}
		}
		if (ascii) {
			for (let k = 0; k < s.length; k++) this.emitLegacyByte(s.charCodeAt(k), false)
			return
		}
		for (const g of graphemes(s)) {
			if (g.length === 1 && g.charCodeAt(0) < 0x80) this.emitLegacyByte(g.charCodeAt(0), false)
			else if (!isC1Control(g)) this.emitKey(g, 'Unidentified', NO_MODS, g)
		}
	}

	/** Keys encoded as a single C0/ASCII byte, optionally behind an ESC (alt) prefix. */
	private emitLegacyByte(b: number, alt: boolean): void {
		const mods: Mods = alt ? { ...NO_MODS, alt: true } : NO_MODS
		switch (b) {
			case 0x00:
				this.emitKey(' ', 'Space', { ...mods, ctrl: true })
				return
			case 0x08:
			case 0x7f:
				this.emitKey('Backspace', 'Backspace', mods)
				return
			case 0x09:
				this.emitKey('Tab', 'Tab', mods)
				return
			case 0x0a:
			case 0x0d:
				this.emitKey('Enter', 'Enter', mods)
				return
			case 0x1b:
				this.emitKey('Escape', 'Escape', mods)
				return
			case 0x1c:
				this.emitKey('\\', 'Backslash', { ...mods, ctrl: true })
				return
			case 0x1d:
				this.emitKey(']', 'BracketRight', { ...mods, ctrl: true })
				return
			case 0x1e:
				this.emitKey('^', 'Digit6', { ...mods, ctrl: true, shift: true })
				return
			case 0x1f:
				this.emitKey('/', 'Slash', { ...mods, ctrl: true })
				return
		}
		if (b < 0x20) {
			const letter = String.fromCharCode(0x60 + b)
			this.emitKey(letter, 'Key' + letter.toUpperCase(), { ...mods, ctrl: true })
			return
		}
		const ch = String.fromCharCode(b)
		const shifted = isShiftedChar(ch)
		this.emitKey(
			ch,
			codeForKey(ch),
			shifted ? { ...mods, shift: true } : mods,
			alt ? undefined : ch
		)
	}

	private emitKey(
		key: string,
		code: string,
		mods: Mods,
		text?: string,
		event: 'press' | 'repeat' | 'release' = 'press',
		encoding?: KeyEvent['encoding']
	): void {
		const e: KeyEvent = {
			type: 'key',
			key,
			code,
			shift: mods.shift,
			ctrl: mods.ctrl,
			alt: mods.alt,
			meta: mods.meta,
		}
		if (text !== undefined && event !== 'release') e.text = text
		if (encoding) e.encoding = encoding
		if (event === 'release') {
			e.release = true
			this.lastKeySig = null
		} else {
			const sig = `${key}|${mods.shift ? 1 : 0}${mods.ctrl ? 1 : 0}${mods.alt ? 1 : 0}${mods.meta ? 1 : 0}`
			const repeat =
				event === 'repeat' ||
				(sig === this.lastKeySig && this.time - this.lastKeyTime < this.repeatWindowMs)
			if (repeat) e.repeat = true
			this.lastKeySig = sig
			this.lastKeyTime = this.time
		}
		this.emit(e)
	}

	/** Returns the bytes consumed, or INCOMPLETE when the sequence continues in a later chunk. */
	private parseEscape(buf: Uint8Array, i: number, n: number, alt: boolean): number {
		if (i + 1 >= n) return INCOMPLETE
		const b1 = buf[i + 1]
		switch (b1) {
			case 0x5b:
				return this.parseCsi(buf, i, n, alt)
			case 0x4f:
				return this.parseSs3(buf, i, n, alt)
			case 0x5d:
				return this.parseOsc(buf, i, n)
			case 0x50:
			case 0x5f:
			case 0x5e:
			case 0x58:
				return this.parseStringSequence(buf, i, n)
			case ESC: {
				// Two ESCs ending a chunk are held like one (feedInner): the rest may still arrive.
				if (i + 2 >= n) return INCOMPLETE
				const b2 = buf[i + 2]
				if (b2 === 0x5b || b2 === 0x4f) {
					const r = this.parseEscape(buf, i + 1, n, true)
					return r === INCOMPLETE ? INCOMPLETE : r + 1
				}
				this.emitKey('Escape', 'Escape', NO_MODS)
				return 1
			}
			default:
				return this.parseAltKey(buf, i, n)
		}
	}

	private parseAltKey(buf: Uint8Array, i: number, n: number): number {
		const b1 = buf[i + 1]
		if (b1 < 0x80) {
			// macOS Terminal.app and iTerm2 send option+arrow as ESC b / ESC f (word motion).
			if (b1 === 0x62) this.emitKey('ArrowLeft', 'ArrowLeft', { ...NO_MODS, alt: true })
			else if (b1 === 0x66) this.emitKey('ArrowRight', 'ArrowRight', { ...NO_MODS, alt: true })
			else this.emitLegacyByte(b1, true)
			return 2
		}
		const len = utf8Length(b1)
		if (len === 0) {
			this.emitKey('Escape', 'Escape', NO_MODS)
			return 1
		}
		if (i + 1 + len > n) return INCOMPLETE
		const ch = Buffer.from(buf.buffer, buf.byteOffset + i + 1, len).toString('utf8')
		this.emitKey(ch, 'Unidentified', { ...NO_MODS, alt: true }, ch)
		return 1 + len
	}

	private parseCsi(buf: Uint8Array, i: number, n: number, alt: boolean): number {
		let j = i + 2
		if (j < n && buf[j] === 0x5b) {
			// Linux console F1–F5 (terminfo linux kf1–kf5): ESC [ [ A–E. '[' is otherwise a legal CSI
			// final byte, so the generic scan would end the sequence here and type the letter.
			if (j + 1 >= n) return INCOMPLETE
			const f = buf[j + 1]
			if (f >= 0x41 && f <= 0x45) {
				const name = `F${f - 0x40}`
				this.emitKey(name, name, alt ? { ...NO_MODS, alt: true } : NO_MODS)
				return 4
			}
		}
		let prefix = 0
		if (j < n && buf[j] >= 0x3c && buf[j] <= 0x3f) {
			prefix = buf[j]
			j++
		}
		const paramStart = j
		while (j < n && buf[j] >= 0x30 && buf[j] <= 0x3f) j++
		const paramEnd = j
		while (j < n && buf[j] >= 0x20 && buf[j] <= 0x2f) j++
		if (j >= n) return INCOMPLETE
		const final = buf[j]
		if (final < 0x40 || final > 0x7e) return j - i + 1
		if (final === 0x4d && prefix === 0 && paramEnd === paramStart) {
			// X10 mouse report: CSI M Cb Cx Cy (GNU screen, old xterm).
			if (j + 3 >= n) return INCOMPLETE
			this.emitMouse(buf[j + 1] - 32, buf[j + 2] - 33, buf[j + 3] - 33, false, true)
			return j + 4 - i
		}
		const params = asciiOf(buf, paramStart, paramEnd)
		this.dispatchCsi(prefix, params, final, alt, asciiOf(buf, i, j + 1))
		return j - i + 1
	}

	private dispatchCsi(
		prefix: number,
		paramStr: string,
		final: number,
		alt: boolean,
		raw: string
	): void {
		const params = parseParams(paramStr)
		const ch = String.fromCharCode(final)
		switch (ch) {
			case 'A':
			case 'B':
			case 'C':
			case 'D':
			case 'H':
			case 'F':
			case 'P':
			case 'Q':
			case 'S': {
				if (prefix !== 0) {
					this.emitReply('unknown', raw)
					return
				}
				this.emitNamedKey(LETTER_KEYS[final], params, 1, alt)
				return
			}
			case 'R': {
				if (prefix === 0x3f) {
					this.emitReply('cpr', raw, { row: param(params, 0, 0, 1), col: param(params, 1, 0, 1) })
					return
				}
				if (param(params, 0, 0, 1) === 1 && params.length === 2) {
					this.emitNamedKey('F3', params, 1, alt)
					return
				}
				this.emitReply('cpr', raw, { row: param(params, 0, 0, 1), col: param(params, 1, 0, 1) })
				return
			}
			case 'Z':
				this.emitKey('Tab', 'Tab', { ...xtermMods(param(params, 1, 0, 1)), shift: true, alt })
				return
			case 'I':
				if (prefix === 0 && params.length === 0) this.emit({ type: 'focus', focused: true })
				else this.emitReply('unknown', raw)
				return
			case 'O':
				if (prefix === 0 && params.length === 0) this.emit({ type: 'focus', focused: false })
				else this.emitReply('unknown', raw)
				return
			case '~':
				this.dispatchTilde(params, alt, raw)
				return
			case 'u':
				if (prefix === 0x3f) {
					this.emitReply('kitty', raw, { flags: param(params, 0, 0, 0) })
					return
				}
				if (prefix !== 0) {
					this.emitReply('unknown', raw)
					return
				}
				this.dispatchKittyKey(params, alt, raw)
				return
			case 'c':
				this.emitReply(prefix === 0x3f ? 'da1' : 'unknown', raw, { params: paramStr })
				return
			case 'M':
			case 'm':
				if (prefix === 0x3c) {
					this.emitMouse(
						param(params, 0, 0, 0),
						param(params, 1, 0, 1) - 1,
						param(params, 2, 0, 1) - 1,
						ch === 'm',
						false
					)
					return
				}
				this.emitReply('unknown', raw)
				return
			default:
				this.emitReply('unknown', raw)
		}
	}

	private emitReply(kind: ReplyEvent['kind'], raw: string, data?: ReplyEvent['data']): void {
		const e: ReplyEvent = { type: 'reply', kind, raw }
		if (data) e.data = data
		this.emit(e)
	}

	/** Keys like CSI 1;5A whose modifier param may carry a kitty event sub-param (1;5:3A). */
	private emitNamedKey(name: string, params: number[][], modsIndex: number, alt: boolean): void {
		const mods = xtermMods(param(params, modsIndex, 0, 1))
		if (alt) mods.alt = true
		const event = kittyEvent(param(params, modsIndex, 1, 1))
		this.emitKey(name, codeForKey(name), mods, undefined, event)
	}

	private dispatchTilde(params: number[][], alt: boolean, raw: string): void {
		const n = param(params, 0, 0, 0)
		if (n === 200) {
			this.pasteActive = true
			this.pasteBytes = []
			this.pasteStart = this.time
			return
		}
		if (n === 201) return
		if (n === 27) {
			// xterm modifyOtherKeys: CSI 27 ; mods ; codepoint ~
			const mods = xtermMods(param(params, 1, 0, 1))
			if (alt) mods.alt = true
			const cp = param(params, 2, 0, 0)
			this.emitCodePointKey(cp, undefined, undefined, mods, undefined, 'press', 'mok', raw)
			return
		}
		const name = TILDE_KEYS[n]
		if (!name) {
			this.emitReply('unknown', raw)
			return
		}
		this.emitNamedKey(name, params, 1, alt)
	}

	private dispatchKittyKey(params: number[][], alt: boolean, raw: string): void {
		const cp = param(params, 0, 0, 0)
		// A garbage alternate key must not lose the key itself; a garbage text code point is skipped.
		const shifted = isCodePoint(param(params, 0, 1, -1)) ? param(params, 0, 1, -1) : -1
		const base = isCodePoint(param(params, 0, 2, -1)) ? param(params, 0, 2, -1) : -1
		const modsValue = param(params, 1, 0, 1)
		const bits = Math.max(0, modsValue - 1)
		const mods: Mods = {
			shift: (bits & 1) !== 0,
			alt: (bits & 2) !== 0 || alt,
			ctrl: (bits & 4) !== 0,
			meta: (bits & 8) !== 0 || (bits & 32) !== 0,
		}
		const event = kittyEvent(param(params, 1, 1, 1))
		let text: string | undefined
		const textParams = params[2]
		if (textParams && textParams.length > 0 && textParams[0] !== -1) {
			text = ''
			for (const t of textParams) if (t > 0 && isCodePoint(t)) text += String.fromCodePoint(t)
			if (text.length === 0) text = undefined
		}
		this.emitCodePointKey(
			cp,
			shifted === -1 ? undefined : shifted,
			base === -1 ? undefined : base,
			mods,
			text,
			event,
			'kitty',
			raw
		)
	}

	private emitCodePointKey(
		cp: number,
		shifted: number | undefined,
		base: number | undefined,
		mods: Mods,
		text: string | undefined,
		event: 'press' | 'repeat' | 'release',
		encoding: KeyEvent['encoding'],
		raw: string
	): void {
		const functional = KITTY_KEYS[cp]
		if (functional) {
			this.emitKey(
				functional[0],
				functional[1],
				mods,
				cp === 13 || cp === 9 ? undefined : text,
				event,
				encoding
			)
			return
		}
		if (cp === 32) {
			this.emitKey(
				' ',
				'Space',
				mods,
				text ?? (mods.ctrl || mods.alt ? undefined : ' '),
				event,
				encoding
			)
			return
		}
		if (cp <= 0) return
		if (!isCodePoint(cp)) {
			this.emitReply('unknown', raw)
			return
		}
		const baseCh = String.fromCodePoint(base ?? cp)
		let key: string
		if (text !== undefined && text.length > 0 && !mods.ctrl) key = text
		else if (shifted !== undefined && mods.shift) key = String.fromCodePoint(shifted)
		else {
			const ch = String.fromCodePoint(cp)
			if (mods.shift) {
				if (ch.length === 1 && ch >= 'a' && ch <= 'z') key = ch.toUpperCase()
				else key = SHIFTED_BY_BASE[ch] ?? ch
			} else {
				key = ch
			}
		}
		if (isShiftedChar(key)) mods = { ...mods, shift: true }
		const code = codeForKey(baseCh.length === 1 ? baseCh.toLowerCase() : baseCh)
		// Without the terminal's own text field, only an unmodified (or shift-only) key inserts.
		const insert = text ?? (mods.ctrl || mods.alt || mods.meta ? undefined : key)
		this.emitKey(key, code, mods, insert, event, encoding)
	}

	private parseSs3(buf: Uint8Array, i: number, n: number, alt: boolean): number {
		if (i + 2 >= n) return INCOMPLETE
		const f = buf[i + 2]
		const name = LETTER_KEYS[f]
		if (name) {
			this.emitKey(name, codeForKey(name), alt ? { ...NO_MODS, alt: true } : NO_MODS)
			return 3
		}
		if (f === 0x4d) {
			this.emitKey('Enter', 'NumpadEnter', alt ? { ...NO_MODS, alt: true } : NO_MODS)
			return 3
		}
		// Not an SS3 key after all: alt+O followed by an ordinary byte.
		this.emitLegacyByte(0x4f, true)
		return 2
	}

	private parseOsc(buf: Uint8Array, i: number, n: number): number {
		let j = i + 2
		let end = -1
		let termLen = 0
		while (j < n) {
			const b = buf[j]
			if (b === 0x07 || b === ST8) {
				end = j
				termLen = 1
				break
			}
			if (b === ESC) {
				if (j + 1 >= n) return INCOMPLETE
				if (buf[j + 1] === 0x5c) {
					end = j
					termLen = 2
					break
				}
			}
			j++
		}
		if (end === -1) return INCOMPLETE
		const body = Buffer.from(buf.buffer, buf.byteOffset + i + 2, end - (i + 2)).toString('utf8')
		const raw = '\x1b]' + body
		if (body.startsWith('11;')) this.emitReply('osc11', raw, { color: body.slice(3) })
		else this.emitReply('unknown', raw)
		return end + termLen - i
	}

	/** DCS / APC / PM / SOS: skipped up to the string terminator. */
	private parseStringSequence(buf: Uint8Array, i: number, n: number): number {
		let j = i + 2
		while (j < n) {
			if (buf[j] === ST8) {
				this.emitReply('unknown', asciiOf(buf, i, j + 1))
				return j + 1 - i
			}
			if (buf[j] === ESC) {
				if (j + 1 >= n) return INCOMPLETE
				if (buf[j + 1] === 0x5c) {
					this.emitReply('unknown', asciiOf(buf, i, j + 2))
					return j + 2 - i
				}
			}
			j++
		}
		return INCOMPLETE
	}

	private emitMouse(
		b: number,
		col: number,
		row: number,
		releaseFinal: boolean,
		x10: boolean
	): void {
		if (b < 0) return
		const shift = (b & 4) !== 0
		const alt = (b & 8) !== 0
		const ctrl = (b & 16) !== 0
		const e: MouseEvent = {
			type: 'mouse',
			action: 'move',
			button: -1,
			col: Math.max(0, col),
			row: Math.max(0, row),
			dx: 0,
			dy: 0,
			shift,
			ctrl,
			alt,
		}
		if (b & 64) {
			const which = b & 3
			e.action = 'wheel'
			if (which === 0) e.dy = -1
			else if (which === 1) e.dy = 1
			else if (which === 2) e.dx = -1
			else e.dx = 1
		} else if (b & 128) {
			return
		} else {
			const raw = b & 3
			const button: 0 | 1 | 2 | -1 = raw === 3 ? -1 : (raw as 0 | 1 | 2)
			if (b & 32) {
				e.action = button === -1 ? 'move' : 'drag'
				e.button = button
			} else if (x10) {
				if (button === -1) {
					e.action = 'up'
					e.button = this.x10Button
					this.x10Button = -1
				} else {
					e.action = 'down'
					e.button = button
					this.x10Button = button
				}
			} else {
				e.action = releaseFinal ? 'up' : 'down'
				e.button = button
			}
		}
		this.emit(e)
	}

	private consumePaste(buf: Uint8Array, i: number, n: number): number {
		if (this.time - this.pasteStart >= this.pasteTimeoutMs) {
			this.finishPaste()
			return i
		}
		let k = i
		while (k < n) {
			if (buf[k] === ESC) {
				let m = 0
				while (m < PASTE_END.length && k + m < n && buf[k + m] === PASTE_END[m]) m++
				if (m === PASTE_END.length) {
					this.finishPaste()
					return k + m
				}
				if (k + m >= n) {
					// The chunk ends inside a possible end mark; keep those bytes for the next chunk.
					this.pending = Array.from(buf.subarray(k))
					this.pendingKind = 'partial'
					this.pendingDeadline = this.time + this.partialTimeoutMs
					return n
				}
			}
			this.pasteBytes.push(buf[k])
			k++
		}
		return n
	}

	private finishPaste(): void {
		const bytes = this.pasteBytes
		this.pasteBytes = []
		this.pasteActive = false
		const raw = Buffer.from(bytes).toString('utf8')
		let text = ''
		for (let k = 0; k < raw.length; k++) {
			const c = raw.charCodeAt(k)
			if (c === 0x0d) {
				text += '\n'
				if (raw.charCodeAt(k + 1) === 0x0a) k++
				continue
			}
			if (c === 0x0a || c === 0x09 || (c >= 0x20 && c !== 0x7f)) text += raw[k]
		}
		this.emit({ type: 'paste', text })
	}
}

function kittyEvent(v: number): 'press' | 'repeat' | 'release' {
	return v === 3 ? 'release' : v === 2 ? 'repeat' : 'press'
}
