import {
	Editor,
	TLPointerEventInfo,
	isAccelKey,
	preventDefault,
	useEditor,
	useValue,
} from '@tldraw/editor'
import hotkeys from 'hotkeys-js'
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

		const disposables = new Array<() => void>()

		const hot = (keys: string, callback: (event: KeyboardEvent) => void) => {
			hotkeys(keys, { element: document.body }, callback)
			disposables.push(() => {
				hotkeys.unbind(keys, callback)
			})
		}

		const hotUp = (keys: string, callback: (event: KeyboardEvent) => void) => {
			hotkeys(keys, { element: document.body, keyup: true, keydown: false }, callback)
			disposables.push(() => {
				hotkeys.unbind(keys, callback)
			})
		}

		// Add hotkeys for actions and tools.
		// Except those that in SKIP_KBDS!
		for (const action of Object.values(actions)) {
			if (!action.kbd) continue
			if (isReadonlyMode && !action.readonlyOk) continue
			if (SKIP_KBDS.includes(action.id)) continue

			hot(getHotkeysStringFromKbd(action.kbd), (event) => {
				if (areShortcutsDisabled(editor)) return
				preventDefault(event)
				action.onSelect('kbd')
			})
		}

		for (const tool of Object.values(tools)) {
			if (!tool.kbd || (!tool.readonlyOk && editor.getIsReadonly())) {
				continue
			}

			if (SKIP_KBDS.includes(tool.id)) continue

			hot(getHotkeysStringFromKbd(tool.kbd), (event) => {
				if (areShortcutsDisabled(editor)) return
				preventDefault(event)
				tool.onSelect('kbd')
			})
		}

		hot(',', (e) => {
			// Skip if shortcuts are disabled
			if (areShortcutsDisabled(editor)) return

			// Don't press again if already pressed
			if (editor.inputs.keys.has('Comma')) return

			preventDefault(e) // prevent whatever would normally happen
			editor.focus() // Focus if not already focused

			editor.inputs.keys.add('Comma')

			const { x, y, z } = editor.inputs.currentPagePoint
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
		})

		hotUp(',', (e) => {
			if (areShortcutsDisabled(editor)) return
			if (!editor.inputs.keys.has('Comma')) return

			editor.inputs.keys.delete('Comma')

			const { x, y, z } = editor.inputs.currentScreenPoint
			const info: TLPointerEventInfo = {
				type: 'pointer',
				name: 'pointer_up',
				point: { x, y, z },
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
		})

		return () => {
			disposables.forEach((d) => d())
		}
	}, [actions, tools, isReadonlyMode, editor, isFocused])
}

// convenience mapping since all real keys need to be single characters, sorry
const MAPPED_KEYS: Record<string, string> = {
	'→': 'right',
	'←': 'left',
}
function getMappedKey(kbd: string) {
	if (MAPPED_KEYS[kbd]) return MAPPED_KEYS[kbd]
	return kbd
}

function getHotkeysStringFromKbd(kbd: string) {
	return getKeys(kbd)
		.map((kbd) => {
			let str = ''
			// The actual key being pressed (the others will be modifiers)
			let k = ''

			// Shift is !
			// Alt is ?
			// Cmd / control is $

			// so cmd+shift+u would be $!u

			const [a, b, c] = kbd.split('')

			if (c) {
				// This is a 3 key combo, the third key (c) is the real key
				k = getMappedKey(c)
				const m = a + b // the modifiers...
				if (m === '!?' || m === '?!') {
					str = `shift+alt+${k}`
				} else if (m === '!$' || m === '$!') {
					str = `cmd+shift+${k},ctrl+shift+${k}`
				} else if (m === '?$' || m === '$?') {
					str = `cmd+alt+${k},ctrl+alt+${k}`
				}
			} else if (b) {
				// This is a 2 key combo, the second key (b) is the real key
				k = getMappedKey(b)
				if (a === '!') {
					str = `shift+${k}`
				} else if (a === '?') {
					str = `alt+${k}`
				} else if (a === '$') {
					str = `cmd+${k},ctrl+${k}`
				}
			} else {
				// This is a single key combo, the only key (a) is the real key
				k = getMappedKey(a)
				str = k
			}
			return str
		})
		.join(',')
}

// Logic to split kbd string from hotkeys-js util.
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

export function areShortcutsDisabled(editor: Editor) {
	return (
		editor.menus.hasAnyOpenMenus() ||
		editor.getEditingShapeId() !== null ||
		editor.getCrashingError()
	)
}
