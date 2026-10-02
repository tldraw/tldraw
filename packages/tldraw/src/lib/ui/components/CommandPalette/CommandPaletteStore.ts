import { atom, computed } from '@tldraw/editor'
import { TLUiEventSource } from '../../context/events'

/** @internal */
export interface CommandPaletteSubmenu {
	key: string
	label: string
}

/** @internal */
export interface CommandPalettePrompt {
	placeholder: string
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
	kbd?: string
	checked?: boolean
	isSelected?: boolean
	disabled: boolean
	disabledReason?: string
	/** A short explanation shown under the label. */
	description?: string
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

/** @internal */
export class CommandPaletteStore {
	private readonly registrations = new Map<string, CommandPaletteEntry>()
	private readonly version = atom('command palette version', 0)

	readonly query = atom('command palette query', '')
	/** The submenu opened from a grouped submenu row, or null at the top level. */
	readonly submenu = atom<CommandPaletteSubmenu | null>('command palette submenu', null)
	/** The item whose prompt is open, or null. */
	readonly prompt = atom<CommandPaletteEntry | null>('command palette prompt', null)

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
