import { act } from '@testing-library/react'
import { createShapeId, Editor, TLRichText, TLShapeId, toRichText } from '@tldraw/editor'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { useActions } from '../../lib/ui/context/actions'
import {
	getHotkeysStringFromKbd,
	ParsedKbd,
	parseKbd,
} from '../../lib/ui/hooks/useKeyboardShortcuts'
import { useTools } from '../../lib/ui/hooks/useTools'
import { richTextHasMarkEverywhere } from '../../lib/utils/text/richText'
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

	it('releases the held key even when the keyup lands on a text input', async () => {
		const { editor } = await setupFocusedEditor()

		keydown(editor, { key: 'q', code: 'KeyQ', shiftKey: true })
		expect(editor.getInstanceState().isToolLocked).toBe(false)

		// The key is released while focus is inside a text input, so the keyup is otherwise
		// skipped. It must still clear the held-key tracking.
		const body = editor.getContainerDocument().body
		const input = editor.getContainerDocument().createElement('input')
		body.appendChild(input)
		act(() => {
			input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'q', code: 'KeyQ' }))
		})
		body.removeChild(input)

		// A fresh plain `q` press now works rather than being blocked by a stale entry.
		keydown(editor, { key: 'q', code: 'KeyQ' })
		expect(editor.getInstanceState().isToolLocked).toBe(true)
	})

	// Regression test for #9099: redo (cmd+shift+z) stopped firing after an undo (cmd+z) on
	// macOS, where the browser swallows the `z` keyup while cmd stays held. The held-key
	// tracking from #9099 never got cleared, so the stale undo registration blocked the redo
	// on the same physical `KeyZ`. A fresh keypress must always be free to trigger its match.
	it('fires redo after undo on the same physical key when the keyup is swallowed (cmd held)', async () => {
		const { editor } = await setupFocusedEditor()

		const id = createShapeId()
		act(() => {
			editor.markHistoryStoppingPoint()
			editor.createShape({ id, type: 'geo', x: 0, y: 0 })
		})
		expect(editor.getCurrentPageShapeIds().has(id)).toBe(true)

		// cmd+z undoes the shape creation. On macOS the `z` keyup is never delivered while cmd
		// stays held, so we deliberately don't dispatch it.
		keydown(editor, { key: 'z', code: 'KeyZ', metaKey: true })
		expect(editor.getCurrentPageShapeIds().has(id)).toBe(false)

		// Adding shift and pressing z again is a fresh keypress (not an auto-repeat), so it must
		// trigger redo rather than being blocked by the stale undo registration on `KeyZ`.
		keydown(editor, { key: 'z', code: 'KeyZ', metaKey: true, shiftKey: true })
		expect(editor.getCurrentPageShapeIds().has(id)).toBe(true)
	})
})

function createTextShape(editor: Editor, text: string): TLShapeId {
	const id = createShapeId()
	editor.createShape({ id, type: 'text', props: { richText: toRichText(text) } })
	return id
}

function getRichText(editor: Editor, id: TLShapeId): TLRichText {
	return (editor.getShape(id)!.props as { richText: TLRichText }).richText
}

describe('format shortcuts on selected shapes', () => {
	it('toggles bold on a selected text shape with cmd+b', async () => {
		const { editor } = await setupFocusedEditor()
		const id = createTextShape(editor, 'hello')
		editor.select(id)

		keydown(editor, { key: 'b', code: 'KeyB', metaKey: true })
		expect(richTextHasMarkEverywhere(getRichText(editor, id), 'bold')).toBe(true)

		keydown(editor, { key: 'b', code: 'KeyB', metaKey: true })
		expect(richTextHasMarkEverywhere(getRichText(editor, id), 'bold')).toBe(false)
	})

	it('toggles italic on a selected text shape with cmd+i', async () => {
		const { editor } = await setupFocusedEditor()
		const id = createTextShape(editor, 'hello')
		editor.select(id)

		keydown(editor, { key: 'i', code: 'KeyI', metaKey: true })
		expect(richTextHasMarkEverywhere(getRichText(editor, id), 'italic')).toBe(true)
	})

	it('toggles bold across a multi-selection, only unbolding when all are bold', async () => {
		const { editor } = await setupFocusedEditor()
		const a = createTextShape(editor, 'a')
		const b = createTextShape(editor, 'b')
		editor.select(a, b)

		// Neither bold yet: pressing bold marks both.
		keydown(editor, { key: 'b', code: 'KeyB', metaKey: true })
		expect(richTextHasMarkEverywhere(getRichText(editor, a), 'bold')).toBe(true)
		expect(richTextHasMarkEverywhere(getRichText(editor, b), 'bold')).toBe(true)

		// Now all bold: pressing bold removes it from both.
		keydown(editor, { key: 'b', code: 'KeyB', metaKey: true })
		expect(richTextHasMarkEverywhere(getRichText(editor, a), 'bold')).toBe(false)
		expect(richTextHasMarkEverywhere(getRichText(editor, b), 'bold')).toBe(false)
	})

	it('ignores empty-text shapes so a fully bold selection can still toggle off', async () => {
		const { editor } = await setupFocusedEditor()
		const text = createTextShape(editor, 'hello')
		// An empty geo label has a `richText` prop but no text content.
		const geo = createShapeId()
		editor.createShape({ id: geo, type: 'geo' })
		editor.select(text, geo)

		// Bold the text shape (the empty geo is skipped).
		keydown(editor, { key: 'b', code: 'KeyB', metaKey: true })
		expect(richTextHasMarkEverywhere(getRichText(editor, text), 'bold')).toBe(true)

		// The text shape is fully bold, so pressing bold again removes it even though the empty
		// geo shape is also selected.
		keydown(editor, { key: 'b', code: 'KeyB', metaKey: true })
		expect(richTextHasMarkEverywhere(getRichText(editor, text), 'bold')).toBe(false)
	})

	it('does not bold a locked shape', async () => {
		const { editor } = await setupFocusedEditor()
		const id = createTextShape(editor, 'hello')
		editor.updateShape({ id, type: 'text', isLocked: true })
		editor.setSelectedShapes([id])

		keydown(editor, { key: 'b', code: 'KeyB', metaKey: true })
		expect(richTextHasMarkEverywhere(getRichText(editor, id), 'bold')).toBe(false)
	})
})
