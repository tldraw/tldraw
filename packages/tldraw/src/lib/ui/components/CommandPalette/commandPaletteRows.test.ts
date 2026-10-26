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
	it('lists enabled entries in order, hiding disabled ones', () => {
		const rows = getCommandPaletteBrowseRows(
			[
				entry('undo', { path: ['Edit'] }),
				entry('redo', { path: ['Edit'], disabled: true, disabledReason: 'x' }),
				entry('grid', { path: ['View'] }),
				entry('loose'),
			],
			[],
			'Recent'
		)
		expect(describeRows(rows)).toEqual(['undo', 'grid', 'loose'])
	})

	it('shows recents first and only there, skipping ids that are disabled or gone', () => {
		const rows = getCommandPaletteBrowseRows(
			[entry('undo'), entry('redo', { disabled: true }), entry('grid')],
			['gone', 'redo', 'undo'],
			'Recent'
		)
		expect(describeRows(rows)).toEqual(['# Recent', 'recent undo', '---', 'grid'])
	})

	it('drops the separator when every entry is recent', () => {
		const rows = getCommandPaletteBrowseRows([entry('undo')], ['undo'], 'Recent')
		expect(describeRows(rows)).toEqual(['# Recent', 'recent undo'])
	})

	it('lists pinned entries first, above recents and never among them', () => {
		const rows = getCommandPaletteBrowseRows(
			[entry('undo'), entry('flag', { pinned: true }), entry('grid')],
			['flag', 'grid'],
			'Recent'
		)
		expect(describeRows(rows)).toEqual(['flag', '---', '# Recent', 'recent grid', '---', 'undo'])
	})

	it('heads each labelled group, separating unlabelled ones', () => {
		const rows = getCommandPaletteBrowseRows(
			[
				entry('undo', { heading: 'Edit' }),
				entry('redo', { heading: 'Edit' }),
				entry('grid', { heading: 'View' }),
				entry('custom'),
			],
			[],
			'Recent'
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

	it('lists at most 5 recent commands', () => {
		const ids = ['a', 'b', 'c', 'd', 'e', 'f']
		const rows = getCommandPaletteBrowseRows(
			ids.map((id) => entry(id)),
			ids,
			'Recent'
		)
		expect(describeRows(rows).slice(0, 7)).toEqual([
			'# Recent',
			'recent a',
			'recent b',
			'recent c',
			'recent d',
			'recent e',
			'---',
		])
	})

	it('leaves out the heading when only one group is listed', () => {
		const rows = getCommandPaletteBrowseRows(
			[entry('undo', { heading: 'Edit' }), entry('redo', { heading: 'Edit' })],
			[],
			'Recent'
		)
		expect(describeRows(rows)).toEqual(['undo', 'redo'])
	})

	it('collapses submenus with more than one item into a row', () => {
		const rows = getCommandPaletteBrowseRows(submenuEntries, [], 'Recent')
		expect(describeRows(rows)).toEqual(['> Move to page', 'Theme: Dark', 'Show grid'])
	})

	it('keeps a collapsed submenu as one row, even with one item', () => {
		const news = { key: 'news', label: 'Notifications', collapsed: true }
		const rows = getCommandPaletteBrowseRows(
			[entry('n1', { label: 'Notifications: Alice: hi', name: 'Alice: hi', submenu: news })],
			[],
			'Recent'
		)
		expect(describeRows(rows)).toEqual(['> Notifications'])
		const search = getCommandPaletteSearchRows(
			[entry('n1', { label: 'Notifications: Alice: hi', name: 'Alice: hi', submenu: news })],
			'alice',
			[]
		)
		expect(describeRows(search)).toEqual(['> Notifications'])
	})
})

describe('getCommandPaletteSearchRows', () => {
	it('ranks matches, including disabled ones that can say why, after enabled ones', () => {
		const rows = getCommandPaletteSearchRows(
			[
				entry('realign', { label: 'Realign', path: ['Arrange'] }),
				entry('align', { label: 'Align', path: ['Arrange'], disabled: true, disabledReason: 'x' }),
				entry('unalign', { label: 'Unalign', path: ['Arrange'], disabled: true }),
				entry('zoom', { label: 'Zoom in' }),
			],
			'align',
			[]
		)
		expect(rows.map((row) => row.type === 'item' && row.entry.id)).toEqual(['realign', 'align'])
	})

	it('groups a submenu by the items search can show', () => {
		const rows = getCommandPaletteSearchRows(
			[
				entry('move-1', { label: 'Move to page: Page 1', name: 'Page 1', submenu: moveTo }),
				entry('move-new', {
					label: 'Move to page: New page',
					name: 'New page',
					submenu: moveTo,
					disabled: true,
				}),
			],
			'move',
			[]
		)
		expect(describeRows(rows)).toEqual(['Move to page: Page 1'])
	})

	it('folds items matched only by their submenu name into the submenu row', () => {
		const rows = getCommandPaletteSearchRows(submenuEntries, 'move', [])
		expect(describeRows(rows)).toEqual(['> Move to page'])
	})

	it('keeps items matched by their own name', () => {
		const rows = getCommandPaletteSearchRows(submenuEntries, 'page 2', [])
		expect(describeRows(rows)).toEqual(['Move to page: Page 2'])
	})

	it('folds items named by the query too when it also matches the submenu name', () => {
		const rows = getCommandPaletteSearchRows(submenuEntries, 'page', [])
		expect(describeRows(rows)).toEqual(['> Move to page'])
	})

	it('keeps items when the query spans the submenu and the item name', () => {
		const rows = getCommandPaletteSearchRows(submenuEntries, 'move to page 1', [])
		expect(describeRows(rows)).toEqual(['Move to page: Page 1'])
	})

	it('folds items matched only through their path', () => {
		const rows = getCommandPaletteSearchRows(
			[...submenuEntries, entry('flip', { path: ['Pages'], label: 'Flip' })].map((e) =>
				e.submenu === moveTo ? { ...e, path: ['Pages', 'Move to page'] } : e
			),
			'pages',
			[]
		)
		expect(describeRows(rows)).toEqual(['> Move to page', 'Flip'])
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
