/** One step of the guided walkthrough: a use case, the rule that solves it, and what to try. */
export interface Step {
	title: string
	/** The rule in `classroom.ts` that answers this use case. */
	rule: string
	try: string[]
	/** The user of each panel for this step. */
	panels: [string, string, string]
	/** Whether each panel's editor runs the rules too. Default: all on. */
	checks?: [boolean, boolean, boolean]
}

export const STEPS: Step[] = [
	{
		title: 'Start here: three clients, one room, one function',
		rule: 'Each panel is a separate client of one sync room. The room and each editor call the same authorize(ctx) function. ctx.action says what the user wants to do: read, create, update, delete, or a custom action such as cards:reveal.',
		try: [
			'Draw in any panel. The shape appears in the other panels.',
			'Use Next to go through the use cases. Each step sets the panel users for you.',
		],
		panels: ['teacher', 'ana', 'ben'],
	},
	{
		title: 'File access: a view-only share link',
		rule: "The guest's actor has role 'viewer'. Every create, update, and delete returns { deny: 'You can only view this file' }. Reads abstain, so they are allowed.",
		try: [
			'In the right panel (Guest), the toolbar has only select and hand: it asks tool:<id>.',
			'Press D, then draw. The tool goes back to select, and nothing is written.',
			'Try to delete the teacher’s text. It acts locked.',
		],
		panels: ['teacher', 'ana', 'guest'],
	},
	{
		title: 'Page read control: team pages',
		rule: "A page with meta.team is hidden from students outside the team. The read rule finds the page of each record, so the page's shapes are hidden too.",
		try: [
			'Open the page menu in the middle panel (Ana). She sees Red team, not Blue team.',
			'Open it in the right panel (Ben). He sees Blue team, not Red team.',
			'Switch the right panel to Ana. The Red team page appears at once, with no reconnect.',
		],
		panels: ['teacher', 'ana', 'ben'],
	},
	{
		title: 'Page write control: a locked page',
		rule: 'A page with meta.locked denies every student write on it. The page is still readable.',
		try: [
			'In the middle panel (Ana), open "Instructions (locked)".',
			'Draw on it. The editor reverts the shape and shows the reason.',
		],
		panels: ['teacher', 'ana', 'ben'],
	},
	{
		title: 'Shape write control: students change only their own shapes',
		rule: "On create, the rule returns { record } with meta.ownerId set to the actor: a stamp. On update and delete, it denies when ownerId is someone else. The editor asks update with no next, and treats a 'no' as locked.",
		try: [
			'Draw a rectangle as Ana (middle panel).',
			'In the right panel (Ben), try to select or move it. It acts locked.',
			'Ben can move his own shapes, and his own card.',
		],
		panels: ['teacher', 'ana', 'ben'],
	},
	{
		title: 'Plugin types and custom actions: hidden cards',
		rule: "On read, a card that is not revealed returns a copy with '?' as its text, except to its holder and the teacher. cards:reveal is a custom action: only the teacher gets true. The write rule for meta.revealed asks ctx.can('cards:reveal'), so the button and the server use one rule.",
		try: [
			'Ana sees her own card text and "?" on Ben’s card. Ben sees the opposite.',
			'In the left panel (teacher), press "Reveal cards". Both students now see both cards.',
		],
		panels: ['teacher', 'ana', 'ben'],
	},
	{
		title: 'Comments: add your own, manage any',
		rule: 'createCommentAuthorize answers comments:write, comments:edit, and comments:delete. It says true for the author. The classroom rules add: the teacher may delete any comment, and the bot may not comment.',
		try: [
			'Comment on the canvas as Ana (middle panel, comment tool).',
			'As Ben, reply. Ben cannot edit or delete Ana’s comment.',
			'As the teacher, delete Ana’s comment.',
		],
		panels: ['teacher', 'ana', 'ben'],
	},
	{
		title: 'Agents: write only inside a frame',
		rule: "The bot's actor has a frameId. A create or a move outside that frame is denied. Comments are denied for the bot.",
		try: [
			'In the right panel (bot), press "Run bot". It writes one box inside its frame and one outside.',
			'Only the box inside stays, and the reason shows under the header.',
		],
		panels: ['teacher', 'ana', 'bot'],
	},
	{
		title: 'The room is the boundary: editor checks off',
		rule: 'With editor checks off, the editor sends every write. The room runs the same rules, skips each denied record, and sends the reason back with the push result. The editor shows it as "The room denied".',
		try: [
			'In the middle panel (Ana, checks off), drag the teacher’s text. The room moves it back.',
			'The line under the header says "The room denied update: This is not your shape".',
		],
		panels: ['teacher', 'ana', 'ben'],
		checks: [true, false, true],
	},
	{
		title: 'A push that the room applies in part',
		rule: 'By default the room skips only the denied records of a push. With atomic pushes, one denied record rejects the whole push.',
		try: [
			'As Ana (checks off), draw a rectangle, then draw an arrow from it to the teacher’s text.',
			'The room keeps the arrow, but not its binding to the teacher’s text.',
			'Turn on "Atomic pushes" in the top bar (this resets the room), and do it again. The room rejects the whole arrow.',
		],
		panels: ['teacher', 'ana', 'ben'],
		checks: [true, false, true],
	},
]
