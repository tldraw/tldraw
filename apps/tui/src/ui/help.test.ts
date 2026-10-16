import { describe, expect, it } from 'vitest'
import { ACTION_META } from '../actions/actionIds'
import { HELP_TABS, encodingLabel, helpEntries, terminalHints } from './help'

describe('help', () => {
	it('has the five tabs in order', () => {
		expect(HELP_TABS.map((t) => t.label)).toEqual(['Tools', 'Edit', 'View', 'File', 'Mouse'])
	})

	it('lists tool shortcuts from ACTION_META with headings', () => {
		const entries = helpEntries('tools', 'legacy')
		expect(entries[0]).toEqual({ label: 'Tools', kbd: '', heading: true })
		expect(entries).toContainEqual({ label: 'Select', kbd: 'v' })
		expect(entries).toContainEqual({ label: 'Highlighter', kbd: 'shift+d' })
		expect(entries).toContainEqual({ label: 'Draw', kbd: 'd, b, x' })
		expect(entries).toContainEqual({ label: ACTION_META['modifier.toggle-shift'].label, kbd: 'F5' })
	})

	it('switches shortcuts with the keyboard encoding and marks menu-only actions', () => {
		const legacy = helpEntries('edit', 'legacy')
		const full = helpEntries('edit', 'full')
		expect(legacy).toContainEqual({ label: 'Redo', kbd: 'ctrl+y' })
		expect(full).toContainEqual({ label: 'Redo', kbd: 'ctrl+shift+z' })
		expect(legacy).toContainEqual({ label: 'Send backward', kbd: '{' })
		expect(full).toContainEqual({ label: 'Send backward', kbd: 'alt+[' })
		expect(helpEntries('file', 'legacy')).toContainEqual({ label: 'Save as…', kbd: 'menu' })
		expect(helpEntries('file', 'full')).toContainEqual({ label: 'Save as…', kbd: 'ctrl+shift+s' })
		expect(encodingLabel('legacy')).toBe('legacy keys')
		expect(encodingLabel('full')).toBe('full keys')
	})

	it('describes the mouse without shortcuts', () => {
		const mouse = helpEntries('mouse', 'legacy')
		expect(mouse.some((e) => e.kbd === 'right click')).toBe(true)
		expect(mouse.every((e) => e.heading || e.kbd.length > 0)).toBe(true)
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
