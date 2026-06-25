// The welcome document's instructional copy: the subset of the committed default snapshot's text
// shapes that teach the user how workspaces work, as opposed to the comic's in-world flavor text
// (sticky-note labels, drawn file names, character names), which is part of the illustration and
// stays English.
//
// This is the one hand-maintained list in the welcome i18n pipeline, and it is deliberately thin:
// each entry is a stable message id plus the exact English string that string appears as in the
// snapshot. The English doubles as the match key — the build step locates each shape by finding the
// one whose text serializes to this `en` (see welcomeMarkup), and asserts the match is unique, so a
// reworded snapshot fails the build loudly instead of silently shipping stale English. The same
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
	 * used to locate the shape in the snapshot — it MUST equal that shape's serialized richText, an
	 * invariant the build step asserts.
	 */
	en: string
}

export const WELCOME_COPY: readonly WelcomeCopyEntry[] = [
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
] as const
