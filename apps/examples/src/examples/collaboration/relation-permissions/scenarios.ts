import {
	TLRelationTuple,
	attenuateCapabilityToken,
	createCapabilityToken,
	verifyCapabilityToken,
} from '@tldraw/sync'
import {
	Editor,
	PageRecordType,
	TLPageId,
	TLRecord,
	TLShapeId,
	createRelation,
	createShapeId,
	toRichText,
} from 'tldraw'
import { Identity, LocalClient, LocalRoom } from './localRoom'

export const ROOT = 'file:demo'
const PAGE = 'page:page' as TLPageId
// In a real app only the server knows this. The demo signs and checks tokens in the browser.
const SECRET = 'demo-secret'

export interface Person {
	name: string
	role: string
	color: string
	identity(): Promise<Identity>
}

export interface ScenarioEnv {
	room: LocalRoom
	clients: Record<string, LocalClient>
	editors: Record<string, Editor>
}

export interface Scenario {
	id: string
	title: string
	description: string
	/** What to do in the demo, and what to look for. */
	tryThis: string[]
	tuples: TLRelationTuple[]
	people: Person[]
	/** Run once by the first person (always an owner) when their editor mounts. */
	seed(editor: Editor): void
	controls: { label: string; run(env: ScenarioEnv): void | Promise<void> }[]
}

const user = (name: string, role: string, color: string): Person => ({
	name,
	role,
	color,
	identity: async () => ({ actor: `user:${name.toLowerCase()}` }),
})

async function fromToken(token: string): Promise<Identity> {
	const cap = await verifyCapabilityToken(token, SECRET)
	if (!cap) throw new Error('invalid token')
	return {
		actor: cap.actingFor ?? cap.subject,
		extraSubjects: [cap.subject],
		ceilings: [...(cap.ceilings ?? [])],
	}
}

const rel = (object: string, relation: string, subject: string) =>
	createRelation(object, relation, subject) as unknown as TLRecord

function label(editor: Editor, text: string, x: number, y: number, parentId?: TLShapeId) {
	editor.createShape({ type: 'text', x, y, parentId, props: { richText: toRichText(text) } })
}

function card(editor: Editor, id: TLShapeId, text: string, x: number, color: 'red' | 'blue') {
	editor.createShape({
		id,
		type: 'geo',
		x,
		y: 160,
		props: { w: 120, h: 170, richText: toRichText(text), color, fill: 'semi', size: 'xl' },
	})
}

const STUDENT_TOOLS = ['geo', 'note', 'text', 'arrow', 'frame', 'line', 'highlight']

export const scenarios: Scenario[] = [
	{
		id: 'roles',
		title: 'File roles',
		description:
			'Olivia owns the file, Ann edits, Ben views. Roles are tuples on the file. Shapes Ben cannot change are locked for him, and his tools are hidden. Change a role and every open session updates with no reconnect. Remove Ben and his session closes.',
		tryThis: [
			"Click Ben's rectangle. It is locked for him: he cannot select it to move or delete it, and his toolbar has no creating tools.",
			'Click Make Ben an editor. His badge, toolbar and rectangle unlock at once, with no reload.',
			'Click Remove Ben from the file. The server closes his session because he can read nothing.',
		],
		tuples: [
			{ object: ROOT, relation: 'owner', subject: 'user:olivia' },
			{ object: ROOT, relation: 'editor', subject: 'user:ann' },
			{ object: ROOT, relation: 'viewer', subject: 'user:ben' },
		],
		people: [
			user('Olivia', 'owner', '#e03131'),
			user('Ann', 'editor', '#1971c2'),
			user('Ben', 'viewer', '#2f9e44'),
		],
		seed(editor) {
			label(editor, 'Everyone can see this. Who can move it?', 40, 40)
			editor.createShape({ type: 'geo', x: 40, y: 120, props: { w: 200, h: 120, color: 'violet' } })
		},
		controls: [
			{
				label: 'Make Ben an editor',
				run: ({ room }) =>
					room.tuples.write({ object: ROOT, relation: 'editor', subject: 'user:ben' }),
			},
			{
				label: 'Make Ben a viewer again',
				run: ({ room }) =>
					room.tuples.delete({ object: ROOT, relation: 'editor', subject: 'user:ben' }),
			},
			{
				label: 'Remove Ben from the file',
				run: async ({ room }) => {
					await room.tuples.delete({ object: ROOT, relation: 'editor', subject: 'user:ben' })
					await room.tuples.delete({ object: ROOT, relation: 'viewer', subject: 'user:ben' })
				},
			},
		],
	},
	{
		id: 'classroom',
		title: 'Classroom',
		description:
			'Students may add shapes only inside their own area, and change only what they made. The teacher can open the whole board to the class, call on one student to edit everything, or limit students to the draw tool. Each change is one tuple.',
		tryThis: [
			"As Ann, draw inside Ann's area: it syncs to everyone. Try to draw outside it or in Ben's area: nothing is created.",
			'As the teacher, click Open the board to the class, then draw as Ann anywhere.',
			'Click Students may only draw. Both student toolbars lose every tool except draw and image.',
			"Call on Ann: she can now move Ben's shapes too. Release Ann to take it back.",
		],
		tuples: [
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'viewer', subject: 'team:class#member' },
			{ object: 'team:class', relation: 'member', subject: 'user:ann' },
			{ object: 'team:class', relation: 'member', subject: 'user:ben' },
		],
		people: [
			user('Teacher', 'owner', '#e03131'),
			user('Ann', 'student', '#1971c2'),
			user('Ben', 'student', '#2f9e44'),
		],
		seed(editor) {
			const ann = createShapeId('ann-area')
			const ben = createShapeId('ben-area')
			label(editor, 'Draw your answer in your area.', 40, 0)
			editor.run(() => {
				editor.createShape({
					id: ann,
					type: 'frame',
					x: 40,
					y: 60,
					props: { w: 320, h: 320, name: "Ann's area" },
				})
				editor.createShape({
					id: ben,
					type: 'frame',
					x: 400,
					y: 60,
					props: { w: 320, h: 320, name: "Ben's area" },
				})
				editor.store.put([rel(ann, 'contributor', 'user:ann'), rel(ben, 'contributor', 'user:ben')])
			})
		},
		controls: [
			{
				label: 'Open the board to the class',
				run: ({ room }) =>
					room.tuples.write({
						object: ROOT,
						relation: 'contributor',
						subject: 'team:class#member',
					}),
			},
			{
				label: 'Close the board',
				run: ({ room }) =>
					room.tuples.delete({
						object: ROOT,
						relation: 'contributor',
						subject: 'team:class#member',
					}),
			},
			{
				label: 'Call on Ann',
				run: ({ room }) =>
					room.tuples.write({ object: ROOT, relation: 'editor', subject: 'user:ann' }),
			},
			{
				label: 'Release Ann',
				run: ({ room }) =>
					room.tuples.delete({ object: ROOT, relation: 'editor', subject: 'user:ann' }),
			},
			{
				label: 'Students may only draw',
				run: ({ clients }) =>
					clients.Teacher.store.put(
						STUDENT_TOOLS.map((t) => rel(`shape_type:${t}`, 'restricted', 'team:class#member'))
					),
			},
			{
				label: 'Allow all tools',
				run: ({ clients }) =>
					clients.Teacher.store.remove(
						STUDENT_TOOLS.map((t) => rel(`shape_type:${t}`, 'restricted', 'team:class#member').id)
					),
			},
		],
	},
	{
		id: 'pages',
		title: 'Private pages',
		description:
			'Staff notes are hidden from students only. Answers are hidden from everyone but the owner until the teacher shares them. A page a session cannot read never reaches it: not the page, its shapes, or the cursors of people on it.',
		tryThis: [
			'Open the page menu (top left) in each column. The teacher sees three pages, the TA two, Ann one.',
			"Click Share answers with students. Answers appears in Ann's page menu; the TA still does not get it.",
			'Go to the Answers page as the teacher and move the cursor. Ann sees the cursor only while she can read the page.',
		],
		tuples: [
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'editor', subject: 'team:staff#member' },
			{ object: ROOT, relation: 'contributor', subject: 'team:students#member' },
			{ object: 'team:staff', relation: 'member', subject: 'user:ta' },
			{ object: 'team:students', relation: 'member', subject: 'user:ann' },
		],
		people: [
			user('Teacher', 'owner', '#e03131'),
			user('TA', 'staff', '#f08c00'),
			user('Ann', 'student', '#1971c2'),
		],
		seed(editor) {
			const notes = PageRecordType.createId('staff-notes')
			const answers = PageRecordType.createId('answers')
			editor.run(() => {
				editor.createPage({ id: notes, name: 'Staff notes' })
				editor.createPage({ id: answers, name: 'Answers' })
				editor.store.put([
					rel(notes, 'restricted', 'team:students#member'),
					rel(answers, 'restricted', '*'),
				])
			})
			editor.setCurrentPage(notes)
			label(editor, 'Ann is struggling with question 2.', 40, 40)
			editor.setCurrentPage(answers)
			label(editor, 'Answer to question 2: 42', 40, 40)
			editor.setCurrentPage(PAGE)
			label(editor, 'Question 2: what is six times seven?', 40, 40)
		},
		controls: [
			{
				label: 'Share answers with students',
				run: ({ clients }) =>
					clients.Teacher.store.put([
						rel(PageRecordType.createId('answers'), 'viewer', 'team:students#member'),
					]),
			},
			{
				label: 'Hide answers again',
				run: ({ clients }) =>
					clients.Teacher.store.remove([
						rel(PageRecordType.createId('answers'), 'viewer', 'team:students#member').id,
					]),
			},
			{
				label: 'Share answers with staff',
				run: ({ clients }) =>
					clients.Teacher.store.put([
						rel(PageRecordType.createId('answers'), 'viewer', 'team:staff#member'),
					]),
			},
		],
	},
	{
		id: 'links',
		title: 'Links and agents',
		description:
			'The guest opened a link that shares one page; a link is just a subject with tuples. The agent has a token that acts for Olivia, narrowed by a caveat to one frame. Anyone holding a token can narrow it, nobody can widen it. Run the agent: its writes inside the frame land. It then skips its client guard to write outside the frame, and the server denies that push.',
		tryThis: [
			"The guest's column has only the shared page. The rest of the file never reached that browser.",
			'Click Run the agent. Three shapes appear inside its frame. A moment later a red shape flashes outside the frame and is rolled back: the server denied it. See the server log.',
			"Click Revoke the link. The guest's session closes.",
		],
		tuples: [{ object: ROOT, relation: 'owner', subject: 'user:olivia' }],
		people: [
			user('Olivia', 'owner', '#e03131'),
			{
				name: 'Guest',
				role: 'link to one page',
				color: '#868e96',
				identity: async () =>
					fromToken(await createCapabilityToken({ subject: 'link:shared' }, SECRET)),
			},
			{
				name: 'Agent',
				role: 'acts for Olivia, one frame',
				color: '#7048e8',
				identity: async () => {
					const broad = await createCapabilityToken(
						{ subject: 'agent:helper', actingFor: 'user:olivia' },
						SECRET
					)
					return fromToken(
						await attenuateCapabilityToken(broad, { within: [createShapeId('agent-area')] })
					)
				},
			},
		],
		seed(editor) {
			const shared = PageRecordType.createId('shared')
			editor.run(() => {
				editor.createPage({ id: shared, name: 'Shared page' })
				editor.store.put([rel(shared, 'viewer', 'link:shared')])
			})
			editor.setCurrentPage(shared)
			label(editor, 'Only this page is shared by the link.', 40, 40)
			editor.setCurrentPage(PAGE)
			label(editor, 'Not shared. The guest never receives this page.', 40, 0)
			editor.createShape({
				id: createShapeId('agent-area'),
				type: 'frame',
				x: 40,
				y: 60,
				props: { w: 360, h: 300, name: 'Agent area' },
			})
		},
		controls: [
			{
				label: 'Run the agent',
				run: ({ editors, clients }) => {
					const agent = editors.Agent
					if (!agent) return
					agent.setCurrentPage(PAGE)
					const area = createShapeId('agent-area')
					for (let i = 0; i < 3; i++) {
						agent.createShape({
							type: 'geo',
							parentId: area,
							x: 20 + i * 110,
							y: 40 + Math.random() * 160,
							props: { w: 90, h: 60, color: 'violet', fill: 'solid' },
						})
					}
					// The client guard would block this write. Skip it, as a modified client would: the
					// server denies the push and the shape rolls back. It is sent later, in its own push,
					// because a push is all or nothing and would take the shapes above with it.
					setTimeout(() => {
						clients.Agent.forge(() =>
							agent.createShape({
								type: 'geo',
								x: 500,
								y: 100,
								props: { color: 'red', fill: 'solid' },
							})
						)
					}, 800)
				},
			},
			{
				label: 'Revoke the link',
				run: ({ clients }) =>
					clients.Olivia.store.remove([
						rel(PageRecordType.createId('shared'), 'viewer', 'link:shared').id,
					]),
			},
		],
	},
	{
		id: 'reveal',
		title: 'Reveal and cards',
		description:
			'Step 2 is a restricted frame: nobody but the dealer receives it or its contents until it is revealed. Each card is readable only by its holder. Turning a card over is one tuple: viewer for everyone.',
		tryThis: [
			'Each player sees only their own card, and nobody but the dealer sees step 2.',
			'Click Reveal step 2, then Turn the cards over. Each is one grant, and the hidden records arrive.',
		],
		tuples: [
			{ object: ROOT, relation: 'owner', subject: 'user:dealer' },
			{ object: ROOT, relation: 'viewer', subject: 'user:ann' },
			{ object: ROOT, relation: 'viewer', subject: 'user:ben' },
		],
		people: [
			user('Dealer', 'owner', '#e03131'),
			user('Ann', 'player', '#1971c2'),
			user('Ben', 'player', '#2f9e44'),
		],
		seed(editor) {
			const step2 = createShapeId('step-2')
			const annCard = createShapeId('ann-card')
			const benCard = createShapeId('ben-card')
			label(editor, 'Step 1: everyone sees this.', 40, 0)
			editor.run(() => {
				editor.createShape({
					id: step2,
					type: 'frame',
					x: 420,
					y: 40,
					props: { w: 300, h: 100, name: 'Step 2' },
				})
				label(editor, 'Step 2: the hidden part.', 20, 30, step2)
				card(editor, annCard, 'A♠', 40, 'blue')
				card(editor, benCard, 'K♥', 200, 'red')
				editor.store.put([
					rel(step2, 'restricted', '*'),
					rel(annCard, 'restricted', '*'),
					rel(annCard, 'viewer', 'user:ann'),
					rel(benCard, 'restricted', '*'),
					rel(benCard, 'viewer', 'user:ben'),
				])
			})
		},
		controls: [
			{
				label: 'Reveal step 2',
				run: ({ clients }) =>
					clients.Dealer.store.remove([rel(createShapeId('step-2'), 'restricted', '*').id]),
			},
			{
				label: 'Turn the cards over',
				run: ({ clients }) =>
					clients.Dealer.store.put([
						rel(createShapeId('ann-card'), 'viewer', '*'),
						rel(createShapeId('ben-card'), 'viewer', '*'),
					]),
			},
		],
	},
]
