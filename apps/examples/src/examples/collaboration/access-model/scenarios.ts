import {
	AccessEntry,
	AccessModel,
	DocumentRecordType,
	Editor,
	PageRecordType,
	SessionAccess,
	TLAccessEntry,
	TLDOCUMENT_ID,
	TLPageId,
	TLRecord,
	TLShapeId,
	TL_ACCESS_ROOT,
	createAccessEntry,
	createShapeId,
	createTLAccessModel,
	toRichText,
} from 'tldraw'

// Each scenario is one use case: a model, a seeded room, the people in it, and buttons that
// change access while you watch. Everything else (what each pane may see, select, draw, and
// what the server rejects) comes from the model alone.

export interface Actor {
	id: string
	name: string
	color: string
	/** Roles on the room root, from the "host" (a real app reads them from its database). */
	roles: string[]
	groups?: string[]
	/** A ceiling: an anonymous link, a read-only token, an agent's token. */
	limit?: string[]
	/** Signed out: the actor has no id, so it owns nothing and matches only `anyone`. */
	anonymous?: boolean
}

export interface ScenarioAction {
	label: string
	/** Run in this actor's editor, so the write goes through the model like any other. */
	by?: string
	run(ctx: ActionContext): void
}

export interface ActionContext {
	editor(actorId: string): Editor | undefined
	setActor(actorId: string, change: Partial<Actor>): void
	actor(actorId: string): Actor
}

export interface Scenario {
	id: string
	title: string
	summary: string
	tryThis: string[]
	model: AccessModel<TLRecord>
	records(): TLRecord[]
	actors: Actor[]
	actions: ScenarioAction[]
	comments?: boolean
}

export function sessionAccessFor(actor: Actor): SessionAccess {
	const id = actor.anonymous ? null : actor.id
	return {
		actor: { id, groups: actor.groups ?? [] },
		entries: [
			{
				resource: TL_ACCESS_ROOT,
				subject: id ? { type: 'user', id } : { type: 'anyone' },
				effect: 'allow',
				verbs: actor.roles,
			},
		],
		limit: actor.limit ?? null,
	}
}

const PAGE = 'page:board' as TLPageId
const ownersEdit: AccessEntry = {
	resource: TL_ACCESS_ROOT,
	subject: { type: 'relation', relation: 'owner' },
	effect: 'allow',
	verbs: ['update', 'delete'],
}

let index = 0
const nextIndex = () => `a${(++index).toString(36).padStart(3, '0')}` as any

function base(pages: { id: string; name: string }[] = [{ id: PAGE, name: 'Board' }]): TLRecord[] {
	index = 0
	return [
		DocumentRecordType.create({ id: TLDOCUMENT_ID }),
		...pages.map((p) =>
			PageRecordType.create({ id: p.id as TLPageId, name: p.name, index: nextIndex() })
		),
	]
}

function box(
	id: string,
	opts: {
		x: number
		y: number
		w?: number
		h?: number
		label?: string
		owner?: string
		color?: string
		parent?: string
	}
): TLRecord {
	return {
		id: createShapeId(id),
		typeName: 'shape',
		type: 'geo',
		x: opts.x,
		y: opts.y,
		rotation: 0,
		index: nextIndex(),
		parentId: (opts.parent ?? PAGE) as any,
		isLocked: false,
		opacity: 1,
		meta: opts.owner ? { ownerId: opts.owner } : {},
		props: {
			geo: 'rectangle',
			dash: 'draw',
			url: '',
			w: opts.w ?? 160,
			h: opts.h ?? 100,
			growY: 0,
			scale: 1,
			flipX: false,
			flipY: false,
			labelColor: 'black',
			color: (opts.color ?? 'black') as any,
			fill: 'semi',
			size: 'm',
			font: 'draw',
			align: 'middle',
			verticalAlign: 'middle',
			richText: toRichText(opts.label ?? ''),
		},
	} as TLRecord
}

function frame(
	id: string,
	opts: { x: number; y: number; w: number; h: number; name: string }
): TLRecord {
	return {
		id: createShapeId(id),
		typeName: 'shape',
		type: 'frame',
		x: opts.x,
		y: opts.y,
		rotation: 0,
		index: nextIndex(),
		parentId: PAGE,
		isLocked: false,
		opacity: 1,
		meta: {},
		props: { w: opts.w, h: opts.h, name: opts.name, color: 'black' },
	} as TLRecord
}

function entry(id: string, e: Omit<AccessEntry, 'verbs'> & { verbs: string[] }): TLRecord {
	return createAccessEntry({
		...e,
		id: `access:${id}` as TLAccessEntry['id'],
	}) as unknown as TLRecord
}

const shape = (id: string) => createShapeId(id) as TLShapeId

function put(editor: Editor | undefined, records: TLRecord[]) {
	editor?.run(() => editor.store.put(records))
}
function remove(editor: Editor | undefined, ids: string[]) {
	editor?.run(() => editor.store.remove(ids as any))
}

export const scenarios: Scenario[] = [
	{
		id: 'links',
		title: 'Share links',
		summary:
			'The owner shares one room through links. Each link is a role on the room root. An anonymous visitor has a ceiling: no link can lift it above viewer.',
		tryThis: [
			'Draw as the owner and the editor link; the viewer link sees it live but has no drawing tools.',
			'Press "Make the link an edit link". The guest still cannot edit: the anonymous ceiling wins. The pane says why.',
			'Press "Guest signs in". The ceiling goes away and the toolbar appears, with no reconnect.',
		],
		model: createTLAccessModel(),
		records: () => [
			...base(),
			box('a', { x: 80, y: 80, label: 'Plan', color: 'blue' }),
			box('b', { x: 300, y: 80, label: 'Build', color: 'green' }),
		],
		actors: [
			{ id: 'olive', name: 'Owner', color: '#4465E9', roles: ['admin'] },
			{ id: 'eli', name: 'Edit link', color: '#0E9F6E', roles: ['editor'] },
			{
				id: 'guest',
				name: 'View link (anonymous)',
				color: '#9C1FBE',
				roles: ['viewer'],
				anonymous: true,
				limit: ['viewer'],
			},
		],
		actions: [
			{
				label: 'Make the link an edit link',
				run: (c) => c.setActor('guest', { roles: ['editor'] }),
			},
			{
				label: 'Guest signs in',
				run: (c) =>
					c.setActor('guest', { anonymous: false, limit: undefined, name: 'Guest (signed in)' }),
			},
			{
				label: 'Reset the guest',
				run: (c) =>
					c.setActor('guest', {
						roles: ['viewer'],
						anonymous: true,
						limit: ['viewer'],
						name: 'View link (anonymous)',
					}),
			},
		],
	},
	{
		id: 'classroom',
		title: 'Classroom: edit your own shapes',
		summary:
			'Students may create shapes and edit only their own (an "owner" entry on the root). Other people’s shapes behave as locked. The teacher can lock the board for all students with one deny entry, or call on one student.',
		tryThis: [
			'Draw as Bob, then try to drag the teacher’s shape: it cannot be selected.',
			'As the teacher, press "Lock the board". Students lose their tools; the teacher keeps them.',
			'Press "Call on Bob": Bob becomes an editor live and can move anything.',
		],
		model: createTLAccessModel({
			roles: { student: ['viewer', 'comment', 'create'], teacher: ['admin'] },
			entries: [ownersEdit],
		}),
		records: () => [
			...base(),
			box('lesson', {
				x: 80,
				y: 60,
				w: 360,
				h: 80,
				label: 'Draw a cat',
				owner: 'tess',
				color: 'violet',
			}),
			box('bobs', { x: 80, y: 200, label: 'Bob’s', owner: 'bob', color: 'orange' }),
			box('anns', { x: 300, y: 200, label: 'Ann’s', owner: 'ann', color: 'green' }),
		],
		actors: [
			{ id: 'tess', name: 'Teacher', color: '#9C1FBE', roles: ['teacher'] },
			{
				id: 'bob',
				name: 'Bob (student)',
				color: '#E16919',
				roles: ['student'],
				groups: ['students'],
			},
			{
				id: 'ann',
				name: 'Ann (student)',
				color: '#0E9F6E',
				roles: ['student'],
				groups: ['students'],
			},
		],
		actions: [
			{
				label: 'Lock the board',
				by: 'tess',
				run: (c) =>
					put(c.editor('tess'), [
						entry('lock', {
							resource: TL_ACCESS_ROOT,
							subject: { type: 'group', id: 'students' },
							effect: 'deny',
							verbs: ['create', 'update', 'delete'],
						}),
					]),
			},
			{ label: 'Unlock', by: 'tess', run: (c) => remove(c.editor('tess'), ['access:lock']) },
			{ label: 'Call on Bob', run: (c) => c.setActor('bob', { roles: ['editor'] }) },
			{ label: 'Bob sits down', run: (c) => c.setActor('bob', { roles: ['student'] }) },
		],
	},
	{
		id: 'areas',
		title: 'Areas: edit inside your frame',
		summary:
			'Students view the room, and each has an "editor" entry on one frame. They draw only inside it. A move is checked at the old place and the new place, so a shape cannot leave the frame or enter another.',
		tryThis: [
			'As Bob, draw inside "Bob’s area": it works. Draw outside: the shape is rolled back, and the pane says why.',
			'Drag Bob’s shape toward Ann’s frame: the move is rolled back.',
			'Press "Give Bob’s area to Ann": the teacher moves the entry, and the tools follow.',
		],
		model: createTLAccessModel(),
		records: () => [
			...base(),
			frame('bobArea', { x: 40, y: 40, w: 300, h: 260, name: 'Bob’s area' }),
			frame('annArea', { x: 380, y: 40, w: 300, h: 260, name: 'Ann’s area' }),
			box('bobShape', {
				x: 40,
				y: 60,
				w: 120,
				h: 80,
				label: 'Bob',
				owner: 'bob',
				parent: shape('bobArea'),
				color: 'orange',
			}),
			entry('bobArea', {
				resource: shape('bobArea'),
				subject: { type: 'user', id: 'bob' },
				effect: 'allow',
				verbs: ['editor'],
			}),
			entry('annArea', {
				resource: shape('annArea'),
				subject: { type: 'user', id: 'ann' },
				effect: 'allow',
				verbs: ['editor'],
			}),
		],
		actors: [
			{ id: 'tess', name: 'Teacher', color: '#9C1FBE', roles: ['admin'] },
			{ id: 'bob', name: 'Bob', color: '#E16919', roles: ['viewer'] },
			{ id: 'ann', name: 'Ann', color: '#0E9F6E', roles: ['viewer'] },
		],
		actions: [
			{
				label: 'Give Bob’s area to Ann',
				by: 'tess',
				run: (c) => {
					const editor = c.editor('tess')
					const prev = editor?.store.get('access:bobArea' as any) as unknown as TLAccessEntry
					if (prev) put(editor, [{ ...prev, subject: { type: 'user', id: 'ann' } } as any])
				},
			},
			{
				label: 'Give it back',
				by: 'tess',
				run: (c) => {
					const editor = c.editor('tess')
					const prev = editor?.store.get('access:bobArea' as any) as unknown as TLAccessEntry
					if (prev) put(editor, [{ ...prev, subject: { type: 'user', id: 'bob' } } as any])
				},
			},
		],
	},
	{
		id: 'private-page',
		title: 'Private page for a team',
		summary:
			'A "block" entry for anyone plus an "allow" entry for the team make a page private. The server does not send the page, its shapes, or entries on it to anyone else: it is not in their store at all.',
		tryThis: [
			'Open the page menu in each pane: only Tess sees "Team only".',
			'As Tess, press "Share the team page with Gus". The page and its shapes arrive in Gus’s store live.',
			'Press "Unshare": they are removed from Gus’s store again.',
		],
		model: createTLAccessModel(),
		records: () => [
			...base([
				{ id: PAGE, name: 'Board' },
				{ id: 'page:team', name: 'Team only' },
			]),
			box('public', { x: 80, y: 80, label: 'Everyone sees this', color: 'blue' }),
			box('secret', {
				x: 80,
				y: 80,
				label: 'Roadmap (team only)',
				color: 'red',
				parent: 'page:team',
			}),
			entry('teamBlock', {
				resource: 'page:team',
				subject: { type: 'anyone' },
				effect: 'block',
				verbs: ['admin'],
			}),
			entry('team', {
				resource: 'page:team',
				subject: { type: 'group', id: 'team' },
				effect: 'allow',
				verbs: ['admin'],
			}),
		],
		actors: [
			{ id: 'tess', name: 'Tess (team)', color: '#9C1FBE', roles: ['admin'], groups: ['team'] },
			{ id: 'gus', name: 'Gus (guest editor)', color: '#E16919', roles: ['editor'] },
		],
		actions: [
			{
				label: 'Share the team page with Gus',
				by: 'tess',
				run: (c) =>
					put(c.editor('tess'), [
						entry('gus', {
							resource: 'page:team',
							subject: { type: 'user', id: 'gus' },
							effect: 'allow',
							verbs: ['viewer'],
						}),
					]),
			},
			{ label: 'Unshare', by: 'tess', run: (c) => remove(c.editor('tess'), ['access:gus']) },
		],
	},
	{
		id: 'poker',
		title: 'Hidden cards and reveal',
		summary:
			'Each card has a "block read" entry for anyone and an "allow read" entry for its holder. The dealer reveals cards by deleting the block entries. A card someone may not read never reaches their store.',
		tryThis: [
			'Each player sees only their own card. The dealer sees all of them.',
			'Press "Reveal" as the dealer: the cards arrive in every store at once.',
			'Press "Hide again".',
		],
		model: createTLAccessModel(),
		records: () => [
			...base(),
			box('annCard', { x: 80, y: 120, w: 120, h: 170, label: 'A♠ (Ann)', color: 'green' }),
			box('bobCard', { x: 260, y: 120, w: 120, h: 170, label: 'K♥ (Bob)', color: 'red' }),
			...hiddenCards(),
		],
		actors: [
			{ id: 'dealer', name: 'Dealer', color: '#4465E9', roles: ['admin'] },
			{ id: 'ann', name: 'Ann', color: '#0E9F6E', roles: ['viewer'] },
			{ id: 'bob', name: 'Bob', color: '#E16919', roles: ['viewer'] },
		],
		actions: [
			{
				label: 'Reveal',
				by: 'dealer',
				run: (c) => remove(c.editor('dealer'), ['access:annCardBlock', 'access:bobCardBlock']),
			},
			{
				label: 'Hide again',
				by: 'dealer',
				run: (c) =>
					put(
						c.editor('dealer'),
						hiddenCards().filter((r) => r.id.endsWith('Block'))
					),
			},
		],
	},
	{
		id: 'comments',
		title: 'Comments: your own, or all',
		summary:
			'Commenters add comments and manage only their own: the model gives "comment:edit" to each comment’s owner. Admins have "comment:edit" in their role, so they manage all. Viewers read threads but cannot post.',
		tryThis: [
			'Pick the comment tool as Bob and add a comment. Then open Ann’s thread: Bob can reply, but cannot edit or delete Ann’s comment.',
			'As the admin, delete any comment.',
			'The viewer sees every thread but has no composer.',
		],
		comments: true,
		model: createTLAccessModel(),
		records: () => [
			...base(),
			box('topic', { x: 80, y: 80, w: 240, label: 'Q3 plan', color: 'blue' }),
		],
		actors: [
			{ id: 'ada', name: 'Admin', color: '#4465E9', roles: ['admin'] },
			{ id: 'bob', name: 'Bob (commenter)', color: '#E16919', roles: ['commenter'] },
			{ id: 'ann', name: 'Ann (commenter)', color: '#0E9F6E', roles: ['commenter'] },
			{ id: 'vic', name: 'Viewer', color: '#9C1FBE', roles: ['viewer'] },
		],
		actions: [],
	},
	{
		id: 'agent',
		title: 'Agent with a capped token',
		summary:
			'An agent acts as its own actor. An entry lets it edit one frame, and its token caps it at view, create, and update: no delete, whatever it is granted.',
		tryThis: [
			'Press "Agent: add a note in its area": it works.',
			'Press "Agent: delete everything": the server and the editor deny it. The pane shows the ceiling as the reason.',
			'Press "Agent: draw outside its area": rolled back.',
		],
		model: createTLAccessModel(),
		records: () => [
			...base(),
			frame('agentArea', { x: 360, y: 40, w: 320, h: 280, name: 'Agent area' }),
			box('human', { x: 60, y: 80, label: 'Human work', owner: 'olive', color: 'blue' }),
			entry('agent', {
				resource: shape('agentArea'),
				subject: { type: 'user', id: 'agent' },
				effect: 'allow',
				verbs: ['editor'],
			}),
		],
		actors: [
			{ id: 'olive', name: 'Owner', color: '#4465E9', roles: ['admin'] },
			{
				id: 'agent',
				name: 'Agent (token: view, create, update)',
				color: '#E16919',
				roles: ['viewer'],
				limit: ['viewer', 'create', 'update'],
			},
		],
		actions: [
			{
				label: 'Agent: add a note in its area',
				by: 'agent',
				run: (c) =>
					c.editor('agent')?.createShape({
						type: 'geo',
						parentId: shape('agentArea'),
						x: 20 + Math.random() * 160,
						y: 40 + Math.random() * 120,
						props: { w: 100, h: 60, color: 'orange', richText: toRichText('agent') },
					}),
			},
			{
				label: 'Agent: delete everything',
				by: 'agent',
				run: (c) => {
					const e = c.editor('agent')
					e?.run(() => e.deleteShapes([...e.getCurrentPageShapeIds()]), { ignoreShapeLock: true })
				},
			},
			{
				label: 'Agent: draw outside its area',
				by: 'agent',
				run: (c) =>
					c.editor('agent')?.createShape({ type: 'geo', x: 60, y: 260, props: { w: 100, h: 60 } }),
			},
		],
	},
]

function hiddenCards(): TLRecord[] {
	const cards: [string, string][] = [
		['annCard', 'ann'],
		['bobCard', 'bob'],
	]
	return cards.flatMap(([card, holder]) => [
		entry(`${card}Block`, {
			resource: shape(card),
			subject: { type: 'anyone' },
			effect: 'block',
			verbs: ['read'],
		}),
		entry(`${card}Holder`, {
			resource: shape(card),
			subject: { type: 'user', id: holder },
			effect: 'allow',
			verbs: ['read'],
		}),
		entry(`${card}Dealer`, {
			resource: shape(card),
			subject: { type: 'user', id: 'dealer' },
			effect: 'allow',
			verbs: ['admin'],
		}),
	])
}
