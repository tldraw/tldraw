import { getFromLocalStorage, setInLocalStorage } from '@tldraw/editor'

const RECENTS_KEY = 'tldraw-command-palette-recents'

/** @internal */
export const MAX_COMMAND_PALETTE_RECENTS = 5

// Longer than what's shown: ids that don't resolve in this editor (other documents' pages, another
// app on the same origin) would otherwise use up the shown slots.
/** @internal */
export const MAX_STORED_COMMAND_PALETTE_RECENTS = 20

/** @internal */
export function getCommandPaletteRecents(): string[] {
	const raw = getFromLocalStorage(RECENTS_KEY)
	if (!raw) return []
	try {
		const parsed: unknown = JSON.parse(raw)
		if (!Array.isArray(parsed)) return []
		return parsed
			.filter((id): id is string => typeof id === 'string')
			.slice(0, MAX_STORED_COMMAND_PALETTE_RECENTS)
	} catch {
		return []
	}
}

// Ids only: stored item objects would go stale.
/** @internal */
export function addCommandPaletteRecent(id: string) {
	const next = [id, ...getCommandPaletteRecents().filter((recent) => recent !== id)]
	setInLocalStorage(RECENTS_KEY, JSON.stringify(next.slice(0, MAX_STORED_COMMAND_PALETTE_RECENTS)))
}
