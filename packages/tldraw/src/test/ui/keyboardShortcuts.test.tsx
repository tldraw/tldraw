import { act } from '@testing-library/react'
import { createShapeId, Editor } from '@tldraw/editor'
import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { DefaultKeyboardShortcutsDialogContent } from '../../lib/ui/components/KeyboardShortcutsDialog/DefaultKeyboardShortcutsDialogContent'
import { TldrawUiMenuContextProvider } from '../../lib/ui/components/primitives/menus/TldrawUiMenuContext'
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

// Shortcuts that have a kbd but intentionally don't get their own row in the default keyboard
// shortcuts dialog. If you add a shortcut that should be visible to users, add it to
// DefaultKeyboardShortcutsDialogContent instead of this list.
const NOT_IN_SHORTCUTS_DIALOG = new Set([
	// Opening the shortcuts dialog is covered by the a11y "Open keyboard shortcuts" row.
	'open-kbd-shortcuts',
	// Covered by the a11y "Open context menu" row.
	'a11y-open-context-menu',
	// Cursor-targeted variants of zoom in/out that share a label with the rows already shown.
	'zoom-in-on-cursor',
	'zoom-out-on-cursor',
	// Rotation is covered by the a11y "Rotate shape" rows.
	'rotate-cw',
	'rotate-ccw',
	// Cursor-targeted paste variants of the paste row already shown.
	'paste-at-cursor',
	'paste-plain-text-at-cursor',
	// Style-picking shortcuts that aren't surfaced in the dialog.
	'select-white-color',
	'select-fill-fill',
	'select-fill-lined-fill',
	// Re-selects the last geo tool; covered by the rectangle/ellipse tool rows.
	'select-geo-tool',
	// Page navigation shortcuts without dialog labels.
	'change-page-prev',
	'change-page-next',
	// Only rendered when collaboration UI is enabled, which is off in this test.
	'open-cursor-chat',
])

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

	it('lists every shortcut in the keyboard shortcuts dialog (or marks it as intentionally omitted)', async () => {
		let entries: ShortcutEntry[] = []
		const rendered = await renderTldrawComponent(
			<Tldraw>
				<ShortcutCapturer onCapture={(captured) => (entries = captured)} />
				<TldrawUiMenuContextProvider type="keyboard-shortcuts" sourceId="kbd">
					<DefaultKeyboardShortcutsDialogContent />
				</TldrawUiMenuContextProvider>
			</Tldraw>,
			{ waitForPatterns: false }
		)

		// The raw ids (without the `action.`/`tool.` prefix) rendered as rows in the dialog.
		const idsInDialog = new Set(
			[...rendered.container.querySelectorAll('[data-testid^="kbd."]')].map((el) =>
				el.getAttribute('data-testid')!.slice('kbd.'.length)
			)
		)
		expect(idsInDialog.size).toBeGreaterThan(0)

		const missing = entries
			.map((entry) => entry.id.replace(/^(action|tool)\./, ''))
			.filter((id) => !idsInDialog.has(id) && !NOT_IN_SHORTCUTS_DIALOG.has(id))

		expect(missing).toEqual([])
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

// Regression tests for shift+<digit> shortcuts across keyboard layouts. The physical number-row
// keys are the same everywhere, but the shifted glyph varies by layout: US shift+2 is '@', British
// PC and German '"'. German is the sharp case — it has no dedicated '=' key, so shift+0 produces
// '=', which used to alias to the '=' zoom-in shortcut instead of zoom-to-100. Matching keys off
// the physical Digit<N> code, so these work regardless of layout and never cross-fire.
describe('shifted number-row shortcuts across keyboard layouts', () => {
	it.each([
		['US / Apple British', '@'],
		['British PC / German', '"'],
		// On AZERTY the number row is shifted, so shift+Digit2 already types '2'.
		['AZERTY', '2'],
	])('fires zoom-to-selection on shift+2 for a %s layout glyph', async (_layout, key) => {
		const { editor } = await setupFocusedEditor()
		const id = createShapeId()
		act(() => {
			editor.createShape({ id, type: 'geo', x: 0, y: 0 })
			editor.select(id)
		})
		const zoomToSelection = vi.spyOn(editor, 'zoomToSelection').mockImplementation(() => editor)

		keydown(editor, { key, code: 'Digit2', shiftKey: true })

		expect(zoomToSelection).toHaveBeenCalledTimes(1)
	})

	it.each([
		['US / UK', ')'],
		// German has no '=' key; it sits on shift+0, so this press must still mean zoom-to-100.
		['German', '='],
	])('zooms to 100%% (never zoom-in) on shift+0 for a %s layout glyph', async (_layout, key) => {
		const { editor } = await setupFocusedEditor()
		const resetZoom = vi.spyOn(editor, 'resetZoom').mockImplementation(() => editor)
		const zoomIn = vi.spyOn(editor, 'zoomIn').mockImplementation(() => editor)

		keydown(editor, { key, code: 'Digit0', shiftKey: true })

		expect(resetZoom).toHaveBeenCalledTimes(1)
		expect(zoomIn).not.toHaveBeenCalled()
	})

	it('still fires zoom-out for an unshifted number-row symbol (AZERTY types - on Digit6)', async () => {
		const { editor } = await setupFocusedEditor()
		const zoomOut = vi.spyOn(editor, 'zoomOut').mockImplementation(() => editor)

		keydown(editor, { key: '-', code: 'Digit6' })

		expect(zoomOut).toHaveBeenCalledTimes(1)
	})
})

// Regression test for #10422: frame-selection was the only cmd shortcut without a ctrl twin,
// so Ctrl+Alt+G did nothing on Windows and Linux even though the shortcuts dialog listed it.
describe('frame selection shortcut', () => {
	it.each([
		['cmd+alt+g (macOS)', { metaKey: true }],
		['ctrl+alt+g (Windows / Linux)', { ctrlKey: true }],
	])('wraps the selection in a frame on %s', async (_label, modifier) => {
		const { editor } = await setupFocusedEditor()
		const a = createShapeId()
		const b = createShapeId()
		act(() => {
			editor.createShapes([
				{ id: a, type: 'geo', x: 0, y: 0 },
				{ id: b, type: 'geo', x: 200, y: 200 },
			])
			editor.select(a, b)
		})

		keydown(editor, { key: 'g', code: 'KeyG', altKey: true, ...modifier })

		const frame = editor.getCurrentPageShapes().find((s) => editor.isShapeOfType(s, 'frame'))
		expect(frame).toBeDefined()
		expect(editor.getShape(a)?.parentId).toBe(frame!.id)
		expect(editor.getShape(b)?.parentId).toBe(frame!.id)
	})
})
