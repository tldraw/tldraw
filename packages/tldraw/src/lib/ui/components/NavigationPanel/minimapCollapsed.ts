import { localStorageAtom } from '@tldraw/editor'

// Shared by the navigation panel's button and the `toggle-minimap` action. A preference, so it's
// shared across editors and tabs.
const [minimapCollapsed] = localStorageAtom('minimap', true)

/** @internal */
export function isMinimapCollapsed() {
	return minimapCollapsed.get()
}

/** @internal */
export function toggleMinimap() {
	minimapCollapsed.update((collapsed) => !collapsed)
}
