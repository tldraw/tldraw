import { atom, computed } from '@tldraw/editor'
import { TLUiEventSource } from '../../context/events'
import { TLUiIconJsx } from '../primitives/TldrawUiIcon'

/** @internal */
export interface CommandPaletteSubmenu {
	key: string
	label: string
	icon?: string | TLUiIconJsx
	/** Always one row you open, even with one item, and its items never show outside it. */
	collapsed?: boolean
}

/** @internal */
export interface CommandPalettePrompt {
	placeholder: string
	/** Prefills the input, selected so typing replaces it, e.g. the current name when renaming. */
	initialValue?: string
	onSubmit(value: string): void
}

/** @internal */
export interface CommandPaletteSearchResult {
	id: string
	label: string
	/** Muted text after the label, e.g. where the hit is. */
	detail?: string
	icon?: string | TLUiIconJsx
	onSelect(): void
}

/** @internal */
export interface CommandPaletteSearch {
	placeholder: string
	getResults(query: string): CommandPaletteSearchResult[]
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
	icon?: string | TLUiIconJsx
	kbd?: string
	checked?: boolean
	isSelected?: boolean
	/** Listed first, above recents, on an empty query. */
	pinned?: boolean
	/** Asks for text in the palette before running, instead of running on select. */
	prompt?: CommandPalettePrompt
	/** Opens its own search in the palette, listing hits instead of entries. */
	search?: CommandPaletteSearch
	onSelect(source: TLUiEventSource): Promise<void> | void
	marker: Element | null
}

function compareByDocumentPosition(a: CommandPaletteEntry, b: CommandPaletteEntry) {
	if (a.marker === b.marker) return 0
	if (!a.marker) return 1
	if (!b.marker) return -1
	return a.marker.compareDocumentPosition(b.marker) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
}

/** @internal */
export class CommandPaletteStore {
	private readonly registrations = new Map<string, CommandPaletteEntry>()
	private readonly version = atom('command palette version', 0)

	readonly query = atom('command palette query', '')
	/** The submenu opened from a grouped submenu row, or null at the top level. */
	readonly submenu = atom<CommandPaletteSubmenu | null>('command palette submenu', null)
	/** The item whose prompt or search is open, or null. */
	readonly prompt = atom<CommandPaletteEntry | null>('command palette prompt', null)
	/** The id of the highlighted item, or null when a submenu row, a prompt, a search hit or nothing is. */
	readonly activeItemId = atom<string | null>('command palette active item', null)

	set(token: string, entry: CommandPaletteEntry) {
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
