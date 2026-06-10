import { act } from '@testing-library/react'
import { Editor } from '@tldraw/editor'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { useActions } from '../../lib/ui/context/actions'
import {
	getHotkeysStringFromKbd,
	ParsedKbd,
	parseKbd,
} from '../../lib/ui/hooks/useKeyboardShortcuts'
import { useTools } from '../../lib/ui/hooks/useTools'
import {
	renderTldrawComponent,
	renderTldrawComponentWithEditor,
} from '../testutils/renderTldrawComponent'

// These kbds are intentionally not registered in the shortcut registry, they're handled by
// useNativeClipboardEvents / the upload asset action instead. See SKIP_KBDS in useKeyboardShortcuts.
const SKIP_KBDS = ['copy', 'cut', 'paste', 'asset']

interface ShortcutEntry {
	id: string
	kbd: string
}

function serializeParsedKbd(parsed: ParsedKbd): string {
	const modifiers: string[] = []
	if (parsed.meta) modifiers.push('meta')
	if (parsed.ctrl) modifiers.push('ctrl')
	if (parsed.alt) modifiers.push('alt')
	if (parsed.shift) modifiers.push('shift')
	return [...modifiers, parsed.key].join('+')
}

export function getKbdKeyCombos(kbd: string): string[] {
	return parseKbd(getHotkeysStringFromKbd(kbd)).map(serializeParsedKbd)
}

function ShortcutCapturer({ onCapture }: { onCapture(entries: ShortcutEntry[]): void }) {
	const actions = useActions()
	const tools = useTools()

	useEffect(() => {
		const entries: ShortcutEntry[] = []
		for (const action of Object.values(actions)) {
			if (!action.kbd || SKIP_KBDS.includes(action.id)) continue
			entries.push({ id: `action.${action.id}`, kbd: action.kbd })
		}
		for (const tool of Object.values(tools)) {
			if (!tool.kbd || SKIP_KBDS.includes(tool.id)) continue
			entries.push({ id: `tool.${tool.id}`, kbd: tool.kbd })
		}
		onCapture(entries)
	}, [actions, tools, onCapture])

	return null
}

async function getDefaultShortcutEntries() {
	let captured: ShortcutEntry[] = []
	await renderTldrawComponent(
		<Tldraw>
			<ShortcutCapturer onCapture={(entries) => (captured = entries)} />
		</Tldraw>,
		{ waitForPatterns: false }
	)
	return captured
}

describe('default keyboard shortcuts', () => {
	it('does not bind the same key combo to more than one action or tool', async () => {
		const entries = await getDefaultShortcutEntries()

		// Sanity check: we actually captured the default actions/tools.
		expect(entries.length).toBeGreaterThan(0)

		const comboToIds = new Map<string, string[]>()
		for (const entry of entries) {
			for (const combo of getKbdKeyCombos(entry.kbd)) {
				const ids = comboToIds.get(combo) ?? []
				ids.push(entry.id)
				comboToIds.set(combo, ids)
			}
		}

		const collisions = [...comboToIds.entries()]
			.filter(([, ids]) => ids.length > 1)
			.map(([combo, ids]) => `${combo} -> ${ids.join(', ')}`)

		expect(collisions).toEqual([])
	})
})

async function setupFocusedEditor() {
	const { editor } = await renderTldrawComponentWithEditor(
		(onMount) => <Tldraw onMount={onMount} />,
		{ waitForPatterns: false }
	)

	// Shortcuts only register while the editor is focused.
	act(() => {
		editor.updateInstanceState({ isFocused: true })
	})

	return { editor }
}

function keydown(editor: Editor, init: KeyboardEventInit) {
	act(() => {
		editor
			.getContainerDocument()
			.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }))
	})
}

function keyup(editor: Editor, init: KeyboardEventInit) {
	act(() => {
		editor
			.getContainerDocument()
			.body.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, ...init }))
	})
}

describe('keyboard shortcuts with a held key', () => {
	it('fires the plain shortcut on a fresh key press', async () => {
		const { editor } = await setupFocusedEditor()
		expect(editor.getInstanceState().isToolLocked).toBe(false)

		// Plain `q` toggles tool lock.
		keydown(editor, { key: 'q', code: 'KeyQ' })
		expect(editor.getInstanceState().isToolLocked).toBe(true)
	})

	it('does not fall back to the plain shortcut when a modifier is released mid-hold', async () => {
		const { editor } = await setupFocusedEditor()
		expect(editor.getInstanceState().isToolLocked).toBe(false)

		// Press shift+q (copy-hovered-styles), which does not toggle tool lock.
		keydown(editor, { key: 'q', code: 'KeyQ', shiftKey: true })
		expect(editor.getInstanceState().isToolLocked).toBe(false)

		// Release shift but keep holding q. The auto-repeat keydown events should not start
		// firing the adjacent plain `q` shortcut (toggle tool lock).
		keydown(editor, { key: 'q', code: 'KeyQ', shiftKey: false, repeat: true })
		keydown(editor, { key: 'q', code: 'KeyQ', shiftKey: false, repeat: true })
		expect(editor.getInstanceState().isToolLocked).toBe(false)
	})

	it('fires the plain shortcut again after the held key is released and pressed fresh', async () => {
		const { editor } = await setupFocusedEditor()

		keydown(editor, { key: 'q', code: 'KeyQ', shiftKey: true })
		keydown(editor, { key: 'q', code: 'KeyQ', shiftKey: false, repeat: true })
		expect(editor.getInstanceState().isToolLocked).toBe(false)

		// Releasing the physical key clears the held-key tracking, so a fresh press works again.
		keyup(editor, { key: 'q', code: 'KeyQ' })
		keydown(editor, { key: 'q', code: 'KeyQ' })
		expect(editor.getInstanceState().isToolLocked).toBe(true)
	})
})
