import { atom, computed } from '@tldraw/editor'
import { TLUiEventSource } from '../../context/events'

/** @internal */
export interface CommandPaletteSubmenu {
	key: string
	label: string
	/** Always one row you open, even with one item, and its items never show outside it. */
	onDemand?: boolean
}

/** @internal */
export interface CommandPalettePrompt {
	placeholder: string
	/** Prefills the input, selected so typing replaces it, e.g. the current name when renaming. */
	initialValue?: string
	onSubmit(value: string): void
}

/** @internal */
export interface CommandPaletteEntry {
	id: string
	/** Display text, including the submenu prefix. */
	label: string
	/** The item's own label, without the submenu prefix. */
	name: string
	path: readonly string[]
	submenu: CommandPaletteSubmenu | null
	/** The unlabelled menu group the item is in, for separators inside an opened submenu. */
	section: string | null
	/** The outermost labelled group the item is in, for group headings. */
	heading: string | null
	kbd?: string
	checked?: boolean
	isSelected?: boolean
	/** Muted text after the label, e.g. the workspace a file is in. Also in `path`, for search. */
	detail?: string
	/** Listed first, above recents, on an empty query. */
	pinned?: boolean
	/** Asks for text in the palette before running, instead of running on select. */
	prompt?: CommandPalettePrompt
	onSelect(source: TLUiEventSource): Promise<void> | void
	marker: Element | null
}

function compareByDocumentPosition(a: CommandPaletteEntry, b: CommandPaletteEntry) {
	if (a.marker === b.marker) return 0
	if (!a.marker) return 1
	if (!b.marker) return -1
	return a.marker.compareDocumentPosition(b.marker) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
}

const same = (a: unknown, b: unknown) => a === b

// Typed over every key, so a new entry field fails to compile until it says how it compares.
const entryFieldEquals: {
	[K in keyof Required<CommandPaletteEntry>]: (
		a: CommandPaletteEntry[K],
		b: CommandPaletteEntry[K]
	) => boolean
} = {
	id: same,
	label: same,
	name: same,
	path: (a, b) => a.length === b.length && a.every((part, i) => part === b[i]),
	submenu: (a, b) =>
		a === b || (!!a && !!b && a.key === b.key && a.label === b.label && a.onDemand === b.onDemand),
	section: same,
	heading: same,
	kbd: same,
	checked: same,
	isSelected: same,
	detail: same,
	pinned: same,
	prompt: (a, b) =>
		a === b ||
		(!!a &&
			!!b &&
			a.placeholder === b.placeholder &&
			a.initialValue === b.initialValue &&
			a.onSubmit === b.onSubmit),
	onSelect: same,
	marker: same,
}

function areEntriesEqual(a: CommandPaletteEntry, b: CommandPaletteEntry) {
	return (Object.keys(entryFieldEquals) as (keyof CommandPaletteEntry)[]).every((key) =>
		(entryFieldEquals[key] as (a: unknown, b: unknown) => boolean)(a[key], b[key])
	)
}

/** @internal */
export class CommandPaletteStore {
	private readonly registrations = new Map<string, CommandPaletteEntry>()
	private readonly version = atom('command palette version', 0)

	readonly query = atom('command palette query', '')
	/** The submenu opened from a grouped submenu row, or null at the top level. */
	readonly submenu = atom<CommandPaletteSubmenu | null>('command palette submenu', null)
	/** The item whose prompt is open, or null. */
	readonly prompt = atom<CommandPaletteEntry | null>('command palette prompt', null)
	/** The id of the highlighted item, or null when a submenu row, a prompt or nothing is. */
	readonly activeItemId = atom<string | null>('command palette active item', null)

	/** Items register on every render, so an unchanged entry must not bump, or the palette loops. */
	set(token: string, entry: CommandPaletteEntry) {
		const current = this.registrations.get(token)
		if (current && areEntriesEqual(current, entry)) return
		this.registrations.set(token, entry)
		this.version.update((v) => v + 1)
	}

	delete(token: string) {
		if (this.registrations.delete(token)) this.version.update((v) => v + 1)
	}

	// Sorted by marker position so JSX order wins even for items that mount late.
	readonly entries = computed('command palette entries', () => {
		this.version.get()
		const seen = new Set<string>()
		return [...this.registrations.values()].sort(compareByDocumentPosition).filter((entry) => {
			if (seen.has(entry.id)) return false
			seen.add(entry.id)
			return true
		})
	})
}
