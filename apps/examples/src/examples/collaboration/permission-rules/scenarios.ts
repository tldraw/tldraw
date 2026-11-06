import { TLRuleUser, TLRulesDefinition, useCaseRules } from '@tldraw/rules'
import { Editor, PageRecordType, TLPageId, createShapeId, toRichText } from 'tldraw'

export interface Scenario {
	id: string
	title: string
	/** What to try, in one or two sentences. */
	tryThis: string
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
		tryThis:
			'Students see only the student tools and can draw only in their own frame. Try to move Ann’s drawing into Bob’s frame, or to edit the teacher’s note. The teacher can lock the lesson: every student’s tools go away at once.',
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
		tryThis:
			'Switch the guest between view, comment, and edit. The change is live: no reconnect. A viewer’s editor is read-only because the rules allow no shape write, not because of a flag.',
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
		tryThis:
			'The outsider’s page menu has no “Red team” page: the room never sent it, or its shapes, or the cursors of people on it. Add the outsider to the team and the page arrives live.',
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
		tryThis:
			'Each player sees only their own card, and nobody but the dealer sees inside the hidden frame. The dealer reveals, and the records arrive for everyone. Players can move their own cards, nothing else.',
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
		tryThis:
			'The agent sees only its frame. Run the agent: it adds notes in its frame, and its writes outside the frame and its delete are stopped, each with the rule’s reason.',
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
			show: (editor) => editor.rules.getUser().role === 'agent',
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
