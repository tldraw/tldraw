import { describe, expect, it, vi } from 'vitest'
import {
	CommandPaletteRow,
	getCommandPaletteBrowseRows,
	getCommandPalettePromptRows,
	getCommandPaletteSearchRows,
	getCommandPaletteSections,
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
	it('shows recents first and only there, skipping ids that are gone', () => {
		const rows = getCommandPaletteBrowseRows(
			[entry('undo'), entry('grid')],
			['gone', 'undo'],
			'Recent'
		)
		expect(describeRows(rows)).toEqual(['# Recent', 'recent undo', '---', 'grid'])
		const allRecent = getCommandPaletteBrowseRows([entry('undo')], ['undo'], 'Recent')
		expect(describeRows(allRecent)).toEqual(['# Recent', 'recent undo'])
	})

	it('fills the recents from further down when earlier ids are gone or on demand', () => {
		const notifications = { key: 'notifications', label: 'Notifications', onDemand: true }
		const kept = ['a', 'b', 'c', 'd', 'e', 'f']
		const rows = getCommandPaletteBrowseRows(
			[entry('note', { submenu: notifications }), ...kept.map((id) => entry(id))],
			['gone-1', 'gone-2', 'note', 'gone-3', ...kept],
			'Recent'
		)
		expect(describeRows(rows)).toEqual([
			'# Recent',
			...kept.slice(0, 5).map((id) => `recent ${id}`),
			'---',
			'> Notifications',
			'f',
		])
	})

	it('lists pinned entries first, above recents and never among them', () => {
		const rows = getCommandPaletteBrowseRows(
			[entry('undo'), entry('flag', { pinned: true }), entry('grid')],
			['flag', 'grid'],
			'Recent'
		)
		expect(describeRows(rows)).toEqual(['flag', '---', '# Recent', 'recent grid', '---', 'undo'])
	})

	it('keys pinned and unpinned headings and separators apart', () => {
		const rows = getCommandPaletteBrowseRows(
			[
				entry('flag', { pinned: true, heading: 'Pinned' }),
				entry('star', { pinned: true }),
				entry('undo', { heading: 'Edit' }),
				entry('grid'),
				entry('theme', { heading: 'View' }),
			],
			['grid'],
			'Recent'
		)
		const keys = rows.map((row) => row.key)
		expect(new Set(keys).size).toBe(keys.length)
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

	it('keeps an on-demand submenu as one row, even with one item', () => {
		const news = { key: 'news', label: 'Notifications', onDemand: true }
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

	it('leaves out disabled entries', () => {
		const rows = getCommandPaletteBrowseRows(
			[entry('undo', { disabled: true }), entry('grid')],
			['undo'],
			'Recent'
		)
		expect(describeRows(rows)).toEqual(['grid'])
	})
})

describe('getCommandPaletteSearchRows', () => {
	// An item stays a row when the query names it; when the query also matches the submenu's own
	// name, the items fold into the submenu row.
	it.each([
		['move', ['> Move to page']],
		['page 2', ['Move to page: Page 2']],
		['page', ['> Move to page']],
		['move to page 1', ['Move to page: Page 1']],
	])('folds or keeps submenu items for %j', (query, expected) => {
		expect(describeRows(getCommandPaletteSearchRows(submenuEntries, query, []))).toEqual(expected)
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

	it('lists disabled matches after the enabled ones', () => {
		const rows = getCommandPaletteSearchRows(
			[entry('align', { label: 'Align', disabled: true }), entry('realign', { label: 'Realign' })],
			'align',
			[]
		)
		expect(describeRows(rows)).toEqual(['Realign', 'Align'])
	})
})

describe('getCommandPaletteSubmenuRows', () => {
	it("lists the submenu's items by their own names", () => {
		const rows = getCommandPaletteSubmenuRows(submenuEntries, moveTo.key, '', [])
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

	it('leaves out disabled items while the query is blank, and lists them last when matched', () => {
		const entries = submenuEntries.map((e) =>
			e.id === 'move-Page 1' ? { ...e, disabled: true } : e
		)
		const rows = (query: string) =>
			describeRows(getCommandPaletteSubmenuRows(entries, moveTo.key, query, []))
		expect(rows('')).toEqual(['Page 2'])
		expect(rows('page')).toEqual(['Page 2', 'Page 1'])
	})

	it('shows and matches the detail', () => {
		const files = { key: 'go-to-file', label: 'Go to file' }
		const entries = [
			entry('a', { name: 'Roadmap', submenu: files, detail: 'Acme' }),
			entry('b', { name: 'Roadmap', submenu: files, detail: 'Globex' }),
		]
		const details = (rows: CommandPaletteRow[]) =>
			rows.map((row) => (row.type === 'item' ? [row.label, row.detail] : row.type))
		expect(details(getCommandPaletteSubmenuRows(entries, files.key, '', []))).toEqual([
			['Roadmap', 'Acme'],
			['Roadmap', 'Globex'],
		])
		expect(details(getCommandPaletteSubmenuRows(entries, files.key, 'roadmap glo', []))).toEqual([
			['Roadmap', 'Globex'],
		])
	})
})

describe('getCommandPalettePromptRows', () => {
	const rename = entry('rename', {
		name: 'Rename',
		kbd: '[[F2]]',
		prompt: { placeholder: 'Name', onSubmit: vi.fn() },
	})

	it.each([
		{
			query: '  Roadmap ',
			dir: 'ltr' as const,
			rows: [
				['Rename', '“Roadmap”', 'arrow-right', '[[F2]]'],
				['Cancel', undefined, 'arrow-right', '[[Esc]]'],
			],
		},
		{
			query: '  ',
			dir: 'ltr' as const,
			rows: [
				['Rename', undefined, 'arrow-right', '[[F2]]'],
				['Cancel', undefined, 'arrow-right', '[[Esc]]'],
			],
		},
		{
			query: '',
			dir: 'rtl' as const,
			rows: [
				['Rename', undefined, 'arrow-left', '[[F2]]'],
				['Cancel', undefined, 'arrow-left', '[[Esc]]'],
			],
		},
	])('shows the trimmed value and a cancel row for $query ($dir)', ({ query, dir, rows }) => {
		expect(
			getCommandPalettePromptRows(rename, query, 'Cancel', dir).map(
				(row) => row.type === 'item' && [row.label, row.detail, row.icon, row.entry.kbd]
			)
		).toEqual(rows)
	})
})

describe('getCommandPaletteSections', () => {
	const describeSections = (rows: CommandPaletteRow[]) =>
		getCommandPaletteSections(rows).map((section) => ({
			heading: section.heading?.label,
			separated: section.separated,
			rows: describeRows(section.rows),
		}))

	it('groups rows under the heading or separator before them', () => {
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
		expect(describeSections(rows)).toEqual([
			{ heading: 'Edit', separated: undefined, rows: ['undo', 'redo'] },
			{ heading: 'View', separated: undefined, rows: ['grid'] },
			{ heading: undefined, separated: true, rows: ['custom'] },
		])
	})

	it('starts an unheaded section for rows before any heading', () => {
		const rows = getCommandPaletteBrowseRows(submenuEntries, [], 'Recent')
		expect(describeSections(rows)).toEqual([
			{
				heading: undefined,
				separated: undefined,
				rows: ['> Move to page', 'Theme: Dark', 'Show grid'],
			},
		])
	})

	// The list skips empty sections when rendering, so a separator before a heading draws nothing.
	it('leaves an empty section for a separator followed by a heading', () => {
		const rows = getCommandPaletteBrowseRows(
			[entry('flag', { pinned: true }), entry('grid'), entry('undo')],
			['grid'],
			'Recent'
		)
		expect(describeSections(rows)).toEqual([
			{ heading: undefined, separated: undefined, rows: ['flag'] },
			{ heading: undefined, separated: true, rows: [] },
			{ heading: 'Recent', separated: undefined, rows: ['recent grid'] },
			{ heading: undefined, separated: true, rows: ['undo'] },
		])
	})
})
