import { describe, expect, it, vi } from 'vitest'
import {
	CommandPaletteRow,
	getCommandPaletteBrowseRows,
	getCommandPaletteSearchRows,
	getCommandPaletteSubmenuRows,
} from './commandPaletteRows'
import { CommandPaletteEntry } from './CommandPaletteStore'

function entry(id: string, overrides: Partial<CommandPaletteEntry> = {}): CommandPaletteEntry {
	return {
		id,
		label: id,
		name: id,
		path: [],
		submenu: null,
		section: null,
		heading: null,
		disabled: false,
		onSelect: vi.fn(),
		marker: null,
		...overrides,
	}
}

const describeRows = (rows: CommandPaletteRow[]) =>
	rows.map((row) =>
		row.type === 'heading'
			? `# ${row.label}`
			: row.type === 'separator'
				? '---'
				: row.type === 'submenu'
					? `> ${row.submenu.label}`
					: `${row.recent ? 'recent ' : ''}${row.label}`
	)

const grouped = { showRecents: true, groupSubmenus: true }
const flat = { showRecents: true, groupSubmenus: false }

const moveTo = { key: 'Pages/move-to-page', label: 'Move to page' }
const theme = { key: 'View/theme', label: 'Theme' }
const submenuEntries = [
	...['Page 1', 'Page 2'].map((name) =>
		entry(`move-${name}`, { label: `Move to page: ${name}`, name, submenu: moveTo })
	),
	entry('dark', { label: 'Theme: Dark', name: 'Dark', submenu: theme }),
	entry('grid', { label: 'Show grid' }),
]

describe('getCommandPaletteBrowseRows', () => {
	it('lists enabled entries in order without group headings, hiding disabled ones', () => {
		const rows = getCommandPaletteBrowseRows(
			[
				entry('undo', { path: ['Edit'] }),
				entry('redo', { path: ['Edit'], disabled: true }),
				entry('grid', { path: ['View'] }),
				entry('loose'),
			],
			[],
			'Recent',
			grouped
		)
		expect(describeRows(rows)).toEqual(['undo', 'grid', 'loose'])
	})

	it('shows recents first and only there, skipping ids that are disabled or gone', () => {
		const rows = getCommandPaletteBrowseRows(
			[entry('undo'), entry('redo', { disabled: true }), entry('grid')],
			['gone', 'redo', 'undo'],
			'Recent',
			grouped
		)
		expect(describeRows(rows)).toEqual(['# Recent', 'recent undo', '---', 'grid'])
	})

	it('drops the separator when every entry is recent', () => {
		const rows = getCommandPaletteBrowseRows([entry('undo')], ['undo'], 'Recent', grouped)
		expect(describeRows(rows)).toEqual(['# Recent', 'recent undo'])
	})

	it('lists pinned entries first, above recents and never among them', () => {
		const rows = getCommandPaletteBrowseRows(
			[entry('undo'), entry('flag', { pinned: true }), entry('grid')],
			['flag', 'grid'],
			'Recent',
			grouped
		)
		expect(describeRows(rows)).toEqual(['flag', '---', '# Recent', 'recent grid', '---', 'undo'])
	})

	it('heads each labelled group when headings are on, separating unlabelled ones', () => {
		const rows = getCommandPaletteBrowseRows(
			[
				entry('undo', { heading: 'Edit' }),
				entry('redo', { heading: 'Edit' }),
				entry('grid', { heading: 'View' }),
				entry('custom'),
			],
			[],
			'Recent',
			{ ...grouped, showGroupHeadings: true }
		)
		expect(describeRows(rows)).toEqual([
			'# Edit',
			'undo',
			'redo',
			'# View',
			'grid',
			'---',
			'custom',
		])
	})

	it('lists at most 5 top commands', () => {
		const ids = ['a', 'b', 'c', 'd', 'e', 'f']
		const rows = getCommandPaletteBrowseRows(
			ids.map((id) => entry(id)),
			ids,
			'Suggested',
			grouped
		)
		expect(describeRows(rows).slice(0, 7)).toEqual([
			'# Suggested',
			'recent a',
			'recent b',
			'recent c',
			'recent d',
			'recent e',
			'---',
		])
	})

	it('hides recents when they are turned off', () => {
		const rows = getCommandPaletteBrowseRows([entry('undo')], ['undo'], 'Recent', {
			...grouped,
			showRecents: false,
		})
		expect(describeRows(rows)).toEqual(['undo'])
	})

	it('collapses submenus with more than one item into a row when grouped', () => {
		const rows = getCommandPaletteBrowseRows(submenuEntries, [], 'Recent', grouped)
		expect(describeRows(rows)).toEqual(['> Move to page', 'Theme: Dark', 'Show grid'])
	})

	it('lists every submenu item when flat', () => {
		const rows = getCommandPaletteBrowseRows(submenuEntries, [], 'Recent', flat)
		expect(describeRows(rows)).toEqual([
			'Move to page: Page 1',
			'Move to page: Page 2',
			'Theme: Dark',
			'Show grid',
		])
	})
})

describe('getCommandPaletteSearchRows', () => {
	it('ranks matches, including disabled ones that can say why', () => {
		const rows = getCommandPaletteSearchRows(
			[
				entry('realign', { label: 'Realign', path: ['Arrange'] }),
				entry('align', { label: 'Align', path: ['Arrange'], disabled: true, disabledReason: 'x' }),
				entry('unalign', { label: 'Unalign', path: ['Arrange'], disabled: true }),
				entry('zoom', { label: 'Zoom in' }),
			],
			'align',
			[],
			{ groupSubmenus: true }
		)
		expect(rows.map((row) => row.type === 'item' && row.entry.id)).toEqual(['realign', 'align'])
	})

	it('folds items matched only by their submenu name into the submenu row when grouped', () => {
		const rows = getCommandPaletteSearchRows(submenuEntries, 'move', [], { groupSubmenus: true })
		expect(describeRows(rows)).toEqual(['> Move to page'])
	})

	it('keeps items matched by their own name when grouped', () => {
		const rows = getCommandPaletteSearchRows(submenuEntries, 'page 2', [], {
			groupSubmenus: true,
		})
		expect(describeRows(rows)).toEqual(['Move to page: Page 2'])
	})

	it('keeps items when the query spans the submenu and the item name', () => {
		const rows = getCommandPaletteSearchRows(submenuEntries, 'move to page 1', [], {
			groupSubmenus: true,
		})
		expect(describeRows(rows)).toEqual(['Move to page: Page 1'])
	})

	it('folds items matched only through their path when grouped', () => {
		const rows = getCommandPaletteSearchRows(
			[...submenuEntries, entry('flip', { path: ['Pages'], label: 'Flip' })].map((e) =>
				e.submenu === moveTo ? { ...e, path: ['Pages', 'Move to page'] } : e
			),
			'pages',
			[],
			{ groupSubmenus: true }
		)
		expect(describeRows(rows)).toEqual(['> Move to page', 'Flip'])
	})

	it('lists every match when flat', () => {
		const rows = getCommandPaletteSearchRows(submenuEntries, 'move', [], { groupSubmenus: false })
		expect(describeRows(rows)).toEqual(['Move to page: Page 1', 'Move to page: Page 2'])
	})
})

describe('getCommandPaletteSubmenuRows', () => {
	it("lists the submenu's enabled items by their own names", () => {
		const rows = getCommandPaletteSubmenuRows(
			[...submenuEntries, entry('move-new', { name: 'New page', submenu: moveTo, disabled: true })],
			moveTo.key,
			'',
			[]
		)
		expect(describeRows(rows)).toEqual(['Page 1', 'Page 2'])
	})

	it('separates the menu groups inside the submenu', () => {
		const rows = getCommandPaletteSubmenuRows(
			[
				...submenuEntries.map((e) => (e.submenu === moveTo ? { ...e, section: '/pages' } : e)),
				entry('move-new', { name: 'New page', submenu: moveTo, section: '/new-page' }),
			],
			moveTo.key,
			'',
			[]
		)
		expect(describeRows(rows)).toEqual(['Page 1', 'Page 2', '---', 'New page'])
	})

	it('matches by name, not the submenu prefix', () => {
		expect(describeRows(getCommandPaletteSubmenuRows(submenuEntries, moveTo.key, '2', []))).toEqual(
			['Page 2']
		)
		expect(getCommandPaletteSubmenuRows(submenuEntries, moveTo.key, 'move', [])).toEqual([])
	})
})
