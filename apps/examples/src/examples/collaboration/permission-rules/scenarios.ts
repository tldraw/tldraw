import { TLRuleUser, TLRulesDefinition, useCaseRules } from '@tldraw/rules'
import { Editor, PageRecordType, TLPageId, createShapeId, toRichText } from 'tldraw'

export interface Step {
	/** What to do, and in which pane. */
	do: string
	/** What you see, and which part of the rules causes it. */
	see: string
}

export interface Scenario {
	id: string
	title: string
	/** The use case, in one sentence. */
	summary: string
	/** A walkthrough: do this, see that. */
	steps: Step[]
	/** The parts of the rules this scenario is about, as `let`, `types.shape`, … */
	rulePaths: string[]
	rules: TLRulesDefinition
	/** The people a pane can be. Switching changes the session's user facts live. */
	users: { label: string; user: TLRuleUser }[]
	/** Which user each pane starts as, by index into `users`. */
	panes: number[]
	seed(editor: Editor): void
	/** A host action, shown in panes whose user may do it. */
	action?: { label: string; show(editor: Editor): boolean; run(editor: Editor): void }
}

const note = (
	editor: Editor,
	id: string,
	x: number,
	y: number,
	text: string,
	meta = {},
	parentId?: any
) =>
	editor.createShape({
		id: createShapeId(id),
		type: 'note',
		x,
		y,
		parentId,
		props: { richText: toRichText(text) },
		meta,
	})

const frame = (editor: Editor, id: string, x: number, y: number, name: string, meta = {}) =>
	editor.createShape({
		id: createShapeId(id),
		type: 'frame',
		x,
		y,
		props: { w: 420, h: 320, name },
		meta,
	})

export const scenarios: Scenario[] = [
	{
		id: 'classroom',
		title: 'Classroom',
		summary:
			'Shape-level write control: students draw only in their own frame, with student tools, and change only their own shapes. The teacher can do anything, and can lock the lesson.',
		steps: [
			{
				do: 'In Ann’s pane, pick the draw tool and draw inside the frame named “Ann”.',
				see: 'The stroke stays, in every pane. The room stamped meta.ownerId: "ann" on it from Ann’s user facts (stamp), so her client could not claim to be someone else.',
			},
			{
				do: 'In Ann’s pane, draw outside her frame, or in Bob’s.',
				see: 'No stroke. The bar under her pane shows the rule’s message and why: the inMyFrame clause was false. The write never left her editor.',
			},
			{
				do: 'Look at Ann’s toolbar, then the teacher’s.',
				see: 'Ann has no frame or line tool: the analyzer proved that studentTool can never be true for them. The teacher has every tool. See the table in the side panel.',
			},
			{
				do: 'Try to move the teacher’s note, or Bob’s frame, in Ann’s pane.',
				see: 'They act as locked: the update rule needs mine, and Ann does not own them.',
			},
			{
				do: 'In the teacher’s pane, press “Lock / unlock lesson”.',
				see: 'Both students go read-only at once and lose their tools (locked reads the document record). Press it again to unlock.',
			},
		],
		rulePaths: ['let', 'actions', 'types.shape'],
		rules: useCaseRules.classroom,
		users: [
			{ label: 'Teacher', user: { id: 'teacher', role: 'teacher' } },
			{ label: 'Ann (student)', user: { id: 'ann', role: 'student' } },
			{ label: 'Bob (student)', user: { id: 'bob', role: 'student' } },
		],
		panes: [0, 1, 2],
		seed(editor) {
			frame(editor, 'ann-frame', 0, 0, 'Ann', { assignee: 'ann', ownerId: 'teacher' })
			frame(editor, 'bob-frame', 480, 0, 'Bob', { assignee: 'bob', ownerId: 'teacher' })
			note(editor, 'task', 0, -260, 'Draw a cat in your frame', { ownerId: 'teacher' })
		},
		action: {
			label: 'Lock / unlock lesson',
			show: (editor) => editor.rules.can('lesson:lock'),
			run(editor) {
				const locked = editor.getDocumentSettings().meta.locked === true
				editor.updateDocumentSettings({ meta: { locked: !locked } })
			},
		},
	},
	{
		id: 'share-links',
		title: 'Share links',
		summary:
			'File-level read and write control for a share link: view, comment, or edit. Access changes apply live.',
		steps: [
			{
				do: 'The guest starts on “view”. Try to move a shape in the guest’s pane.',
				see: 'Nothing moves, and the pane says “read-only (derived)”. No flag was set: default.write allows a viewer no shape write, so the editor derives read-only.',
			},
			{
				do: 'Switch the guest to “comment”.',
				see: 'The canvas stays read-only. The comment rules (canComment) now allow comment records, stamped with the guest’s own id. This demo has no comment UI; the backtests cover comments.',
			},
			{
				do: 'Switch the guest to “edit”.',
				see: 'The toolbar comes back and the guest can draw. There was no reconnect: the room sent the new user facts and the editor re-derived everything.',
			},
			{
				do: 'Switch the guest to “Anonymous: edit”.',
				see: 'They can edit the canvas. A comment’s authorId is stamped from user.id, and a stamp that has no value denies, so an anonymous person cannot comment.',
			},
		],
		rulePaths: ['let', 'default', 'types.comment'],
		rules: useCaseRules.shareLinks,
		users: [
			{ label: 'Owner', user: { id: 'owner', access: 'edit', role: 'owner' } },
			{ label: 'Guest: view', user: { id: 'guest', access: 'view' } },
			{ label: 'Guest: comment', user: { id: 'guest', access: 'comment' } },
			{ label: 'Guest: edit', user: { id: 'guest', access: 'edit' } },
			{ label: 'Anonymous: edit', user: { id: null, access: 'edit' } },
		],
		panes: [0, 1],
		seed(editor) {
			note(editor, 'hello', 0, 0, 'Shared with a link')
			editor.createShape({ type: 'geo', x: 260, y: 0, props: { w: 200, h: 120 } })
		},
	},
	{
		id: 'team-pages',
		title: 'Team pages',
		summary:
			'Page-level read control: a page with meta.team is sent only to people on that team, with its shapes and the cursors of people on it.',
		steps: [
			{
				do: 'Open the page menu in the outsider’s pane. Compare the record counts in the two pane headers.',
				see: 'The outsider has no “Red team only” page. The room never sent it, its shapes, or the cursors of people on it (page.read, shape.read, instance_presence.read).',
			},
			{
				do: 'Switch the outsider to “Outsider, now on red”.',
				see: 'The page and its shapes arrive live, in one patch.',
			},
			{
				do: 'Switch them back to “Outsider”.',
				see: 'The page and its shapes are removed from that pane. Only the records whose rules read the team page were checked again.',
			},
		],
		rulePaths: ['let', 'types.page', 'types.shape', 'types.instance_presence'],
		rules: useCaseRules.teamPages,
		users: [
			{ label: 'Red team member', user: { id: 'rita', teams: ['red'] } },
			{ label: 'Outsider', user: { id: 'otto', teams: [] } },
			{ label: 'Outsider, now on red', user: { id: 'otto', teams: ['red'] } },
		],
		panes: [0, 1],
		seed(editor) {
			note(editor, 'public', 0, 0, 'Everyone sees this page')
			const secret = PageRecordType.createId('red')
			editor.createPage({ id: secret, name: 'Red team only', meta: { team: 'red' } })
			editor.setCurrentPage(secret as TLPageId)
			note(editor, 'plan', 0, 0, 'Launch plan: Friday')
			editor.setCurrentPage(editor.getPages()[0].id)
		},
	},
	{
		id: 'reveal',
		title: 'Cards and reveal',
		summary:
			'Field-level and shape-level read control: everyone sees the cards, but only the holder sees a card’s face. A hidden frame is not sent at all.',
		steps: [
			{
				do: 'Compare Ann’s and Bob’s panes.',
				see: 'Both see both cards. Each sees the face of their own card only. The other card shows 🂠: the room sent that in place of the real text (fields). Neither sees the “Answer” frame (shape.read).',
			},
			{
				do: 'In Bob’s pane, drag Bob’s card. Then try to drag Ann’s card.',
				see: 'Bob’s card moves for everyone, and Ann still sees it face down. Ann’s card does not move for Bob: players may move only their own cards (update).',
			},
			{
				do: 'In the dealer’s pane, press “Reveal everything”.',
				see: 'The faces and the frame with its note arrive in every pane, live.',
			},
		],
		rulePaths: ['let', 'types.shape'],
		rules: useCaseRules.reveal,
		users: [
			{ label: 'Dealer', user: { id: 'dealer', role: 'dealer' } },
			{ label: 'Ann', user: { id: 'ann', role: 'player' } },
			{ label: 'Bob', user: { id: 'bob', role: 'player' } },
		],
		panes: [0, 1, 2],
		seed(editor) {
			note(editor, 'ann-card', 0, 0, 'Ann: ace of spades', { holder: 'ann' })
			note(editor, 'bob-card', 260, 0, 'Bob: two of clubs', { holder: 'bob' })
			frame(editor, 'answer', 0, 280, 'Answer', { hidden: true })
			note(editor, 'answer-text', 40, 60, '42', {}, createShapeId('answer'))
		},
		action: {
			label: 'Reveal everything',
			show: (editor) => editor.rules.can('cards:reveal'),
			run(editor) {
				editor.updateShapes(
					editor
						.getCurrentPageShapes()
						.filter((s) => s.meta.holder || s.meta.hidden)
						.map((s) => ({ ...s, meta: { ...s.meta, hidden: false, revealed: true } }))
				)
			},
		},
	},
	{
		id: 'agent',
		title: 'Agent in a frame',
		summary:
			'An agent limited to one area: it reads only its frame, creates only a few shape types there, and never deletes.',
		steps: [
			{
				do: 'Look at the agent’s pane.',
				see: 'Only the frame. The note “Not for the agent” and the human’s cursor were never sent (shape.read, instance_presence.read).',
			},
			{
				do: 'In the agent’s pane, press “Run the agent”.',
				see: 'A note appears in the frame, in both panes. Then its note outside the frame is stopped, and then its delete. The bar shows the reason each time.',
			},
		],
		rulePaths: ['let', 'actions', 'types.shape', 'types.instance_presence'],
		rules: useCaseRules.agent,
		users: [
			{ label: 'Human', user: { id: 'human', role: 'human' } },
			{ label: 'Agent', user: { id: 'bot', role: 'agent', area: createShapeId('zone') } },
		],
		panes: [0, 1],
		seed(editor) {
			frame(editor, 'zone', 0, 0, 'Agent works here')
			note(editor, 'private', 520, 0, 'Not for the agent')
		},
		action: {
			label: 'Run the agent',
			show: (editor) => editor.rules.can('agent:run'),
			run(editor) {
				// a scripted "agent": three writes, through the same editor API a real one would use
				const zone = createShapeId('zone')
				const inside = createShapeId('agent-' + Date.now())
				editor.createShape({
					id: inside,
					type: 'note',
					parentId: zone,
					x: 40 + Math.random() * 200,
					y: 60 + Math.random() * 120,
					props: { richText: toRichText('Agent idea') },
				})
				setTimeout(() => {
					editor.createShape({
						type: 'note',
						x: 900,
						y: 0,
						props: { richText: toRichText('Escape!') },
					})
				}, 600)
				setTimeout(() => editor.deleteShapes([inside]), 1600)
			},
		},
	},
]
