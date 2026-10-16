import { describe, expect, it } from 'vitest'
import { ACTION_IDS, ACTION_META, type ActionId } from '../actions/actionIds'
import { SHORTCUT_BINDINGS, bindingsForAction, parseChord } from '../input/keymap'
import {
	HELP_TABS,
	actionShortcuts,
	encodingLabel,
	formatChord,
	helpEntries,
	terminalHints,
	type HelpEntry,
	type KeyboardEncoding,
} from './help'

const ENCODINGS: readonly KeyboardEncoding[] = ['legacy', 'full']

function find(entries: readonly HelpEntry[], label: string): HelpEntry {
	const entry = entries.find((e) => e.label === label)
	if (!entry) throw new Error(`no help entry "${label}"`)
	return entry
}

function allEntries(encoding: KeyboardEncoding): HelpEntry[] {
	return HELP_TABS.flatMap((tab) => helpEntries(tab.id, encoding))
}

describe('help', () => {
	it('has the five tabs in order', () => {
		expect(HELP_TABS.map((t) => t.label)).toEqual(['Tools', 'Edit', 'View', 'File', 'Mouse'])
	})

	it('formats chords the way parseChord reads them', () => {
		for (const { chord } of SHORTCUT_BINDINGS) {
			expect(parseChord(formatChord(chord)), formatChord(chord)).toEqual(chord)
		}
		expect(formatChord(parseChord('ctrl+shift+z'))).toBe('ctrl+shift+z')
		expect(formatChord(parseChord('alt+shift+h'))).toBe('alt+shift+h')
		expect(formatChord(parseChord('shift+1'))).toBe('shift+1')
		expect(formatChord(parseChord('shift+d'))).toBe('shift+d')
		expect(formatChord(parseChord('shift+.'))).toBe('shift+.')
		expect(formatChord(parseChord('+'))).toBe('+')
		expect(formatChord(parseChord('?'))).toBe('?')
		expect(formatChord(parseChord('"'))).toBe('"')
		expect(formatChord(parseChord('ctrl+/'))).toBe('ctrl+/')
		expect(formatChord(parseChord('ctrl+space'))).toBe('ctrl+space')
		expect(formatChord(parseChord('shift+F10'))).toBe('shift+F10')
		expect(formatChord(parseChord('alt+left'))).toBe('alt+left')
		expect(formatChord(parseChord('pgdn'))).toBe('pgdn')
		expect(formatChord(parseChord('del'))).toBe('del')
	})

	it('lists every binding of an action, in binding order', () => {
		expect(actionShortcuts('tool.draw', 'legacy')).toEqual(['d', 'b', 'x'])
		expect(actionShortcuts('edit.delete', 'legacy')).toEqual(['del', 'backspace'])
		expect(actionShortcuts('view.zoom-in', 'legacy')).toEqual(['=', '+', 'ctrl+='])
		expect(actionShortcuts('view.zoom-out', 'legacy')).toEqual(['-', '_'])
		expect(actionShortcuts('ui.help', 'legacy')).toEqual(['?', 'F1'])
		expect(actionShortcuts('ui.style-panel', 'legacy')).toEqual(['s', 'F3'])
		expect(actionShortcuts('ui.context-menu', 'legacy')).toEqual(['F10', 'shift+F10'])
		expect(actionShortcuts('view.toggle-pointer-mode', 'legacy')).toEqual(['F8', 'ctrl+space'])
		expect(actionShortcuts('page.prev', 'legacy')).toEqual(['pgup', 'alt+left', 'alt+up'])
		expect(actionShortcuts('edit.toggle-group', 'legacy')).toEqual(['ctrl+g'])
		expect(actionShortcuts('ui.geo-picker', 'legacy')).toEqual(['g'])
		// Routed by the input controller, not the table.
		expect(actionShortcuts('edit.edit-text', 'legacy')).toEqual([])
		expect(actionShortcuts('edit.select-none', 'legacy')).toEqual([])
		expect(actionShortcuts('tool.geo', 'legacy')).toEqual([])
	})

	it('replaces the legacy stand-in with the tldraw chord under full keys, like the menus', () => {
		expect(actionShortcuts('edit.redo', 'legacy')).toEqual(['ctrl+y'])
		expect(actionShortcuts('edit.redo', 'full')).toEqual(['ctrl+shift+z'])
		expect(actionShortcuts('page.prev', 'full')).toEqual(['alt+left', 'alt+up'])
		expect(actionShortcuts('arrange.send-backward', 'legacy')).toEqual(['{'])
		expect(actionShortcuts('arrange.send-backward', 'full')).toEqual(['alt+['])
		expect(actionShortcuts('file.save-as', 'legacy')).toEqual([])
		expect(actionShortcuts('file.save-as', 'full')).toEqual(['ctrl+shift+s'])
		expect(actionShortcuts('edit.ungroup', 'legacy')).toEqual([])
		expect(actionShortcuts('edit.ungroup', 'full')).toEqual(['ctrl+shift+g'])
		// Legacy-only shortcuts are unchanged with full keys.
		expect(actionShortcuts('edit.undo', 'full')).toEqual(['ctrl+z'])
		expect(actionShortcuts('tool.draw', 'full')).toEqual(['d', 'b', 'x'])
	})

	it('shows only shortcuts the keymap binds to that action', () => {
		for (const encoding of ENCODINGS) {
			for (const id of ACTION_IDS) {
				const bound = bindingsForAction(id, encoding)
				for (const shown of actionShortcuts(id, encoding)) {
					expect(bound, `${id} ${shown} (${encoding})`).toContainEqual(parseChord(shown))
				}
			}
			for (const entry of allEntries(encoding)) {
				if (!entry.action || entry.kbd === 'menu') continue
				const bound = bindingsForAction(entry.action, encoding)
				if (bound.length === 0) {
					// Controller-routed keys: Enter edits, Escape cancels.
					expect(['enter', 'esc'], entry.label).toContain(entry.kbd)
					continue
				}
				for (const shown of entry.kbd.split(', ')) {
					expect(bound, `${entry.action} ${shown} (${encoding})`).toContainEqual(parseChord(shown))
				}
			}
		}
	})

	it('covers every action that has a shortcut', () => {
		const shown = new Set<ActionId>()
		for (const encoding of ENCODINGS) {
			for (const entry of allEntries(encoding)) if (entry.action) shown.add(entry.action)
		}
		for (const id of ACTION_IDS) {
			const hasBinding = ENCODINGS.some((encoding) => bindingsForAction(id, encoding).length > 0)
			if (hasBinding) expect(shown.has(id), id).toBe(true)
		}
	})

	it('lists tool shortcuts from the keymap with headings', () => {
		const entries = helpEntries('tools', 'legacy')
		expect(entries[0]).toEqual({ label: 'Tools', kbd: '', heading: true })
		expect(find(entries, 'Select')).toEqual({ label: 'Select', kbd: 'v', action: 'tool.select' })
		expect(find(entries, 'Highlighter').kbd).toBe('shift+d')
		expect(find(entries, 'Draw').kbd).toBe('d, b, x')
		expect(find(entries, 'Shape picker (again: next shape)').kbd).toBe('g')
		expect(find(entries, ACTION_META['modifier.toggle-shift'].label).kbd).toBe('F5')
		expect(find(entries, 'Keyboard pointer mode').kbd).toBe('F8, ctrl+space')
		expect(find(entries, 'Press or release the button').kbd).toBe('space')
		expect(find(entries, 'Jump to the next or previous shape').kbd).toBe('tab, shift+tab')
	})

	it('lists the controller-routed keys and text editing', () => {
		const legacy = helpEntries('edit', 'legacy')
		const full = helpEntries('edit', 'full')
		expect(find(legacy, 'Deselect, or cancel the current action').kbd).toBe('esc')
		expect(find(legacy, 'Edit text').kbd).toBe('enter')
		expect(find(legacy, 'Group or ungroup').kbd).toBe('ctrl+g')
		expect(legacy.some((e) => e.label === 'Ungroup')).toBe(false)
		expect(find(full, 'Ungroup').kbd).toBe('ctrl+shift+g')
		expect(find(legacy, 'Delete').kbd).toBe('del, backspace')
		expect(find(legacy, 'Finish editing').kbd).toBe('esc, alt+enter')
		expect(find(full, 'Finish editing').kbd).toBe('esc, alt+enter, ctrl+enter')
		expect(find(legacy, 'Unlock all').kbd).toBe('menu')
		expect(
			find(helpEntries('file', 'legacy'), 'Quit when nothing is selected (press twice)').kbd
		).toBe('ctrl+c')
	})

	it('switches shortcuts with the keyboard encoding and marks menu-only actions', () => {
		const legacy = helpEntries('edit', 'legacy')
		const full = helpEntries('edit', 'full')
		expect(find(legacy, 'Redo').kbd).toBe('ctrl+y')
		expect(find(full, 'Redo').kbd).toBe('ctrl+shift+z')
		expect(find(legacy, 'Send backward').kbd).toBe('{')
		expect(find(full, 'Send backward').kbd).toBe('alt+[')
		expect(find(helpEntries('file', 'legacy'), 'Save as…').kbd).toBe('menu')
		expect(find(helpEntries('file', 'full'), 'Save as…').kbd).toBe('ctrl+shift+s')
		expect(find(helpEntries('view', 'legacy'), 'Previous page').kbd).toBe('pgup, alt+left, alt+up')
		expect(find(helpEntries('view', 'legacy'), 'Debug info').kbd).toBe('menu')
		expect(encodingLabel('legacy')).toBe('legacy keys')
		expect(encodingLabel('full')).toBe('full keys')
	})

	it('describes the mouse without shortcuts', () => {
		const mouse = helpEntries('mouse', 'legacy')
		expect(mouse.some((e) => e.kbd === 'right click')).toBe(true)
		expect(mouse.some((e) => e.kbd === 'ctrl+wheel, alt+wheel')).toBe(true)
		expect(mouse.some((e) => e.label.includes('diagonally outside a corner'))).toBe(true)
		expect(mouse.every((e) => e.heading || e.kbd.length > 0)).toBe(true)
		expect(mouse.every((e) => e.action === undefined)).toBe(true)
	})

	it('keeps every line within the help box', () => {
		for (const encoding of ENCODINGS) {
			for (const entry of allEntries(encoding)) {
				// 76-column box, 2 cells of padding each side, one space before the shortcut.
				expect(entry.label.length + entry.kbd.length + 1, entry.label).toBeLessThanOrEqual(72)
			}
		}
	})

	it('adds tmux and macOS hints from the environment', () => {
		expect(terminalHints({})).toEqual([])
		expect(terminalHints({ TMUX: '/tmp/tmux-1000/default,1,0' })).toEqual([
			'tmux: run "set -s escape-time 10" so esc is not delayed',
		])
		expect(terminalHints({ TERM_PROGRAM: 'Apple_Terminal' })[0]).toContain('Option as Meta')
		expect(terminalHints({ TERM_PROGRAM: 'iTerm.app' })).toHaveLength(1)
		expect(terminalHints({ TERM_PROGRAM: 'WezTerm' })).toEqual([])
		expect(terminalHints({ TMUX: '1', TERM_PROGRAM: 'iTerm.app' })).toHaveLength(2)
	})
})
