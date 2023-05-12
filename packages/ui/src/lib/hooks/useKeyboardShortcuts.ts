import { preventDefault, useApp } from '@tldraw/editor'
import hotkeys from 'hotkeys-js'
import { useEffect } from 'react'
import { useActions } from './useActions'
import { useAppIsFocused } from './useAppIsFocused'
import { useReadonly } from './useReadonly'
import { useTools } from './useTools'

const SKIP_KBDS = [
	// we set these in useNativeClipboardEvents instead
	'copy',
	'cut',
	'paste',
	'delete',
	// There's also an upload asset action, so we don't want to set the kbd twice
	'asset',
]

/** @public */
export function useKeyboardShortcuts() {
	const app = useApp()

	const appIsFocused = useAppIsFocused()
	const isReadonly = useReadonly()
	const actions = useActions()
	const tools = useTools()

	useEffect(() => {
		if (!appIsFocused) return

		const container = app.getContainer()

		const hot = (keys: string, callback: (event: KeyboardEvent) => void) => {
			hotkeys(keys, { element: container, scope: app.instanceId }, callback)
		}

		// Add hotkeys for actions and tools.
		// Except those that in SKIP_KBDS!
		const areShortcutsDisabled = () => app.isMenuOpen || app.editingId !== null || app.crashingError

		for (const action of Object.values(actions)) {
			if (!action.kbd) continue
			if (isReadonly && !action.readonlyOk) continue
			if (SKIP_KBDS.includes(action.id)) continue

			hot(getHotkeysStringFromKbd(action.kbd), (event) => {
				if (areShortcutsDisabled()) return
				preventDefault(event)
				action.onSelect('kbd')
			})
		}

		for (const tool of Object.values(tools)) {
			if (!tool.kbd) continue

			if (SKIP_KBDS.includes(tool.id)) continue

			hot(getHotkeysStringFromKbd(tool.kbd), (event) => {
				if (areShortcutsDisabled()) return
				preventDefault(event)
				tool.onSelect('kbd')
			})
		}

		// Manually add in a few shortcuts that have "extra" kbds
		// todo: move these into the actions themselves and make the UI only display the first one

		hot('g', () => {
			if (areShortcutsDisabled()) return
			app.setSelectedTool('geo')
		})

		hot('del,backspace', () => {
			if (areShortcutsDisabled()) return
			actions['delete'].onSelect('kbd')
		})

		hot('=', () => {
			if (areShortcutsDisabled()) return
			actions['zoom-in'].onSelect('kbd')
		})

		hot('-', () => {
			if (areShortcutsDisabled()) return
			actions['zoom-out'].onSelect('kbd')
		})

		hotkeys.setScope(app.instanceId)

		return () => {
			hotkeys.deleteScope(app.instanceId)
		}
	}, [actions, tools, isReadonly, app, appIsFocused])
}

function getHotkeysStringFromKbd(kbd: string) {
	let str = ''

	const chars = kbd.split('')

	if (chars.length === 1) {
		str = chars[0]
	} else {
		if (chars[0] === '!') {
			str = `shift+${chars[1]}`
		} else if (chars[0] === '?') {
			str = `alt+${chars[1]}`
		} else if (chars[0] === '$') {
			if (chars[1] === '!') {
				str = `cmd+shift+${chars[2]},ctrl+shift+${chars[2]}`
			} else if (chars[1] === '?') {
				str = `cmd+⌥+${chars[2]},ctrl+alt+${chars[2]}`
			} else {
				str = `cmd+${chars[1]},ctrl+${chars[1]}`
			}
		} else {
			str = kbd
		}
	}

	return str
}
