import { createShapeId } from 'tldraw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ACTION_META, type ActionId } from '../actions/actionIds'
import { matchShortcut, parseChord } from '../input/keymap'
import { codeForKey, type KeyEvent } from '../terminal/InputParser'
import { createTestContext, type TestContext } from '../test/testContext'
import {
	MENU_IDS,
	MENUS,
	actionKbd,
	contextMenuItems,
	isMenuItemEnabled,
	menuItemKbd,
	menuItemLabel,
	menuItems,
	pageItems,
	type MenuItem,
} from './menus'

function labels(items: readonly MenuItem[]): string[] {
	return items.filter((i) => !i.separator).map(menuItemLabel)
}

describe('menus', () => {
	let ctx: TestContext
	beforeEach(() => {
		ctx = createTestContext()
	})
	afterEach(() => ctx.dispose())

	it('defines the five menubar menus with the expected items', () => {
		expect(MENU_IDS).toEqual(['file', 'edit', 'view', 'pages', 'help'])
		expect(labels(MENUS.file)).toEqual([
			'New',
			'Open…',
			'Save',
			'Save as…',
			'Export as text…',
			'Quit',
		])
		expect(labels(MENUS.edit)).toContain('Arrange')
		expect(labels(MENUS.view)).toEqual([
			'Zoom in',
			'Zoom out',
			'Zoom to fit',
			'Zoom to selection',
			'Zoom to 100%',
			'Grid',
			'Snap mode',
			'Tool lock',
			'Dark mode',
			'Keyboard pointer mode',
			'Style panel',
			'Debug info',
		])
		expect(labels(MENUS.help)).toEqual(['Keyboard shortcuts', 'About'])
		const arrange = MENUS.edit.find((i) => i.label === 'Arrange')!.submenu!
		expect(labels(arrange)).toEqual([
			'Align left',
			'Align center horizontally',
			'Align right',
			'Align top',
			'Align center vertically',
			'Align bottom',
			'Distribute horizontally',
			'Distribute vertically',
			'Stretch horizontally',
			'Stretch vertically',
			'Pack',
			'Stack horizontally',
			'Stack vertically',
			'Flip horizontally',
			'Flip vertically',
			'Rotate clockwise',
			'Rotate counterclockwise',
			'Bring to front',
			'Bring forward',
			'Send backward',
			'Send to back',
		])
	})

	it('every action in every menu exists in ACTION_META', () => {
		const walk = (items: readonly MenuItem[]) => {
			for (const item of items) {
				if (item.action) expect(ACTION_META[item.action.id]).toBeDefined()
				if (item.submenu) walk(item.submenu)
			}
		}
		for (const id of MENU_IDS) walk(MENUS[id])
		walk(contextMenuItems(ctx.editor))
	})

	it('lists the pages at the top of the pages menu', () => {
		ctx.editor.createPage({ name: 'Second' })
		const items = menuItems('pages', ctx.editor)
		expect(labels(items).slice(0, 2)).toEqual(['Page 1', 'Second'])
		expect(items[2].separator).toBe(true)
		const pages = pageItems(ctx.editor)
		expect(pages[0].action).toEqual({ id: 'page.switch', arg: ctx.editor.getPages()[0].id })
		expect(pages[0].checked!(ctx.editor, ctx.ui, 100)).toBe(true)
		expect(pages[1].checked!(ctx.editor, ctx.ui, 100)).toBe(false)
	})

	it('enables items by selection and history', () => {
		const find = (label: string) => MENUS.edit.find((i) => menuItemLabel(i) === label)!
		expect(isMenuItemEnabled(find('Undo'), ctx.editor)).toBe(false)
		expect(isMenuItemEnabled(find('Cut'), ctx.editor)).toBe(false)
		expect(isMenuItemEnabled(find('Paste'), ctx.editor)).toBe(true)
		expect(isMenuItemEnabled(find('Group'), ctx.editor)).toBe(false)
		expect(isMenuItemEnabled(find('Ungroup'), ctx.editor)).toBe(false)
		expect(isMenuItemEnabled({ separator: true }, ctx.editor)).toBe(false)

		const a = createShapeId()
		const b = createShapeId()
		ctx.editor.markHistoryStoppingPoint('create')
		ctx.editor.createShapes([
			{ id: a, type: 'geo', x: 0, y: 0 },
			{ id: b, type: 'geo', x: 300, y: 0 },
		])
		ctx.editor.select(a, b)
		expect(isMenuItemEnabled(find('Undo'), ctx.editor)).toBe(true)
		expect(isMenuItemEnabled(find('Cut'), ctx.editor)).toBe(true)
		expect(isMenuItemEnabled(find('Group'), ctx.editor)).toBe(true)
		expect(isMenuItemEnabled(find('Edit text'), ctx.editor)).toBe(false)
		ctx.editor.groupShapes([a, b])
		expect(isMenuItemEnabled(find('Ungroup'), ctx.editor)).toBe(true)
		ctx.editor.select(a)
		expect(isMenuItemEnabled(find('Edit text'), ctx.editor)).toBe(true)
	})

	it('checks the view toggles from the editor and the UI state', () => {
		const find = (label: string) => MENUS.view.find((i) => menuItemLabel(i) === label)!
		expect(find('Grid').checked!(ctx.editor, ctx.ui, 100)).toBe(false)
		ctx.editor.updateInstanceState({ isGridMode: true })
		expect(find('Grid').checked!(ctx.editor, ctx.ui, 100)).toBe(true)
		expect(find('Tool lock').checked!(ctx.editor, ctx.ui, 100)).toBe(false)
		ctx.editor.updateInstanceState({ isToolLocked: true })
		expect(find('Tool lock').checked!(ctx.editor, ctx.ui, 100)).toBe(true)
		// The style panel is checked only while the docked panel is actually on screen.
		expect(find('Style panel').action).toEqual({ id: 'ui.style-panel' })
		expect(find('Style panel').checked!(ctx.editor, ctx.ui, 120)).toBe(false)
		const id = createShapeId()
		ctx.editor.createShape({ id, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } })
		ctx.editor.select(id)
		expect(find('Style panel').checked!(ctx.editor, ctx.ui, 120)).toBe(true)
		expect(find('Style panel').checked!(ctx.editor, ctx.ui, 100)).toBe(false)
		ctx.ui.stylePanelOpen.set(false)
		expect(find('Style panel').checked!(ctx.editor, ctx.ui, 120)).toBe(false)
		expect(find('Dark mode').checked!(ctx.editor, ctx.ui, 100)).toBe(false)
		ctx.editor.setColorMode('dark')
		expect(find('Dark mode').checked!(ctx.editor, ctx.ui, 100)).toBe(true)
	})

	it('builds the context menu for a selection and for none', () => {
		expect(labels(contextMenuItems(ctx.editor))).toEqual(['Paste', 'Select all'])
		const id = createShapeId()
		ctx.editor.createShape({ id, type: 'geo', x: 0, y: 0 })
		ctx.editor.select(id)
		expect(labels(contextMenuItems(ctx.editor))).toEqual([
			'Cut',
			'Copy',
			'Paste',
			'Duplicate',
			'Delete',
			'Edit text',
			'Group',
			'Lock or unlock',
			'Bring to front',
			'Send to back',
			'Select all',
		])
		ctx.editor.toggleLock([id])
		ctx.editor.selectNone()
		expect(labels(contextMenuItems(ctx.editor))).toEqual(['Paste', 'Select all', 'Unlock all'])
	})

	it('shows legacy shortcuts, or the tldraw chord with the full encoding', () => {
		expect(actionKbd('edit.redo', 'legacy')).toBe('ctrl+y')
		expect(actionKbd('edit.redo', 'full')).toBe('ctrl+shift+z')
		expect(actionKbd('file.save-as', 'legacy')).toBeUndefined()
		expect(actionKbd('file.save-as', 'full')).toBe('ctrl+shift+s')
		expect(actionKbd('file.save', 'full')).toBe('ctrl+s')
		const redo = MENUS.edit.find((i) => menuItemLabel(i) === 'Redo')!
		expect(menuItemKbd(redo, 'legacy')).toBe('ctrl+y')
		// Items with an argument (page switches) never show a shortcut.
		expect(menuItemKbd({ action: { id: 'page.switch', arg: 'page:x' } }, 'legacy')).toBeUndefined()
		expect(menuItemKbd({ label: 'Arrange', submenu: [] }, 'legacy')).toBeUndefined()
	})

	it('shows only shortcuts the keymap binds to the item, or routes to it', () => {
		// Keys the input controller routes itself (keymap.ts PRIMARY_EXCLUDED): ctrl+g groups or
		// ungroups, Enter is forwarded to the select tool, `s` opens the style panel either way.
		const routed: Partial<Record<ActionId, ActionId | null>> = {
			'edit.group': 'edit.toggle-group',
			'edit.ungroup': 'edit.toggle-group',
			'edit.edit-text': null,
			'view.toggle-style-panel': 'ui.style-panel',
		}
		const check = (items: readonly MenuItem[], encoding: 'legacy' | 'full') => {
			for (const entry of items) {
				if (entry.submenu) check(entry.submenu, encoding)
				const kbd = menuItemKbd(entry, encoding)
				if (!entry.action || kbd === undefined) continue
				const chord = parseChord(kbd)
				const event: KeyEvent = {
					type: 'key',
					key: chord.key,
					code: codeForKey(chord.key),
					shift: chord.shift,
					ctrl: chord.ctrl,
					alt: chord.alt,
					meta: false,
				}
				const id = entry.action.id
				const allowed: Array<ActionId | null> = [id]
				if (id in routed) allowed.push(routed[id] ?? null)
				const match = matchShortcut(event, encoding)
				expect(allowed, `${id}: ${kbd} (${encoding})`).toContain(match ? match.id : null)
			}
		}
		const id = createShapeId()
		ctx.editor.createShape({ id, type: 'geo', x: 0, y: 0 })
		ctx.editor.select(id)
		for (const encoding of ['legacy', 'full'] as const) {
			for (const menu of MENU_IDS) check(menuItems(menu, ctx.editor), encoding)
			check(contextMenuItems(ctx.editor), encoding)
		}
	})
})
