/*!
 * The kbd-string splitter (`getKeys`) and the form-input filter pattern in `shouldSkipEvent`
 * (including its list of non-text INPUT types) are adapted from hotkeys-js, which this hook
 * previously depended on.
 *
 * MIT License: https://github.com/jaywcjlove/hotkeys-js/blob/master/LICENSE
 * Copyright (c) 2015-present, Kenny Wong
 * Copyright (c) 2011-2013 Thomas Fuchs (https://github.com/madrobby/keymaster)
 * Source: https://github.com/jaywcjlove/hotkeys-js
 */

import {
	Editor,
	TLPointerEventInfo,
	isAccelKey,
	preventDefault,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { useEffect } from 'react'
import { useActions } from '../context/actions'
import { useReadonly } from './useReadonly'
import { useTools } from './useTools'

const SKIP_KBDS = [
	// we set these in useNativeClipboardEvents instead
	'copy',
	'cut',
	'paste',
	// There's also an upload asset action, so we don't want to set the kbd twice
	'asset',
]

/** @public */
export function useKeyboardShortcuts() {
	const editor = useEditor()

	const isReadonlyMode = useReadonly()
	const actions = useActions()
	const tools = useTools()
	const isFocused = useValue('is focused', () => editor.getInstanceState().isFocused, [editor])
	useEffect(() => {
		if (!isFocused) return

		const registry: Registration[] = []

		const register = (kbd: string, onKeyDown?: KbdHandler, onKeyUp?: KbdHandler) => {
			const parsed = parseKbd(kbd)
			if (parsed.length === 0) return
			registry.push({ parsed, onKeyDown, onKeyUp })
		}

		// Add hotkeys for actions and tools.
		// Except those that in SKIP_KBDS!
		for (const action of Object.values(actions)) {
			if (!action.kbd) continue
			if (isReadonlyMode && !action.readonlyOk) continue
			if (SKIP_KBDS.includes(action.id)) continue

			register(getHotkeysStringFromKbd(action.kbd), (event) => {
				if (areShortcutsDisabled(editor) && !action.isRequiredA11yAction) return
				preventDefault(event)
				action.onSelect('kbd')
			})
		}

		for (const tool of Object.values(tools)) {
			if (!tool.kbd || (!tool.readonlyOk && editor.getIsReadonly())) {
				continue
			}

			if (SKIP_KBDS.includes(tool.id)) continue

			register(getHotkeysStringFromKbd(tool.kbd), (event) => {
				if (areShortcutsDisabled(editor)) return
				preventDefault(event)
				tool.onSelect('kbd')
			})
		}

		register(
			',',
			(e) => {
				// Skip if shortcuts are disabled
				if (areShortcutsDisabled(editor)) return

				// Don't press again if already pressed
				if (editor.inputs.keys.has('Comma')) return

				preventDefault(e) // prevent whatever would normally happen
				editor.focus() // Focus if not already focused

				editor.inputs.keys.add('Comma')

				const { x, y, z } = editor.inputs.getCurrentPagePoint()
				const screenpoints = editor.pageToScreen({ x, y })

				const info: TLPointerEventInfo = {
					type: 'pointer',
					name: 'pointer_down',
					point: { x: screenpoints.x, y: screenpoints.y, z },
					shiftKey: e.shiftKey,
					altKey: e.altKey,
					ctrlKey: e.metaKey || e.ctrlKey,
					metaKey: e.metaKey,
					accelKey: isAccelKey(e),
					pointerId: 0,
					button: 0,
					isPen: editor.getInstanceState().isPenMode,
					target: 'canvas',
				}

				editor.dispatch(info)
			},
			(e) => {
				if (areShortcutsDisabled(editor)) return
				if (!editor.inputs.keys.has('Comma')) return

				editor.inputs.keys.delete('Comma')

				const { x, y, z } = editor.inputs.getCurrentPagePoint()
				const screenPoint = editor.pageToScreen({ x, y })
				const info: TLPointerEventInfo = {
					type: 'pointer',
					name: 'pointer_up',
					point: { x: screenPoint.x, y: screenPoint.y, z },
					shiftKey: e.shiftKey,
					altKey: e.altKey,
					ctrlKey: e.metaKey || e.ctrlKey,
					metaKey: e.metaKey,
					accelKey: isAccelKey(e),
					pointerId: 0,
					button: 0,
					isPen: editor.getInstanceState().isPenMode,
					target: 'canvas',
				}

				editor.dispatch(info)
			}
		)

		const body = editor.getContainerDocument().body

		const handleKeyDown = (e: KeyboardEvent) => {
			if (shouldSkipEvent(e)) return
			for (const reg of registry) {
				if (!reg.onKeyDown) continue
				for (const p of reg.parsed) {
					if (matchesEvent(e, p)) {
						reg.onKeyDown(e)
						break
					}
				}
			}
		}

		const handleKeyUp = (e: KeyboardEvent) => {
			if (shouldSkipEvent(e)) return
			for (const reg of registry) {
				if (!reg.onKeyUp) continue
				for (const p of reg.parsed) {
					if (matchesEvent(e, p)) {
						reg.onKeyUp(e)
						break
					}
				}
			}
		}

		body.addEventListener('keydown', handleKeyDown)
		body.addEventListener('keyup', handleKeyUp)

		return () => {
			body.removeEventListener('keydown', handleKeyDown)
			body.removeEventListener('keyup', handleKeyUp)
		}
	}, [actions, tools, isReadonlyMode, editor, isFocused])
}

export function areShortcutsDisabled(editor: Editor) {
	return (
		editor.menus.hasAnyOpenMenus() ||
		editor.getEditingShapeId() !== null ||
		editor.getCrashingError() ||
		!editor.user.getAreKeyboardShortcutsEnabled()
	)
}

// kbd parsing & native event matching
// -----------------------------------
// We deliberately do NOT use `event.code` (physical key position) for primary matching.
// Doing so breaks alternative Latin keyboard layouts (Dvorak, Colemak, AZERTY) because
// `event.code` always reflects the US-QWERTY position regardless of what the user typed.
// Instead we match the typed character (`event.key`) and only fall back to `event.code` for
// non-Latin layouts (Cyrillic, Greek, etc.) and macOS Option-letter dead-key combinations,
// where `event.key` is a non-ASCII glyph.

interface ParsedKbd {
	key: string
	shift: boolean
	alt: boolean
	ctrl: boolean
	meta: boolean
}

type KbdHandler = (event: KeyboardEvent) => void

interface Registration {
	parsed: ParsedKbd[]
	onKeyDown?: KbdHandler
	onKeyUp?: KbdHandler
}

const MODIFIER_ALIASES: Record<string, 'shift' | 'alt' | 'ctrl' | 'meta'> = {
	shift: 'shift',
	'⇧': 'shift',
	alt: 'alt',
	option: 'alt',
	'⌥': 'alt',
	ctrl: 'ctrl',
	control: 'ctrl',
	'⌃': 'ctrl',
	cmd: 'meta',
	command: 'meta',
	meta: 'meta',
	'⌘': 'meta',
}

// Aliases for named keys. Values match the lowercased `event.key` for that key.
const KEY_ALIASES: Record<string, string> = {
	'⌫': 'backspace',
	'↩': 'enter',
	return: 'enter',
	esc: 'escape',
	del: 'delete',
	ins: 'insert',
	left: 'arrowleft',
	right: 'arrowright',
	up: 'arrowup',
	down: 'arrowdown',
	space: ' ',
}

// When shift is held, `event.key` reports the shifted character (e.g. '<' for shift+,).
// Map those back so a `shift+,` shortcut definition matches.
const SHIFT_KEY_TO_BASE: Record<string, string> = {
	'<': ',',
	'>': '.',
	'?': '/',
	':': ';',
	'"': "'",
	'{': '[',
	'}': ']',
	'|': '\\',
	_: '-',
	'+': '=',
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
}

// Physical key code -> US-QWERTY-equivalent character. Used as a fallback when `event.key`
// is non-ASCII (Cyrillic, Greek, macOS Option dead-keys, etc.).
const PHYSICAL_KEY_MAP: Record<string, string> = {
	KeyA: 'a',
	KeyB: 'b',
	KeyC: 'c',
	KeyD: 'd',
	KeyE: 'e',
	KeyF: 'f',
	KeyG: 'g',
	KeyH: 'h',
	KeyI: 'i',
	KeyJ: 'j',
	KeyK: 'k',
	KeyL: 'l',
	KeyM: 'm',
	KeyN: 'n',
	KeyO: 'o',
	KeyP: 'p',
	KeyQ: 'q',
	KeyR: 'r',
	KeyS: 's',
	KeyT: 't',
	KeyU: 'u',
	KeyV: 'v',
	KeyW: 'w',
	KeyX: 'x',
	KeyY: 'y',
	KeyZ: 'z',
	Digit0: '0',
	Digit1: '1',
	Digit2: '2',
	Digit3: '3',
	Digit4: '4',
	Digit5: '5',
	Digit6: '6',
	Digit7: '7',
	Digit8: '8',
	Digit9: '9',
	Comma: ',',
	Period: '.',
	Slash: '/',
	Semicolon: ';',
	Quote: "'",
	BracketLeft: '[',
	BracketRight: ']',
	Backslash: '\\',
	Minus: '-',
	Equal: '=',
	Backquote: '`',
}

function parseKbd(kbd: string): ParsedKbd[] {
	const out: ParsedKbd[] = []
	for (const shortcut of getKeys(kbd)) {
		const parsed = parseShortcut(shortcut)
		if (parsed) out.push(parsed)
	}
	return out
}

function parseShortcut(shortcut: string): ParsedKbd | null {
	const parts = shortcut.split('+')
	const result: ParsedKbd = {
		key: '',
		shift: false,
		alt: false,
		ctrl: false,
		meta: false,
	}

	let keyPart = ''
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i]
		const isLast = i === parts.length - 1
		if (!isLast) {
			const modAlias = MODIFIER_ALIASES[part.toLowerCase()]
			if (modAlias) result[modAlias] = true
			// silently drop unknown leading parts
		} else {
			keyPart = part
		}
	}

	if (!keyPart) return null

	let key = keyPart.toLowerCase()
	if (KEY_ALIASES[key]) key = KEY_ALIASES[key]
	result.key = key
	return result
}

function getEventKey(e: KeyboardEvent): string {
	let key = e.key.toLowerCase()
	if (e.shiftKey && SHIFT_KEY_TO_BASE[key]) {
		key = SHIFT_KEY_TO_BASE[key]
	}
	return key
}

function matchesEvent(e: KeyboardEvent, parsed: ParsedKbd): boolean {
	if (e.shiftKey !== parsed.shift) return false
	if (e.altKey !== parsed.alt) return false
	if (e.ctrlKey !== parsed.ctrl) return false
	if (e.metaKey !== parsed.meta) return false

	const eventKey = getEventKey(e)
	if (eventKey === parsed.key) return true

	// Fallback for non-Latin layouts (Cyrillic, Greek, etc.) and macOS Option dead-keys,
	// where event.key is a non-ASCII glyph that wouldn't match any of our shortcut keys.
	// We re-derive the intended key from event.code's US-QWERTY equivalent. Importantly,
	// we only use this fallback when event.key is non-ASCII so that Dvorak/Colemak/AZERTY
	// users — whose event.key IS the Latin character they typed — keep getting the right match.
	if (eventKey.length === 1 && /^[\x20-\x7e]$/.test(eventKey)) return false
	const codeKey = PHYSICAL_KEY_MAP[e.code]
	return codeKey === parsed.key
}

function shouldSkipEvent(e: KeyboardEvent): boolean {
	if (e.isComposing) return true
	const target = e.target as HTMLElement | null
	if (!target) return false
	if (target.isContentEditable) return true
	const tagName = target.tagName
	if (tagName === 'SELECT') return true
	if (tagName === 'TEXTAREA') {
		return !(target as HTMLTextAreaElement).readOnly
	}
	if (tagName === 'INPUT') {
		const input = target as HTMLInputElement
		// Form inputs that don't accept text input should not block shortcuts.
		if (
			['checkbox', 'radio', 'range', 'button', 'file', 'reset', 'submit', 'color'].includes(
				input.type
			)
		) {
			return false
		}
		return !input.readOnly
	}
	return false
}

// The "raw" kbd here will look something like "a" or a combination of keys "del,backspace".
// We need to first split them up by comma, then parse each key to ensure backwards compatibility
// with the old kbd format. We used to have symbols to denote cmd/alt/shift,
// using ! for shift, $ for cmd, and ? for alt.
function getHotkeysStringFromKbd(kbd: string) {
	return getKeys(kbd)
		.map((kbd) => {
			let str = ''

			const shift = kbd.includes('!')
			const alt = kbd.includes('?')
			const cmd = kbd.includes('$')

			// remove the modifiers; the remaining string are the actual key
			const k = kbd.replace(/[!?$]/g, '')

			if (shift && alt && cmd) {
				str = `cmd+shift+alt+${k},ctrl+shift+alt+${k}`
			} else if (shift && cmd) {
				str = `cmd+shift+${k},ctrl+shift+${k}`
			} else if (alt && cmd) {
				str = `cmd+alt+${k},ctrl+alt+${k}`
			} else if (alt && shift) {
				str = `shift+alt+${k}`
			} else if (shift) {
				str = `shift+${k}`
			} else if (alt) {
				str = `alt+${k}`
			} else if (cmd) {
				str = `cmd+${k},ctrl+${k}`
			} else {
				str = k
			}

			return str
		})
		.join(',')
}

// Split a kbd string on commas, treating an empty entry produced by "x,," as a literal
// trailing comma on the previous entry. Verbatim port of the splitter from hotkeys-js
// (MIT, see top-of-file attribution).
function getKeys(key: string) {
	if (typeof key !== 'string') key = ''
	key = key.replace(/\s/g, '')
	const keys = key.split(',')
	let index = keys.lastIndexOf('')

	for (; index >= 0; ) {
		keys[index - 1] += ','
		keys.splice(index, 1)
		index = keys.lastIndexOf('')
	}

	return keys
}
