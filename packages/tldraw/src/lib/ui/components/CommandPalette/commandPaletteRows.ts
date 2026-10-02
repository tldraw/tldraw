import { MAX_COMMAND_PALETTE_RECENTS } from './commandPaletteRecents'
import { getCommandPaletteMatchScore, rankCommandPaletteEntries } from './commandPaletteSearch'
import { CommandPaletteEntry, CommandPaletteSubmenu } from './CommandPaletteStore'

/** @internal */
export type CommandPaletteRow =
	| { type: 'heading'; key: string; label: string }
	| { type: 'separator'; key: string }
	| { type: 'item'; key: string; entry: CommandPaletteEntry; label: string; recent: boolean }
	| { type: 'submenu'; key: string; submenu: CommandPaletteSubmenu }

/** @internal */
export interface CommandPaletteRowOptions {
	showRecents: boolean
	groupSubmenus: boolean
	showGroupHeadings?: boolean
}

// Search lists disabled rows only with a reason, so it never shows a greyed row it can't explain.
function explainable(entries: readonly CommandPaletteEntry[]) {
	return entries.filter((entry) => !entry.disabled || !!entry.disabledReason)
}

function itemRow(entry: CommandPaletteEntry, label = entry.label): CommandPaletteRow {
	return { type: 'item', key: `item:${entry.id}`, entry, label, recent: false }
}

function submenuRow(submenu: CommandPaletteSubmenu): CommandPaletteRow {
	return { type: 'submenu', key: `submenu:${submenu.key}`, submenu }
}

// A one-item submenu stays a plain row: opening it would only add a step.
function getGroupedSubmenuKeys(entries: readonly CommandPaletteEntry[]) {
	const sizes = new Map<string, number>()
	for (const { submenu } of entries) {
		if (submenu) sizes.set(submenu.key, (sizes.get(submenu.key) ?? 0) + 1)
	}
	return new Set([...sizes].filter(([, size]) => size > 1).map(([key]) => key))
}

// Headings cost rows in a short, mostly searched list, so they're off unless flagged on.
function listEntries(
	entries: readonly CommandPaletteEntry[],
	groupSubmenus: boolean,
	{
		skip = new Set(),
		headings = false,
	}: { skip?: ReadonlySet<CommandPaletteEntry>; headings?: boolean } = {}
) {
	const rows: CommandPaletteRow[] = []
	const grouped = groupSubmenus ? getGroupedSubmenuKeys(entries) : new Set<string>()
	const added = new Set<string>()
	let currentHeading: string | null = null
	const push = (entry: CommandPaletteEntry, row: CommandPaletteRow) => {
		if (headings && entry.heading !== currentHeading) {
			// An unlabelled group after a labelled one gets a separator so it doesn't read as part of it.
			if (entry.heading) {
				rows.push({ type: 'heading', key: `heading:${rows.length}`, label: entry.heading })
			} else if (rows.length) {
				rows.push({ type: 'separator', key: `separator:${rows.length}` })
			}
			currentHeading = entry.heading
		}
		rows.push(row)
	}
	for (const entry of entries) {
		const { submenu } = entry
		if (submenu && grouped.has(submenu.key)) {
			if (!added.has(submenu.key)) {
				added.add(submenu.key)
				push(entry, submenuRow(submenu))
			}
			continue
		}
		if (!skip.has(entry)) push(entry, itemRow(entry))
	}
	return rows
}

/** @internal */
export function getCommandPaletteBrowseRows(
	entries: readonly CommandPaletteEntry[],
	recentIds: readonly string[],
	recentHeading: string,
	{ showRecents, groupSubmenus, showGroupHeadings = false }: CommandPaletteRowOptions
): CommandPaletteRow[] {
	const rows: CommandPaletteRow[] = []
	const enabled = entries.filter((entry) => !entry.disabled)
	const pinned = enabled.filter((entry) => entry.pinned)
	const unpinned = enabled.filter((entry) => !entry.pinned)

	if (pinned.length) {
		rows.push(...listEntries(pinned, groupSubmenus))
		rows.push({ type: 'separator', key: 'separator:pinned' })
	}

	const recent = showRecents
		? recentIds
				.map((id) => unpinned.find((entry) => entry.id === id))
				.filter((entry): entry is CommandPaletteEntry => !!entry)
				.slice(0, MAX_COMMAND_PALETTE_RECENTS)
		: []
	if (recent.length) {
		rows.push({ type: 'heading', key: 'heading:recent', label: recentHeading })
		for (const entry of recent) {
			rows.push({
				type: 'item',
				key: `recent:${entry.id}`,
				entry,
				label: entry.label,
				recent: true,
			})
		}
		rows.push({ type: 'separator', key: 'separator:recent' })
	}

	rows.push(
		...listEntries(unpinned, groupSubmenus, { skip: new Set(recent), headings: showGroupHeadings })
	)
	if (rows[rows.length - 1]?.type === 'separator') rows.pop()
	return rows
}

/** @internal */
export function getCommandPaletteSearchRows(
	entries: readonly CommandPaletteEntry[],
	query: string,
	recentIds: readonly string[],
	{ groupSubmenus }: Pick<CommandPaletteRowOptions, 'groupSubmenus'>
): CommandPaletteRow[] {
	const ranked = rankCommandPaletteEntries(explainable(entries), query, recentIds)
	if (!groupSubmenus) return ranked.map((entry) => itemRow(entry))

	// An item stays a row when the query names it ("page 2", "move to page 2"); one found only
	// through its submenu or path folds into the row that opens the submenu ("move", "preferences").
	const isFoundByOwnName = (entry: CommandPaletteEntry, submenu: CommandPaletteSubmenu) =>
		getCommandPaletteMatchScore(query, entry.name) > 0 ||
		(getCommandPaletteMatchScore(query, entry.label) > 0 &&
			getCommandPaletteMatchScore(query, submenu.label) === 0)
	const grouped = getGroupedSubmenuKeys(entries)
	const added = new Set<string>()
	const rows: CommandPaletteRow[] = []
	for (const entry of ranked) {
		const { submenu } = entry
		if (submenu && grouped.has(submenu.key) && !isFoundByOwnName(entry, submenu)) {
			if (!added.has(submenu.key)) {
				added.add(submenu.key)
				rows.push(submenuRow(submenu))
			}
			continue
		}
		rows.push(itemRow(entry))
	}
	return rows
}

/** Rows inside an opened submenu, labelled and matched by the items' own names. @internal */
export function getCommandPaletteSubmenuRows(
	entries: readonly CommandPaletteEntry[],
	submenuKey: string,
	query: string,
	recentIds: readonly string[]
): CommandPaletteRow[] {
	const inSubmenu = entries.filter((entry) => entry.submenu?.key === submenuKey)
	if (!query.trim()) {
		const rows: CommandPaletteRow[] = []
		let previous: CommandPaletteEntry | undefined
		for (const entry of inSubmenu.filter((entry) => !entry.disabled)) {
			if (previous && previous.section !== entry.section) {
				rows.push({ type: 'separator', key: `separator:${entry.id}` })
			}
			rows.push(itemRow(entry, entry.name))
			previous = entry
		}
		return rows
	}
	const rankable = explainable(inSubmenu).map((entry) => ({
		id: entry.id,
		label: entry.name,
		path: [],
		disabled: entry.disabled,
		entry,
	}))
	return rankCommandPaletteEntries(rankable, query, recentIds).map(({ entry }) =>
		itemRow(entry, entry.name)
	)
}
