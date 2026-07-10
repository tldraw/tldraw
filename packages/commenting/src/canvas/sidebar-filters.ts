import { atom } from 'tldraw'

/**
 * Which threads the comments sidebar shows. Held as a module signal (like {@link openThreadId})
 * rather than component state so it survives the sidebar unmounting when the comment tool
 * deactivates — a user's "hide resolved" choice shouldn't reset every time they leave the tool.
 */
export interface SidebarFilters {
	/** Include resolved threads. */
	showResolved: boolean
	/** Only threads the current user started. Ignored when there's no current user. */
	onlyMine: boolean
	/** Only threads on the current page. Off = every page's threads, each labelled. */
	onlyCurrentPage: boolean
}

export const DEFAULT_SIDEBAR_FILTERS: SidebarFilters = {
	showResolved: true,
	onlyMine: false,
	onlyCurrentPage: true,
}

export const sidebarFilters = atom<SidebarFilters>('sidebarFilters', DEFAULT_SIDEBAR_FILTERS)
