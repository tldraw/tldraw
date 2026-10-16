import { describe, expect, it } from 'vitest'
import { ACTION_IDS, ACTION_META } from '../actions/actionIds'
import { codeForKey, type KeyEvent } from '../terminal/InputParser'
import {
	SHORTCUT_BINDINGS,
	bindingsForAction,
	canonicalKey,
	chordFromEvent,
	matchShortcut,
	parseChord,
} from './keymap'

function key(k: string, opts: Partial<Omit<KeyEvent, 'type' | 'key'>> = {}): KeyEvent {
	return {
		type: 'key',
		key: k,
		code: codeForKey(k),
		shift: false,
		ctrl: false,
		alt: false,
		meta: false,
		...opts,
	}
}

describe('parseChord', () => {
	it('parses modifiers and named keys', () => {
		expect(parseChord('ctrl+shift+z')).toEqual({ key: 'z', shift: true, ctrl: true, alt: false })
		expect(parseChord('alt+left')).toEqual({
			key: 'ArrowLeft',
			shift: false,
			ctrl: false,
			alt: true,
		})
		expect(parseChord('del')).toEqual({ key: 'Delete', shift: false, ctrl: false, alt: false })
		expect(parseChord('pgup')).toEqual({ key: 'PageUp', shift: false, ctrl: false, alt: false })
		expect(parseChord('F5')).toEqual({ key: 'F5', shift: false, ctrl: false, alt: false })
		expect(parseChord('ctrl+space')).toEqual({ key: ' ', shift: false, ctrl: true, alt: false })
	})

	it('folds shifted characters onto their base key', () => {
		expect(parseChord('shift+d')).toEqual(parseChord('D'))
		expect(parseChord('"')).toEqual({ key: "'", shift: true, ctrl: false, alt: false })
		expect(parseChord('?')).toEqual({ key: '/', shift: true, ctrl: false, alt: false })
		expect(parseChord('}')).toEqual({ key: ']', shift: true, ctrl: false, alt: false })
		expect(parseChord('shift+.')).toEqual({ key: '.', shift: true, ctrl: false, alt: false })
		expect(parseChord('+')).toEqual({ key: '=', shift: true, ctrl: false, alt: false })
		expect(parseChord('ctrl++')).toEqual({ key: '=', shift: true, ctrl: true, alt: false })
		expect(parseChord('shift+1')).toEqual(parseChord('!'))
	})

	it('canonicalKey leaves named keys alone', () => {
		expect(canonicalKey('Escape')).toEqual({ key: 'Escape', shift: false })
		expect(canonicalKey('f2')).toEqual({ key: 'F2', shift: false })
		expect(canonicalKey('a')).toEqual({ key: 'a', shift: false })
	})
})

describe('chordFromEvent', () => {
	it('derives shift from the character and keeps event modifiers', () => {
		expect(chordFromEvent(key('D', { shift: true }))).toEqual(parseChord('shift+d'))
		expect(chordFromEvent(key('!', { shift: true }))).toEqual(parseChord('shift+1'))
		expect(chordFromEvent(key('z', { ctrl: true }))).toEqual(parseChord('ctrl+z'))
		expect(chordFromEvent(key('z', { ctrl: true, shift: true }))).toEqual(
			parseChord('ctrl+shift+z')
		)
	})
})

describe('matchShortcut', () => {
	it('maps the legacy-safe table', () => {
		expect(matchShortcut(key('v'), 'legacy')).toEqual({ id: 'tool.select' })
		expect(matchShortcut(key('h'), 'legacy')).toEqual({ id: 'tool.hand' })
		expect(matchShortcut(key('d'), 'legacy')).toEqual({ id: 'tool.draw' })
		expect(matchShortcut(key('b'), 'legacy')).toEqual({ id: 'tool.draw' })
		expect(matchShortcut(key('r'), 'legacy')).toEqual({ id: 'tool.rectangle' })
		expect(matchShortcut(key('o'), 'legacy')).toEqual({ id: 'tool.ellipse' })
		expect(matchShortcut(key('D', { shift: true }), 'legacy')).toEqual({ id: 'tool.highlight' })
		expect(matchShortcut(key('z', { ctrl: true }), 'legacy')).toEqual({ id: 'edit.undo' })
		expect(matchShortcut(key('y', { ctrl: true }), 'legacy')).toEqual({ id: 'edit.redo' })
		expect(matchShortcut(key('Delete'), 'legacy')).toEqual({ id: 'edit.delete' })
		expect(matchShortcut(key('Backspace'), 'legacy')).toEqual({ id: 'edit.delete' })
		expect(matchShortcut(key('a', { ctrl: true }), 'legacy')).toEqual({ id: 'edit.select-all' })
		expect(matchShortcut(key('g', { ctrl: true }), 'legacy')).toEqual({ id: 'edit.toggle-group' })
		expect(matchShortcut(key('c', { ctrl: true }), 'legacy')).toEqual({ id: 'edit.copy' })
		expect(matchShortcut(key('='), 'legacy')).toEqual({ id: 'view.zoom-in' })
		expect(matchShortcut(key('+', { shift: true }), 'legacy')).toEqual({ id: 'view.zoom-in' })
		expect(matchShortcut(key('-'), 'legacy')).toEqual({ id: 'view.zoom-out' })
		expect(matchShortcut(key('_', { shift: true }), 'legacy')).toEqual({ id: 'view.zoom-out' })
		expect(matchShortcut(key(')', { shift: true }), 'legacy')).toEqual({ id: 'view.zoom-to-100' })
		expect(matchShortcut(key('!', { shift: true }), 'legacy')).toEqual({ id: 'view.zoom-to-fit' })
		expect(matchShortcut(key('@', { shift: true }), 'legacy')).toEqual({
			id: 'view.zoom-to-selection',
		})
		expect(matchShortcut(key("'"), 'legacy')).toEqual({ id: 'view.toggle-grid' })
		expect(matchShortcut(key('"', { shift: true }), 'legacy')).toEqual({ id: 'view.toggle-snap' })
		expect(matchShortcut(key('/', { ctrl: true }), 'legacy')).toEqual({
			id: 'view.toggle-dark-mode',
		})
		expect(matchShortcut(key('F2'), 'legacy')).toEqual({ id: 'page.rename' })
		expect(matchShortcut(key('F3'), 'legacy')).toEqual({ id: 'ui.style-panel' })
		expect(matchShortcut(key('s'), 'legacy')).toEqual({ id: 'ui.style-panel' })
		expect(matchShortcut(key('F4'), 'legacy')).toEqual({ id: 'ui.pages' })
		expect(matchShortcut(key('F5'), 'legacy')).toEqual({ id: 'modifier.toggle-shift' })
		expect(matchShortcut(key('F6'), 'legacy')).toEqual({ id: 'modifier.toggle-alt' })
		expect(matchShortcut(key('F7'), 'legacy')).toEqual({ id: 'modifier.toggle-ctrl' })
		expect(matchShortcut(key('F8'), 'legacy')).toEqual({ id: 'view.toggle-pointer-mode' })
		expect(matchShortcut(key('F9'), 'legacy')).toEqual({ id: 'ui.menu' })
		expect(matchShortcut(key('m'), 'legacy')).toEqual({ id: 'ui.menu' })
		expect(matchShortcut(key('F10'), 'legacy')).toEqual({ id: 'ui.context-menu' })
		expect(matchShortcut(key('F10', { shift: true }), 'legacy')).toEqual({ id: 'ui.context-menu' })
		expect(matchShortcut(key('?', { shift: true }), 'legacy')).toEqual({ id: 'ui.help' })
		expect(matchShortcut(key('F1'), 'legacy')).toEqual({ id: 'ui.help' })
		expect(matchShortcut(key('PageUp'), 'legacy')).toEqual({ id: 'page.prev' })
		expect(matchShortcut(key('PageDown'), 'legacy')).toEqual({ id: 'page.next' })
		expect(matchShortcut(key('ArrowLeft', { alt: true }), 'legacy')).toEqual({ id: 'page.prev' })
		expect(matchShortcut(key(']'), 'legacy')).toEqual({ id: 'arrange.bring-to-front' })
		expect(matchShortcut(key('}', { shift: true }), 'legacy')).toEqual({
			id: 'arrange.bring-forward',
		})
		expect(matchShortcut(key('{', { shift: true }), 'legacy')).toEqual({
			id: 'arrange.send-backward',
		})
		expect(matchShortcut(key('['), 'legacy')).toEqual({ id: 'arrange.send-to-back' })
		expect(matchShortcut(key('H', { shift: true }), 'legacy')).toEqual({
			id: 'arrange.flip-horizontal',
		})
		expect(matchShortcut(key('V', { shift: true }), 'legacy')).toEqual({
			id: 'arrange.flip-vertical',
		})
		expect(matchShortcut(key('>', { shift: true }), 'legacy')).toEqual({ id: 'arrange.rotate-cw' })
		expect(matchShortcut(key('<', { shift: true }), 'legacy')).toEqual({ id: 'arrange.rotate-ccw' })
		expect(matchShortcut(key('L', { shift: true }), 'legacy')).toEqual({ id: 'edit.toggle-lock' })
		expect(matchShortcut(key('a', { alt: true }), 'legacy')).toEqual({ id: 'arrange.align-left' })
		expect(matchShortcut(key('H', { alt: true, shift: true }), 'legacy')).toEqual({
			id: 'arrange.distribute-horizontal',
		})
		expect(matchShortcut(key('s', { ctrl: true }), 'legacy')).toEqual({ id: 'file.save' })
		expect(matchShortcut(key('q', { ctrl: true }), 'legacy')).toEqual({ id: 'app.quit' })
		expect(matchShortcut(key('e', { ctrl: true }), 'legacy')).toEqual({ id: 'file.export-text' })
	})

	it('routes g to the geo picker and never binds Escape, Enter or Space', () => {
		expect(matchShortcut(key('g'), 'legacy')).toEqual({ id: 'ui.geo-picker' })
		expect(matchShortcut(key('Escape'), 'legacy')).toBeNull()
		expect(matchShortcut(key('Enter'), 'legacy')).toBeNull()
		expect(matchShortcut(key(' '), 'legacy')).toBeNull()
		expect(matchShortcut(key('ArrowUp'), 'legacy')).toBeNull()
		expect(matchShortcut(key('j'), 'legacy')).toBeNull()
	})

	it('enables the tldraw chords only with full keyboard encoding', () => {
		const redo = key('z', { ctrl: true, shift: true })
		expect(matchShortcut(redo, 'legacy')).toBeNull()
		expect(matchShortcut(redo, 'full')).toEqual({ id: 'edit.redo' })
		const ungroup = key('g', { ctrl: true, shift: true })
		expect(matchShortcut(ungroup, 'legacy')).toBeNull()
		expect(matchShortcut(ungroup, 'full')).toEqual({ id: 'edit.ungroup' })
		const sendBackward = key('[', { alt: true })
		expect(matchShortcut(sendBackward, 'legacy')).toBeNull()
		expect(matchShortcut(sendBackward, 'full')).toEqual({ id: 'arrange.send-backward' })
		expect(matchShortcut(key('S', { ctrl: true, shift: true }), 'full')).toEqual({
			id: 'file.save-as',
		})
		// The legacy-safe keys stay active with full encoding.
		expect(matchShortcut(key('y', { ctrl: true }), 'full')).toEqual({ id: 'edit.redo' })
		expect(matchShortcut(key('g', { ctrl: true }), 'full')).toEqual({ id: 'edit.toggle-group' })
	})

	it('ignores key releases and never binds ctrl+minus', () => {
		expect(matchShortcut(key('z', { ctrl: true, release: true }), 'legacy')).toBeNull()
		expect(matchShortcut(key('-', { ctrl: true }), 'legacy')).toBeNull()
		expect(matchShortcut(key('-', { ctrl: true }), 'full')).toBeNull()
	})

	it('gives every ACTION_META primary kbd an active binding unless it is routed specially', () => {
		const special = new Set([
			'edit.group',
			'edit.ungroup',
			'edit.select-none',
			'edit.edit-text',
			'tool.geo',
			'view.toggle-style-panel',
		])
		for (const id of ACTION_IDS) {
			const meta = ACTION_META[id]
			if (!meta.kbd || special.has(id)) continue
			expect(bindingsForAction(id, 'legacy'), id).toContainEqual(parseChord(meta.kbd))
		}
		expect(SHORTCUT_BINDINGS.length).toBeGreaterThan(60)
	})
})
