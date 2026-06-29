// The welcome document's localizable text: the subset of the committed default snapshot's text
// shapes that are real copy — the instructional captions that teach the user how workspaces work,
// the depicted app UI labels, and the example file names. The comic's in-world flavor text (the
// handwritten doodle asides and the character names Cloudy/Penta) is part of the illustration and
// stays English.
//
// This is the one hand-maintained list in the welcome i18n pipeline, and it is deliberately thin:
// each entry is a stable message id plus the exact English string that string appears as in the
// snapshot. The English doubles as the match key — the build step locates the shapes by finding the
// ones whose text serializes to this `en` (see welcomeMarkup), and asserts at least one matches, so
// a reworded snapshot fails the build loudly instead of silently shipping stale English. A string
// that appears on several shapes (e.g. a UI label shown twice) is localized on every one. The same
// `en` is what seeds the lokalise catalog, so translators localize exactly what is baked into the
// art; there is one source of English (the snapshot) and this list is checked against it.
//
// Emphasis uses two marks: `<strong>` for bold and `<mark>` for the yellow highlight (the HTML
// tiptap's Highlight extension emits). In the welcome doc the two always coincide, so an emphasized
// phrase reads `<mark><strong>…</strong></mark>`. Both are inline marks, so they travel with the
// text through localization — unlike the standalone highlight shapes this replaced (see welcomeMarkup).

export interface WelcomeCopyEntry {
	/**
	 * The welcome-owned lokalise message id (`welcome.*`). Present for strings the welcome doc owns —
	 * the captions, the example file names, and UI labels with no app equivalent — which the build
	 * writes into the catalog for translators.
	 *
	 * Omitted for *shared* strings: depicted app-UI labels that already exist as app messages (e.g.
	 * "Search...", "Manage"). The build resolves those to the app's existing message id by matching
	 * `en`, so the illustration inherits the app's official translation in every locale with no extra
	 * work — and the build fails if the app string ever disappears.
	 */
	id?: string
	/**
	 * The English source, with `<strong>` wrapping bold runs and `<mark>` wrapping highlighted runs.
	 * Both the lokalise key (for owned strings) / the app-message match key (for shared strings) and
	 * the key used to locate the shape(s) in the snapshot — it MUST equal a shape's serialized
	 * richText, an invariant the build step asserts.
	 */
	en: string
}

export const WELCOME_COPY: readonly WelcomeCopyEntry[] = [
	// Instructional captions (the teaching copy).
	{ id: 'welcome.title', en: 'Welcome to your workspace' },
	{
		id: 'welcome.whatIsWorkspace',
		en: 'A workspace is a <mark><strong>shared space</strong></mark> for your team. Everyone in it sees the same list of files and can open and edit them.',
	},
	{
		id: 'welcome.createWorkspace',
		en: 'Create a new workspace from the workspace menu in the sidebar. Click <mark><strong>New workspace</strong></mark>, give it a name, and it’s ready to go.',
	},
	{
		id: 'welcome.workspaceMenu',
		en: 'Find everything in the <mark><strong>workspace menu</strong></mark>: create files, search, switch workspaces, and open settings.',
	},
	{
		id: 'welcome.inviteTeam',
		en: '<mark><strong>Invite your team</strong></mark> with an invite link from the workspace menu in the sidebar. Shared it by accident? Revoke it there too.',
	},
	{
		id: 'welcome.shareLink',
		en: 'Need to share with people outside your workspace? You can <mark><strong>share a link</strong></mark> for a single file so guests can edit it without joining the workspace.',
	},
	{
		id: 'welcome.moveFiles',
		en: "You can <mark><strong>move files</strong></mark> into your workspace with a file's 'Move to' menu.",
	},
	{
		id: 'welcome.pinFiles',
		en: 'Pin files you use most. <mark><strong>Pinned files</strong></mark> stay at the top of the list, so they’re always easy to find.',
	},
	{
		id: 'welcome.manageMembers',
		en: 'Need to <mark><strong>remove someone</strong></mark>? Owners can change roles or remove people in Manage workspace.',
	},
	{
		id: 'welcome.signoff',
		en: "p.s. feel free to edit or delete this board now that you've mastered workspaces",
	},

	// Depicted app UI labels that ARE app strings — shared (no id): the build binds each to the app's
	// existing message by matching `en`, so the illustration shows the app's official translation in
	// every locale. (The illustration text "Workspace settings" was renamed to "Manage" to match the
	// real sidebar item, so it has an app match.)
	{ en: 'My workspace' },
	{ en: 'New file' },
	{ en: 'New workspace' },
	{ en: 'Search...' },
	{ en: 'Manage' },
	{ en: 'Pinned' },
	{ en: 'Owner' },
	{ en: 'Member' },
	{ en: 'Remove' },
	{ en: 'Today' },
	{ en: 'Yesterday' },

	// Depicted UI labels with no exact app string — welcome-owned (translated as welcome.*).
	{ id: 'welcome.ui.myFiles', en: 'my files' },
	{ id: 'welcome.ui.yourWorkspace', en: 'your workspace' },
	{ id: 'welcome.ui.inviteLink', en: 'Invite link' },
	{ id: 'welcome.ui.lastWeek', en: 'Last week' },

	// Example file names shown in the drawn file list.
	{ id: 'welcome.file.decisionTree', en: 'Decision tree' },
	{ id: 'welcome.file.packingChecklist', en: 'Packing checklist' },
	{ id: 'welcome.file.regionalMap', en: 'Regional map' },
	{ id: 'welcome.file.postTripRetrospective', en: 'Post-trip retrospective' },
] as const
