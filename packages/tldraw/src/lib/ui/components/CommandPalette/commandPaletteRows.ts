import { MAX_COMMAND_PALETTE_RECENTS } from './commandPaletteRecents'
import { getCommandPaletteMatchScore, rankCommandPaletteEntries } from './commandPaletteSearch'
import { CommandPaletteEntry, CommandPaletteSubmenu } from './CommandPaletteStore'

/** @internal */
export type CommandPaletteRow =
	| { type: 'heading'; key: string; label: string }
	| { type: 'separator'; key: string }
	| {
			type: 'item'
			key: string
			entry: CommandPaletteEntry
			label: string
			recent: boolean
			/** Muted text after the label, e.g. the value a prompt will submit. */
			detail?: string
			/** Leading affordance, e.g. a prompt row's arrow. */
			icon?: string
	  }
	| { type: 'submenu'; key: string; submenu: CommandPaletteSubmenu }

/** @internal */
export type SelectableRow = Extract<CommandPaletteRow, { type: 'item' | 'submenu' }>

/** @internal */
export interface CommandPaletteSection {
	key: string
	heading?: Extract<CommandPaletteRow, { type: 'heading' }>
	separated?: boolean
	rows: SelectableRow[]
}

function itemRow(entry: CommandPaletteEntry, label = entry.label): CommandPaletteRow {
	return {
		type: 'item',
		key: `item:${entry.id}`,
		entry,
		label,
		detail: entry.detail,
		recent: false,
	}
}

function submenuRow(submenu: CommandPaletteSubmenu): CommandPaletteRow {
	return { type: 'submenu', key: `submenu:${submenu.key}`, submenu }
}

// A one-item submenu stays a plain row, since opening it would only add a step. Collapsed
// submenus always group, whatever their size.
function getGroupedSubmenuKeys(entries: readonly CommandPaletteEntry[]) {
	const sizes = new Map<string, number>()
	const keys = new Set<string>()
	for (const { submenu } of entries) {
		if (!submenu) continue
		sizes.set(submenu.key, (sizes.get(submenu.key) ?? 0) + 1)
		if (submenu.collapsed) keys.add(submenu.key)
	}
	for (const [key, size] of sizes) if (size > 1) keys.add(key)
	return keys
}

// Pinned and unpinned lists share a section list, so their keys need distinct prefixes or React
// reuses the wrong section and leaves stale rows behind.
function listEntries(
	entries: readonly CommandPaletteEntry[],
	keyPrefix: string,
	skip: ReadonlySet<CommandPaletteEntry> = new Set()
) {
	const rows: CommandPaletteRow[] = []
	const grouped = getGroupedSubmenuKeys(entries)
	const added = new Set<string>()
	let currentHeading: string | null = null
	const push = (entry: CommandPaletteEntry, row: CommandPaletteRow) => {
		if (entry.heading !== currentHeading) {
			// An unlabelled group after a labelled one gets a separator so it doesn't read as part of it.
			if (entry.heading) {
				rows.push({
					type: 'heading',
					key: `${keyPrefix}heading:${rows.length}`,
					label: entry.heading,
				})
			} else if (rows.length) {
				rows.push({ type: 'separator', key: `${keyPrefix}separator:${rows.length}` })
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
	recentHeading: string
): CommandPaletteRow[] {
	const rows: CommandPaletteRow[] = []
	const pinned = entries.filter((entry) => entry.pinned)
	const unpinned = entries.filter((entry) => !entry.pinned)

	if (pinned.length) {
		rows.push(...listEntries(pinned, 'pinned:'))
		rows.push({ type: 'separator', key: 'separator:pinned' })
	}

	const recent = recentIds
		.map((id) => unpinned.find((entry) => entry.id === id))
		.filter((entry): entry is CommandPaletteEntry => !!entry && !entry.submenu?.collapsed)
		.slice(0, MAX_COMMAND_PALETTE_RECENTS)
	if (recent.length) {
		rows.push({ type: 'heading', key: 'heading:recent', label: recentHeading })
		for (const entry of recent) {
			rows.push({
				type: 'item',
				key: `recent:${entry.id}`,
				entry,
				label: entry.label,
				detail: entry.detail,
				recent: true,
			})
		}
		rows.push({ type: 'separator', key: 'separator:recent' })
	}

	const listed = listEntries(unpinned, '', new Set(recent))
	// A heading over the only section names nothing it needs to tell apart.
	const groupHeadings = listed.filter((row) => row.type === 'heading')
	rows.push(
		...(groupHeadings.length === 1 && !recent.length
			? listed.filter((row) => row !== groupHeadings[0])
			: listed)
	)
	if (rows[rows.length - 1]?.type === 'separator') rows.pop()
	return rows
}

/** @internal */
export function getCommandPaletteSearchRows(
	entries: readonly CommandPaletteEntry[],
	query: string,
	recentIds: readonly string[]
): CommandPaletteRow[] {
	const ranked = rankCommandPaletteEntries(entries, query, recentIds)

	// An item stays a row when the query names it ("page 2", "move to page 2"). When the query also
	// matches the submenu's own name ("page", "file"), or only its path ("preferences"), the items fold
	// into the row that opens the submenu, so it doesn't show next to some of its own items.
	const isFoundByOwnName = (entry: CommandPaletteEntry, submenu: CommandPaletteSubmenu) =>
		getCommandPaletteMatchScore(query, submenu.label) === 0 &&
		(getCommandPaletteMatchScore(query, entry.name) > 0 ||
			getCommandPaletteMatchScore(query, entry.label) > 0)
	const grouped = getGroupedSubmenuKeys(entries)
	const added = new Set<string>()
	const rows: CommandPaletteRow[] = []
	for (const entry of ranked) {
		const { submenu } = entry
		if (
			submenu &&
			grouped.has(submenu.key) &&
			(submenu.collapsed || !isFoundByOwnName(entry, submenu))
		) {
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
		for (const entry of inSubmenu) {
			if (previous && previous.section !== entry.section) {
				rows.push({ type: 'separator', key: `separator:${entry.id}` })
			}
			rows.push(itemRow(entry, entry.name))
			previous = entry
		}
		return rows
	}
	const rankable = inSubmenu.map((entry) => ({
		id: entry.id,
		label: entry.name,
		path: entry.detail ? [entry.detail] : [],
		entry,
	}))
	return rankCommandPaletteEntries(rankable, query, recentIds).map(({ entry }) =>
		itemRow(entry, entry.name)
	)
}

/** @internal */
export function getCommandPalettePromptRows(
	prompt: CommandPaletteEntry,
	query: string,
	cancelLabel: string,
	dir: 'ltr' | 'rtl'
): CommandPaletteRow[] {
	// Spells out what Enter does, and offers a way back.
	const value = query.trim()
	const icon = dir === 'rtl' ? 'arrow-left' : 'arrow-right'
	return [
		{
			type: 'item',
			key: 'prompt',
			entry: prompt,
			label: prompt.name,
			detail: value ? `“${value}”` : undefined,
			icon,
			recent: false,
		},
		{
			type: 'item',
			key: 'prompt:cancel',
			entry: { ...prompt, id: 'command-palette-cancel', prompt: undefined, kbd: '[[Esc]]' },
			label: cancelLabel,
			icon,
			recent: false,
		},
	]
}

/** @internal */
export function getCommandPaletteSections(rows: readonly CommandPaletteRow[]) {
	const out: CommandPaletteSection[] = []
	for (const row of rows) {
		if (row.type === 'heading') out.push({ key: row.key, heading: row, rows: [] })
		else if (row.type === 'separator') out.push({ key: row.key, separated: true, rows: [] })
		else {
			if (!out.length) out.push({ key: 'start', rows: [] })
			out[out.length - 1].rows.push(row)
		}
	}
	return out
}
