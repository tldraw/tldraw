import { ACTION_IDS, ACTION_META, type ActionId, type ActionInvocation } from '../actions/actionIds'
import type { KeyEvent } from '../terminal/InputParser'

export type KeyboardEncoding = 'legacy' | 'full'

/**
 * A key combination in canonical form: the unshifted US-layout key (`'1'`, not `'!'`; `'d'`, not
 * `'D'`) plus modifier flags, so a chord written `shift+1` matches the `!` a terminal sends.
 */
export interface KeyChord {
	key: string
	shift: boolean
	ctrl: boolean
	alt: boolean
}

export interface ShortcutBinding {
	chord: KeyChord
	action: ActionInvocation
	/** `full` bindings are tldraw chords that only arrive with the kitty protocol or modifyOtherKeys. */
	encoding: 'any' | 'full'
}

/** Shifted US-layout characters and the key that produces them. Mirrors InputParser's table. */
const BASE_OF_SHIFTED: Readonly<Record<string, string>> = {
	'~': '`',
	'!': '1',
	'@': '2',
	'#': '3',
	$: '4',
	'%': '5',
	'^': '6',
	'&': '7',
	'*': '8',
	'(': '9',
	')': '0',
	_: '-',
	'+': '=',
	'{': '[',
	'}': ']',
	'|': '\\',
	':': ';',
	'"': "'",
	'<': ',',
	'>': '.',
	'?': '/',
}

const NAMED_KEYS: Readonly<Record<string, string>> = {
	esc: 'Escape',
	escape: 'Escape',
	enter: 'Enter',
	return: 'Enter',
	tab: 'Tab',
	space: ' ',
	del: 'Delete',
	delete: 'Delete',
	backspace: 'Backspace',
	insert: 'Insert',
	home: 'Home',
	end: 'End',
	pgup: 'PageUp',
	pageup: 'PageUp',
	pgdn: 'PageDown',
	pagedown: 'PageDown',
	left: 'ArrowLeft',
	arrowleft: 'ArrowLeft',
	right: 'ArrowRight',
	arrowright: 'ArrowRight',
	up: 'ArrowUp',
	arrowup: 'ArrowUp',
	down: 'ArrowDown',
	arrowdown: 'ArrowDown',
}

/** The unshifted key and whether Shift is implied by the character itself. */
export function canonicalKey(key: string): { key: string; shift: boolean } {
	if (key.length === 1) {
		const code = key.charCodeAt(0)
		if (code >= 0x41 && code <= 0x5a) return { key: key.toLowerCase(), shift: true }
		const base = BASE_OF_SHIFTED[key]
		if (base !== undefined) return { key: base, shift: true }
		return { key, shift: false }
	}
	const named = NAMED_KEYS[key.toLowerCase()]
	if (named) return { key: named, shift: false }
	if (/^f\d{1,2}$/i.test(key)) return { key: 'F' + key.slice(1), shift: false }
	return { key, shift: false }
}

/** Parses `ctrl+shift+z`, `alt+left`, `shift+.`, `'`, `F5` or a bare `+`. */
export function parseChord(spec: string): KeyChord {
	const chord: KeyChord = { key: '', shift: false, ctrl: false, alt: false }
	const trimmed = spec.trim()
	if (trimmed === '+') return { ...chord, key: '=', shift: true }
	// `ctrl++` style specs end with the plus key itself.
	const tokens = trimmed.endsWith('++')
		? [...trimmed.slice(0, -2).split('+'), '+']
		: trimmed.split('+')
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i]
		const lower = token.toLowerCase()
		const isLast = i === tokens.length - 1
		if (!isLast && (lower === 'ctrl' || lower === 'control')) chord.ctrl = true
		else if (!isLast && (lower === 'alt' || lower === 'option' || lower === 'meta'))
			chord.alt = true
		else if (!isLast && lower === 'shift') chord.shift = true
		else {
			const canonical = canonicalKey(token)
			chord.key = canonical.key
			if (canonical.shift) chord.shift = true
		}
	}
	return chord
}

/** The chord a key event represents; letters and shifted punctuation fold onto their base key. */
export function chordFromEvent(event: KeyEvent): KeyChord {
	const canonical = canonicalKey(event.key)
	return {
		key: canonical.key,
		shift: event.shift || canonical.shift,
		ctrl: event.ctrl,
		alt: event.alt,
	}
}

function chordId(chord: KeyChord): string {
	return `${chord.key}|${chord.shift ? 's' : ''}${chord.ctrl ? 'c' : ''}${chord.alt ? 'a' : ''}`
}

/**
 * Actions whose `kbd` in ACTION_META collides with another binding or is routed by the input
 * controller itself: `g` (geo picker + cycle), `s` (style panel), Enter (forwarded to the editor so
 * the select tool starts editing), Escape (`editor.cancel()`), and ctrl+g, which toggles.
 */
const PRIMARY_EXCLUDED: ReadonlySet<ActionId> = new Set<ActionId>([
	'edit.group',
	'edit.ungroup',
	'edit.select-none',
	'edit.edit-text',
	'tool.geo',
	'view.toggle-style-panel',
])

/** Aliases beyond each action's `kbd`; the help overlay lists them next to the primary key. */
const EXTRA_BINDINGS: ReadonlyArray<[spec: string, id: ActionId]> = [
	['+', 'view.zoom-in'],
	['ctrl+=', 'view.zoom-in'],
	['_', 'view.zoom-out'],
	['b', 'tool.draw'],
	['x', 'tool.draw'],
	['backspace', 'edit.delete'],
	['F1', 'ui.help'],
	['F3', 'ui.style-panel'],
	['F9', 'ui.menu'],
	['shift+F10', 'ui.context-menu'],
	['ctrl+space', 'view.toggle-pointer-mode'],
	['alt+left', 'page.prev'],
	['alt+up', 'page.prev'],
	['alt+right', 'page.next'],
	['alt+down', 'page.next'],
]

function buildBindings(): ShortcutBinding[] {
	const bindings: ShortcutBinding[] = []
	for (const id of ACTION_IDS) {
		const meta = ACTION_META[id]
		if (meta.kbd && !PRIMARY_EXCLUDED.has(id)) {
			bindings.push({ chord: parseChord(meta.kbd), action: { id }, encoding: 'any' })
		}
		if (meta.kbdFull) {
			bindings.push({ chord: parseChord(meta.kbdFull), action: { id }, encoding: 'full' })
		}
	}
	for (const [spec, id] of EXTRA_BINDINGS) {
		bindings.push({ chord: parseChord(spec), action: { id }, encoding: 'any' })
	}
	return bindings
}

export const SHORTCUT_BINDINGS: readonly ShortcutBinding[] = buildBindings()

function buildLookup(encoding: KeyboardEncoding): ReadonlyMap<string, ActionInvocation> {
	const map = new Map<string, ActionInvocation>()
	// Later bindings never override earlier ones, so ACTION_META's order decides collisions.
	for (const binding of SHORTCUT_BINDINGS) {
		if (binding.encoding === 'full' && encoding !== 'full') continue
		const id = chordId(binding.chord)
		if (!map.has(id)) map.set(id, binding.action)
	}
	return map
}

const LOOKUP: Readonly<Record<KeyboardEncoding, ReadonlyMap<string, ActionInvocation>>> = {
	legacy: buildLookup('legacy'),
	full: buildLookup('full'),
}

/** The action a key press triggers, or null (releases and unbound keys). */
export function matchShortcut(
	event: KeyEvent,
	encoding: KeyboardEncoding
): ActionInvocation | null {
	if (event.release) return null
	return LOOKUP[encoding].get(chordId(chordFromEvent(event))) ?? null
}

/** Every chord bound to an action in an encoding, for tests and the help overlay. */
export function bindingsForAction(id: ActionId, encoding: KeyboardEncoding): KeyChord[] {
	const chords: KeyChord[] = []
	for (const binding of SHORTCUT_BINDINGS) {
		if (binding.action.id !== id) continue
		if (binding.encoding === 'full' && encoding !== 'full') continue
		if (LOOKUP[encoding].get(chordId(binding.chord))?.id === id) chords.push(binding.chord)
	}
	return chords
}
