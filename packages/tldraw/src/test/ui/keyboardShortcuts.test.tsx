import { useEffect } from 'react'
import { Tldraw } from '../../lib/Tldraw'
import { useActions } from '../../lib/ui/context/actions'
import {
	getHotkeysStringFromKbd,
	ParsedKbd,
	parseKbd,
} from '../../lib/ui/hooks/useKeyboardShortcuts'
import { useTools } from '../../lib/ui/hooks/useTools'
import { renderTldrawComponent } from '../testutils/renderTldrawComponent'

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
