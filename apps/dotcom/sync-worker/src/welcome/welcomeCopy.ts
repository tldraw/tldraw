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
// `<strong>` marks the bold runs, matching the bold marks in the snapshot's richText and the
// `<strong>` chunk convention the rest of dotcom's messages use.

export interface WelcomeCopyEntry {
	/** Stable lokalise message id, written into the catalog under `welcome.*`. */
	id: string
	/**
	 * The English source, with `<strong>` wrapping bold runs. Both the lokalise seed and the key
	 * used to locate the shape(s) in the snapshot — it MUST equal a shape's serialized richText, an
	 * invariant the build step asserts.
	 */
	en: string
}

export const WELCOME_COPY: readonly WelcomeCopyEntry[] = [
	// Instructional captions (the teaching copy).
	{ id: 'welcome.title', en: 'Welcome to your workspace' },
	{
		id: 'welcome.whatIsWorkspace',
		en: 'A workspace is a <strong>shared space</strong> for your team. Everyone in it sees the same list of files and can open and edit them.',
	},
	{
		id: 'welcome.createWorkspace',
		en: 'Create a new workspace from the workspace menu in the sidebar. Click <strong>New workspace</strong>, give it a name, and it’s ready to go.',
	},
	{
		id: 'welcome.workspaceMenu',
		en: 'Find everything in the <strong>workspace menu</strong>: create files, search, switch workspaces, and open settings.',
	},
	{
		id: 'welcome.inviteTeam',
		en: '<strong>Invite your team</strong> with an invite link from the workspace menu in the sidebar. Shared it by accident? Revoke it there too.',
	},
	{
		id: 'welcome.shareLink',
		en: 'Need to share with people outside your workspace? You can <strong>share a link</strong> for a single file so guests can edit it without joining the workspace.',
	},
	{
		id: 'welcome.moveFiles',
		en: "You can <strong>move files</strong> into your workspace with a file's 'Move to' menu.",
	},
	{
		id: 'welcome.pinFiles',
		en: 'Pin files you use most. <strong>Pinned files</strong> stay at the top of the list, so they’re always easy to find.',
	},
	{
		id: 'welcome.manageMembers',
		en: 'Need to <strong>remove someone</strong>? Owners can change roles or remove people in Manage workspace.',
	},
	{
		id: 'welcome.signoff',
		en: "p.s. feel free to edit or delete this board now that you've mastered workspaces",
	},

	// Depicted app UI labels. These mirror the real app chrome (already translated elsewhere), so
	// leaving them English reads as inconsistent next to the localized sidebar. Several appear on
	// more than one shape; each occurrence is localized.
	{ id: 'welcome.ui.myWorkspace', en: 'My workspace' },
	{ id: 'welcome.ui.myFiles', en: 'my files' },
	{ id: 'welcome.ui.yourWorkspace', en: 'your workspace' },
	{ id: 'welcome.ui.newFile', en: 'New file' },
	{ id: 'welcome.ui.newWorkspace', en: 'New workspace' },
	{ id: 'welcome.ui.search', en: 'Search...' },
	{ id: 'welcome.ui.workspaceSettings', en: 'Workspace settings' },
	{ id: 'welcome.ui.pinned', en: 'Pinned' },
	{ id: 'welcome.ui.owner', en: 'Owner' },
	{ id: 'welcome.ui.member', en: 'Member' },
	{ id: 'welcome.ui.remove', en: 'Remove' },
	{ id: 'welcome.ui.inviteLink', en: 'Invite link' },
	{ id: 'welcome.ui.today', en: 'Today' },
	{ id: 'welcome.ui.yesterday', en: 'Yesterday' },
	{ id: 'welcome.ui.lastWeek', en: 'Last week' },

	// Example file names shown in the drawn file list.
	{ id: 'welcome.file.decisionTree', en: 'Decision tree' },
	{ id: 'welcome.file.packingChecklist', en: 'Packing checklist' },
	{ id: 'welcome.file.regionalMap', en: 'Regional map' },
	{ id: 'welcome.file.postTripRetrospective', en: 'Post-trip retrospective' },
] as const
