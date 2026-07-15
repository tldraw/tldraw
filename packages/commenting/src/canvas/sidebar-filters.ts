/**
 * Which threads the comments sidebar shows. Held as an editor-scoped signal (the `sidebarFilters`
 * {@link EditorAtom} in `./state`) rather than component state so it survives the sidebar
 * unmounting when the comment tool deactivates — a user's "hide resolved" choice shouldn't reset
 * every time they leave the tool.
 */
export interface SidebarFilters {
	/** Include resolved threads. */
	showResolved: boolean
	/** Only threads the current user started. Ignored when there's no current user. */
	onlyMine: boolean
	/** Only threads with unread comments. Ignored when the host provides no read status. */
	onlyUnread: boolean
	/** Only threads on the current page. Off = every page's threads, each labelled. */
	onlyCurrentPage: boolean
}

export const DEFAULT_SIDEBAR_FILTERS: SidebarFilters = {
	showResolved: true,
	onlyMine: false,
	onlyUnread: false,
	onlyCurrentPage: true,
}
