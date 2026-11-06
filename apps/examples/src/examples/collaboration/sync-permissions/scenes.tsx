import { TLBeforeWriteHooks } from '@tldraw/sync'
import { createCommentAuthorizers } from '@tldraw/sync-collaboration'
import {
	Editor,
	PageRecordType,
	TLDOCUMENT_ID,
	TLDocument,
	TLFrameShape,
	TLGeoShape,
	TLPage,
	TLRecord,
	TLShape,
	TLShapePartial,
	createShapeId,
	getIndexAbove,
	toRichText,
} from 'tldraw'
import { Get, Meta, Rule, ancestors, bothSides, inherited, isShape, log, pageOf } from './access'
import { DemoUser, Scene, allow, defineScene, deny } from './scene'
import { CardShape } from './shapes'
import { Action, Check, Segmented } from './ui'

const sid = (name: string) => createShapeId(name)

const user = (id: string, name: string, color: string): DemoUser => ({ id, name, color })
const teacher = user('tess', 'Tess (teacher)', '#e03131')
const sam = user('sam', 'Sam (student)', '#1971c2')
const sky = user('sky', 'Sky (student)', '#2f9e44')

interface BoxOpts {
	parent?: string
	w?: number
	h?: number
	color?: TLGeoShape['props']['color']
	meta?: TLShape['meta']
}

function box(
	editor: Editor,
	name: string,
	x: number,
	y: number,
	label: string,
	opts: BoxOpts = {}
) {
	editor.createShape({
		id: sid(name),
		type: 'geo',
		parentId: opts.parent ? sid(opts.parent) : undefined,
		x,
		y,
		props: {
			w: opts.w ?? 160,
			h: opts.h ?? 90,
			richText: toRichText(label),
			color: opts.color ?? 'black',
			fill: 'semi',
		},
		meta: opts.meta ?? {},
	})
}

function frame(
	editor: Editor,
	name: string,
	x: number,
	y: number,
	w: number,
	h: number,
	label: string,
	meta: TLShape['meta'] = {}
) {
	editor.createShape({ id: sid(name), type: 'frame', x, y, props: { w, h, name: label }, meta })
}

function note(editor: Editor, name: string, x: number, y: number, label: string, parent?: string) {
	editor.createShape({
		id: sid(name),
		type: 'note',
		parentId: parent ? sid(parent) : undefined,
		x,
		y,
		props: { richText: toRichText(label) },
	})
}

const isTeacher = (meta: Meta) => meta.role === 'teacher'
const teacherPages = ({ session }: { session: { meta: Meta } }) =>
	isTeacher(session.meta) || 'only the teacher manages pages'

// 1. Offline scripts and server actions -------------------------------------------------------

const mayEditDocument = (meta: Meta) => meta.role === 'editor' || 'viewers cannot edit'
const serverActionsAuth = (userId: string) =>
	userId === 'alice'
		? allow({ userId: 'alice', role: 'editor' })
		: allow({ userId: 'bob', role: 'viewer' }, { readonly: true })

const serverActions = defineScene({
	id: 'server-actions',
	title: 'Offline scripts and server actions',
	status: 'solved',
	summary:
		'Server code writes with room.storage.transaction, which skips the write hooks. A route that acts for a user checks that user with the same rule the hooks use.',
	tryThis: [
		'Press "Nightly script: tidy up". No user is involved, so no rule runs.',
		'Press "Route: add a note as Alice", then "as Bob".',
	],
	expect:
		'The script moves every shape into a row for both users. The route adds a note for Alice. For Bob, the route checks his access first, refuses, and logs why.',
	primitives: ['storage.transaction', 'canWrite', 'isReadonly'],
	users: [user('alice', 'Alice (editor)', '#e03131'), user('bob', 'Bob (viewer)', '#1971c2')],
	initialState: {},
	seed(editor) {
		box(editor, 'a', 40, 60, 'Q3 plan')
		box(editor, 'b', 260, 220, 'Budget', { color: 'blue' })
		box(editor, 'c', 120, 360, 'Hiring', { color: 'green' })
	},
	connect: (u) => serverActionsAuth(u.id),
	policy: () => ({ write: { shape: ({ session }) => mayEditDocument(session.meta) } }),
	Controls({ ctx }) {
		const routeAddNote = (userId: string) => {
			// A route authenticates the caller the way the socket does, then runs the same rule.
			const verdict = mayEditDocument(serverActionsAuth(userId).meta)
			log({
				side: 'server',
				allowed: verdict === true,
				userId,
				op: 'route',
				recordId: 'POST /notes',
				reason: verdict === true ? 'route checked the user' : verdict,
			})
			if (verdict !== true) return
			ctx.room.storage.transaction((txn) => {
				// Copy a stored box, so the new record has every prop the schema needs.
				const shapes = [...txn.values()].filter(isShape)
				const template = shapes.find((s) => s.type === 'geo')
				if (!template) return
				// Fractional indexes sort as strings.
				const top = shapes.reduce((max, s) => (s.index > max ? s.index : max), template.index)
				const id = createShapeId()
				txn.set(id, {
					...template,
					id,
					index: getIndexAbove(top),
					y: Math.max(...shapes.map((s) => s.y)) + 120,
					props: { ...template.props, richText: toRichText(`Added by a route for ${userId}`) },
				} as TLShape)
			})
		}
		return (
			<>
				<Action
					onClick={() =>
						ctx.room.storage.transaction((txn) => {
							const shapes = [...txn.values()].filter(isShape)
							shapes.forEach((s, i) => txn.set(s.id, { ...s, x: 40 + i * 190, y: 60, rotation: 0 }))
						})
					}
				>
					Nightly script: tidy up
				</Action>
				<Action onClick={() => routeAddNote('alice')}>Route: add a note as Alice</Action>
				<Action onClick={() => routeAddNote('bob')}>Route: add a note as Bob</Action>
			</>
		)
	},
})

// 2. Share menu and invite links -------------------------------------------------------------

const shareLink = defineScene({
	id: 'share-link',
	title: 'Share menu and invite links',
	status: 'solved',
	summary:
		'The owner sets what the link gives. The server reads the setting when the guest connects, and closes the guest session when it changes, so the guest reconnects with the new access.',
	tryThis: ['Set the link to "edit" and draw as Gus.', 'Set it to "view", then to "none".'],
	expect:
		'Gus reconnects each time. With "view" his editor is read-only, with "none" he gets a no access screen, and with "edit" he can draw again.',
	gap: 'A change applies on reconnect, not live. A write that Gus sends while his access drops is rejected and undone.',
	primitives: ['handleSocketConnect', 'isReadonly', 'closeSession'],
	users: [user('olive', 'Olive (owner)', '#e03131'), user('gus', 'Gus (has the link)', '#1971c2')],
	initialState: { link: 'view' as 'none' | 'view' | 'edit' },
	seed(editor) {
		box(editor, 'a', 60, 80, 'Shared board')
	},
	connect: (u, s) =>
		u.id === 'olive'
			? allow({ userId: 'olive', role: 'owner' })
			: s.link === 'none'
				? deny
				: allow({ userId: 'gus', role: `link: ${s.link}` }, { readonly: s.link === 'view' }),
	policy: () => ({}),
	Controls: ({ ctx }) => (
		<Segmented
			label="Anyone with the link can"
			value={ctx.state.link}
			options={['none', 'view', 'edit'] as const}
			onChange={(link) => ctx.setState({ link }, { reconnect: ['gus'] })}
		/>
	),
})

// 3. Classroom: students edit one section ---------------------------------------------------

const documentMeta = (get: Get) => (get(TLDOCUMENT_ID) as TLDocument | undefined)?.meta ?? {}

const inSection = (get: Get, shape: TLShape, meta: Meta): true | string => {
	if (shape.type === 'frame') return 'students cannot change sections'
	// Sections are inherited from the frame: a shape that names its own could go anywhere.
	if (shape.meta.section !== undefined) return 'only frames have sections'
	return inherited(get, shape, 'section') === meta.section ? true : 'outside your section'
}

const classroomSections = defineScene({
	id: 'classroom-sections',
	title: 'Classroom: students edit one section',
	status: 'solved',
	summary:
		"Each student may write only inside their own frame. The rule reads the shape's parents with get, on both sides of the write, so a student can't move a shape out of their section either. The teacher makes sections private with document.meta.privateSections, which the read rule reads with get, so the change is live.",
	tryThis: [
		"Draw in your own section as Sam, then in Sky's section.",
		'Drag a shape from your section out of it.',
		'Turn on "Students see only their section".',
	],
	expect:
		"Sam can draw only in his frame. Strokes elsewhere don't appear, and he can't select or move shapes outside it. With private sections on, each student sees only their own frame's content at once, with no reconnect.",
	primitives: ['canWrite', 'canRead', 'get'],
	users: [teacher, sam, sky],
	initialState: {},
	seed(editor) {
		frame(editor, 'sec-a', 0, 0, 340, 300, "Sam's section", { section: 'a' })
		frame(editor, 'sec-b', 380, 0, 340, 300, "Sky's section", { section: 'b' })
		note(editor, 'na', 30, 40, 'Sam: 2 + 2 = ?', 'sec-a')
		note(editor, 'nb', 30, 40, 'Sky: 3 × 3 = ?', 'sec-b')
	},
	connect: (u) =>
		u.id === 'tess'
			? allow({ userId: 'tess', role: 'teacher' })
			: allow({ userId: u.id, role: 'student', section: u.id === 'sam' ? 'a' : 'b' }),
	policy: () => ({
		write: {
			shape: (args) =>
				isTeacher(args.session.meta) ||
				bothSides(args, (s) => inSection(args.get, s, args.session.meta)),
			page: teacherPages,
			document: teacherPages,
		},
		read: {
			shape: ({ session, record, get }) => {
				if (!documentMeta(get).privateSections || isTeacher(session.meta)) return true
				const section = inherited(get, record, 'section')
				return section === undefined || section === session.meta.section
			},
		},
	}),
	Controls({ ctx }) {
		const tess = ctx.editors.tess
		return (
			<Check
				label="Students see only their section (Tess's editor)"
				checked={!!tess?.getDocumentSettings().meta.privateSections}
				onChange={(privateSections) => tess?.updateDocumentSettings({ meta: { privateSections } })}
			/>
		)
	},
})

// 4. Workspace owner, member, guest ---------------------------------------------------------

type WorkspaceRole = 'owner' | 'member' | 'guest' | 'removed'

const workspaceUsers = [
	user('ona', 'Ona', '#e03131'),
	user('max', 'Max', '#1971c2'),
	user('gil', 'Gil', '#2f9e44'),
]

const workspaceRoles = defineScene({
	id: 'workspace-roles',
	title: 'Workspace owner, member, and guest',
	status: 'solved',
	summary:
		'The role comes from the workspace when the user connects. Guests view, members edit shapes, and only owners add, rename, or delete pages.',
	tryThis: [
		'Add a page as Max (member) from the page menu.',
		'Make Max an owner and try again.',
		'Set Gil to "removed".',
	],
	expect:
		"Max's page menu does not offer to add, rename, or delete pages until he is an owner. Gil's editor is read-only as a guest and shows no access when removed. Deleting a page deletes its shapes, then the page: with client checks on, the editor rolls back all of it, and with them off, the server's writeRejection 'push' rejects all of it.",
	primitives: ['handleSocketConnect', 'isReadonly', 'canWrite', 'writeRejection'],
	users: workspaceUsers,
	initialState: {
		roles: { ona: 'owner', max: 'member', gil: 'guest' } as Record<string, WorkspaceRole>,
	},
	seed(editor) {
		box(editor, 'a', 60, 80, 'Roadmap')
	},
	connect: (u, s) => {
		const role = s.roles[u.id]
		if (role === 'removed') return deny
		return allow({ userId: u.id, role }, { readonly: role === 'guest' })
	},
	policy: () => {
		const ownersOnly = ({ session }: { session: { meta: Meta } }) =>
			session.meta.role === 'owner' || 'only owners manage pages'
		return { writeRejection: 'push', write: { page: ownersOnly, document: ownersOnly } }
	},
	Controls: ({ ctx }) => (
		<>
			{workspaceUsers.map((u) => (
				<Segmented
					key={u.id}
					label={u.name}
					value={ctx.state.roles[u.id]}
					options={['owner', 'member', 'guest', 'removed'] as const}
					onChange={(role) =>
						ctx.setState({ roles: { ...ctx.state.roles, [u.id]: role } }, { reconnect: [u.id] })
					}
				/>
			))}
		</>
	),
})

// 5. Team-only pages ------------------------------------------------------------------------

const internalPage = PageRecordType.createId('internal')

const teamOnly = (get: Get, pageId: string, meta: Meta) =>
	!(get(pageId) as TLPage | undefined)?.meta.teamOnly || meta.team === 'agency'

const teamPages = defineScene({
	id: 'team-pages',
	title: 'Team-only pages',
	status: 'solved',
	summary:
		"A page with meta.teamOnly is hidden from people outside the team, with the shapes on it. The read rule for a shape reads its page with get, so it runs again when the page changes. People outside the team can't write there or flip the flag, and don't see the presence of a teammate on a team-only page.",
	tryThis: [
		'Open the page menu as Cal (client). Only "Brief" is there.',
		'As Ana, go to "Internal". Her cursor leaves Cal\'s editor.',
		'As Ana, untick "Internal is team only", then tick it again.',
	],
	expect:
		"When Ana opens the page, Cal gets the page and its shapes at once. When she hides it again, the page and its shapes leave Cal's editor. The shape count in his header shows it. While Ana is on a team-only page, Cal gets no presence from her.",
	primitives: ['canRead', 'canWrite', 'get', 'beforeRead (presence)'],
	users: [user('ana', 'Ana (agency)', '#e03131'), user('cal', 'Cal (client)', '#1971c2')],
	initialState: {},
	seed(editor) {
		const brief = editor.getCurrentPageId()
		editor.updatePage({ id: brief, name: 'Brief' })
		box(editor, 'brief', 60, 80, 'Campaign brief')
		editor.createPage({ id: internalPage, name: 'Internal', meta: { teamOnly: true } })
		editor.setCurrentPage(internalPage)
		box(editor, 'margin', 60, 80, 'Margin: 38%', { color: 'red' })
		box(editor, 'notes', 260, 80, 'Client is late again', { color: 'red' })
		editor.setCurrentPage(brief)
	},
	connect: (u) =>
		u.id === 'ana'
			? allow({ userId: 'ana', role: 'agency', team: 'agency' })
			: allow({ userId: 'cal', role: 'client', team: 'client' }),
	policy: () => ({
		write: {
			page: (args) =>
				bothSides(
					args,
					(p) => !p.meta.teamOnly || args.session.meta.team === 'agency' || 'team-only page'
				),
			shape: (args) =>
				bothSides(
					args,
					(s) => teamOnly(args.get, pageOf(args.get, s), args.session.meta) || 'on a team-only page'
				),
		},
		read: {
			page: ({ session, record }) => !record.meta.teamOnly || session.meta.team === 'agency',
			shape: ({ session, record, get }) => teamOnly(get, pageOf(get, record), session.meta),
			// Presence names the user's current page, so it would tell Cal that the page exists.
			instance_presence: ({ session, record, get }) =>
				teamOnly(get, record.currentPageId, session.meta),
		},
	}),
	Controls({ ctx }) {
		const ana = ctx.editors.ana
		const isTeamOnly = !!ana?.getPage(internalPage)?.meta.teamOnly
		return (
			<>
				<Check
					label="Internal is team only (Ana's editor)"
					checked={isTeamOnly}
					onChange={(teamOnly) => ana?.updatePage({ id: internalPage, meta: { teamOnly } })}
				/>
			</>
		)
	},
})

// 6. Classroom: call on one student ---------------------------------------------------------

const calledOn = (get: Get) => (get(TLDOCUMENT_ID) as TLDocument | undefined)?.meta.calledOn

const callOn = defineScene({
	id: 'call-on',
	title: 'Classroom: call on one student',
	status: 'solved',
	summary:
		"The teacher writes document.meta.calledOn. The server rule reads it with get on every write. Each student's editor runs the same rule through its canWrite option, which runs again when the value changes, so the change is live, with no reconnect.",
	tryThis: ['Call on Sam, and draw as Sam and as Sky.', 'Call on Sky, then on nobody.'],
	expect:
		'Only the student called on can draw. The others lose their drawing tools at once and cannot move shapes. With client checks off, their writes are sent and the server undoes them.',
	primitives: ['canWrite', 'get', 'canWrite (editor option)'],
	users: [teacher, sam, sky],
	initialState: {},
	seed(editor) {
		note(editor, 'q', 60, 60, 'Who can solve 12 × 12?')
	},
	connect: (u) =>
		u.id === 'tess'
			? allow({ userId: 'tess', role: 'teacher' })
			: allow({ userId: u.id, role: 'student' }),
	policy: () => ({
		write: {
			shape: ({ session, get }) =>
				isTeacher(session.meta) || calledOn(get) === session.meta.userId || 'not called on',
			document: ({ session }) => isTeacher(session.meta) || 'only the teacher calls on students',
			page: teacherPages,
		},
	}),
	Controls({ ctx }) {
		const tess = ctx.editors.tess
		const current = (tess?.getDocumentSettings().meta.calledOn as string | undefined) ?? 'nobody'
		return (
			<Segmented
				label="Teacher calls on"
				value={current}
				options={['nobody', 'sam', 'sky']}
				onChange={(id) =>
					tess?.updateDocumentSettings({ meta: { calledOn: id === 'nobody' ? null : id } })
				}
			/>
		)
	},
})

// 7. Classroom: reveal step by step ---------------------------------------------------------

const steps = ['step-1', 'step-2', 'step-3']
const isHidden = (get: Get, shape: TLShape) =>
	[shape, ...ancestors(get, shape)].some((s) => s.meta.hidden === true)

const revealSteps = defineScene({
	id: 'reveal-steps',
	title: 'Classroom: reveal step by step',
	status: 'solved',
	summary:
		"Each step is a frame with meta.hidden. canRead hides a hidden frame and everything in it from students. The rule reads the shape's parents with get, so it runs again when a frame changes. The teacher reveals a step by clearing the flag on the frame only.",
	tryThis: ['Press "Reveal next step" two times.', 'Press "Reset".'],
	expect:
		'Sam gets each step and its content at once. Reset hides the steps again, and their content leaves his editor.',
	primitives: ['canRead', 'get'],
	users: [teacher, sam],
	initialState: {},
	seed(editor) {
		steps.forEach((step, i) => {
			frame(editor, step, i * 300, 0, 260, 220, `Step ${i + 1}`, { hidden: i > 0 })
		})
		note(editor, 's1', 30, 40, 'Read the problem', 'step-1')
		note(editor, 's2', 30, 40, 'Draw a diagram', 'step-2')
		note(editor, 's3', 30, 40, 'Answer: 42', 'step-3')
	},
	connect: (u) =>
		u.id === 'tess'
			? allow({ userId: 'tess', role: 'teacher' })
			: allow({ userId: 'sam', role: 'student' }, { readonly: true }),
	policy: () => ({
		read: {
			shape: ({ session, record, get }) => isTeacher(session.meta) || !isHidden(get, record),
		},
	}),
	Controls({ ctx }) {
		const tess = ctx.editors.tess
		const reveal = () => {
			if (!tess) return
			const next = steps.map(sid).find((id) => tess.getShape(id)?.meta.hidden)
			if (next) tess.updateShape({ id: next, type: 'frame', meta: { hidden: false } })
		}
		const reset = () => {
			ctx.room.storage.transaction((txn) => {
				steps.slice(1).forEach((step) => {
					const f = txn.get(sid(step)) as TLShape | undefined
					if (f) txn.set(f.id, { ...f, meta: { ...f.meta, hidden: true } })
				})
			})
		}
		return (
			<>
				<Action onClick={reveal}>Reveal next step</Action>
				<Action onClick={reset}>Reset</Action>
			</>
		)
	},
})

// 8. Internal tools: edit, view, or none per team -------------------------------------------

type Level = 'edit' | 'view' | 'none'

const teamAccess = defineScene({
	id: 'team-access',
	title: 'Internal tools: edit, view, or none per team',
	status: 'solved',
	summary:
		"Access is per team. The server resolves the user's team to a level when they connect, and closes the sessions of a team whose level changes.",
	tryThis: [
		'Set Sales to "edit", then to "none".',
		'Set Design to "view" while Dee drags a shape.',
	],
	expect:
		'Each change reconnects the members of that team only. "none" shows the no access screen. A drag in progress when Design drops to "view" is undone.',
	gap: 'No live role change: a session keeps its options until it reconnects.',
	primitives: ['handleSocketConnect', 'isReadonly', 'closeSession'],
	users: [user('dee', 'Dee (design)', '#e03131'), user('eli', 'Eli (sales)', '#1971c2')],
	initialState: { design: 'edit' as Level, sales: 'view' as Level },
	seed(editor) {
		box(editor, 'a', 60, 80, 'Pricing tool mockup')
	},
	connect: (u, s) => {
		const team = u.id === 'dee' ? 'design' : 'sales'
		const level = s[team]
		if (level === 'none') return deny
		return allow({ userId: u.id, role: `${team}: ${level}`, team }, { readonly: level === 'view' })
	},
	policy: () => ({}),
	Controls: ({ ctx }) => (
		<>
			<Segmented
				label="Design team"
				value={ctx.state.design}
				options={['edit', 'view', 'none'] as const}
				onChange={(design) => ctx.setState({ design }, { reconnect: ['dee'] })}
			/>
			<Segmented
				label="Sales team"
				value={ctx.state.sales}
				options={['edit', 'view', 'none'] as const}
				onChange={(sales) => ctx.setState({ sales }, { reconnect: ['eli'] })}
			/>
		</>
	),
})

// 9. CADChat: strict rules per object -------------------------------------------------------

const classOf = (get: Get, shape: TLShape) =>
	(inherited(get, shape, 'securityClass') as number) ?? 1

const cadRule: Rule<TLShape> = (args) => {
	const clearance = args.session.meta.clearance ?? 0
	if (args.prev?.meta.securityClass !== args.next?.meta.securityClass && args.next)
		return 'only the server sets a class'
	if (args.prev && args.next && classOf(args.get, args.prev) !== classOf(args.get, args.next))
		return 'cannot move between classes'
	return bothSides(args, (s) => {
		const c = classOf(args.get, s)
		return c <= clearance || `class ${c} needs clearance ${c}`
	})
}

const cadchat = defineScene({
	id: 'cadchat',
	title: 'CADChat: strict rules per object',
	status: 'solved',
	summary:
		"Each container has a security class in meta. A user sees and writes only what their clearance covers, can't move a part between classes, and can't change a class. Every write is logged with its reason, allowed or not.",
	tryThis: [
		'Move a part in "Class 1" as Cole, then try to drag it into "Class 2".',
		'Turn off client checks and try again.',
	],
	expect:
		"Cole (clearance 1) does not see Class 2 or 3. Erin sees Classes 1 and 2. Cole doesn't see Erin's cursor over a class he can't see, or her selection of a part in it. The log lists every write and every denial, with the user and the reason.",
	primitives: ['canRead', 'canWrite', 'beforeWrite (audit)', 'beforeRead (presence)', 'get'],
	users: [
		user('erin', 'Erin (clearance 2)', '#e03131'),
		user('cole', 'Cole (clearance 1)', '#1971c2'),
	],
	initialState: {},
	seed(editor) {
		;[1, 2, 3].forEach((c) => {
			frame(editor, `class-${c}`, (c - 1) * 300, 0, 260, 260, `Class ${c}`, { securityClass: c })
		})
		box(editor, 'p1', 30, 40, 'Bracket', { parent: 'class-1', w: 120, h: 80 })
		box(editor, 'p2', 30, 40, 'Rotor', { parent: 'class-2', w: 120, h: 80, color: 'orange' })
		box(editor, 'p3', 30, 40, 'Warhead', { parent: 'class-3', w: 120, h: 80, color: 'red' })
	},
	connect: (u) => allow({ userId: u.id, role: 'engineer', clearance: u.id === 'erin' ? 2 : 1 }),
	policy: () => ({
		write: { shape: cadRule },
		after: [
			{
				shape: (args) => {
					log({
						side: 'server',
						allowed: true,
						userId: args.session.meta.userId,
						op: args.type,
						recordId: (args.next ?? args.prev).id,
						reason: 'audit: passed the checks',
					})
				},
			},
		],
		read: {
			shape: ({ session, record, get }) => classOf(get, record) <= (session.meta.clearance ?? 0),
		},
		mask: {
			// Presence would show where a hidden part is, by the cursor or the selection on it.
			instance_presence: ({ session, record, get }) => {
				const clearance = session.meta.clearance ?? 0
				const visible = (id: string) => {
					const shape = get(id)
					return isShape(shape) && classOf(get, shape) <= clearance
				}
				const { cursor } = record
				const overHidden =
					cursor &&
					[1, 2, 3].some((c) => {
						const f = get(sid(`class-${c}`)) as TLFrameShape | undefined
						return (
							f &&
							c > clearance &&
							cursor.x >= f.x &&
							cursor.x <= f.x + f.props.w &&
							cursor.y >= f.y &&
							cursor.y <= f.y + f.props.h
						)
					})
				return {
					...record,
					cursor: overHidden ? null : cursor,
					brush: overHidden ? null : record.brush,
					selectedShapeIds: record.selectedShapeIds.filter(visible),
				}
			},
		},
	}),
})

// 10. Agents: limited areas, tools, and shapes ----------------------------------------------

const agentFrame = sid('agent-area')

const agents = defineScene({
	id: 'agents',
	title: 'Agents: limited areas, tools, and shapes',
	status: 'partly',
	summary:
		"The agent connects with its own session and meta.agent: the frame it may work in and the shape types it may make. The same rule runs in the agent's client and on the server. Its toolbar asks the same rule, so it offers no tool that makes a shape on the page.",
	tryThis: ['Press "Run the agent\'s plan".', 'Turn off client checks and run it again.'],
	expect:
		"The note inside the frame stays. The note outside, the arrow, and the delete of Hana's shape are denied. The log gives the reason for the two notes and the arrow. The editor refuses the delete before it writes anything, so the client log has no entry for it. With client checks off, all three appear for a moment, the server undoes them, and the log has a reason for each.",
	gap: "An agent that runs inside the user's editor shares the user's session, so the server cannot tell its writes from the user's. The demo gives the agent its own session.",
	primitives: ['handleSocketConnect (meta)', 'canWrite', 'get', 'canWrite (editor option)'],
	users: [user('hana', 'Hana (human)', '#e03131'), user('bot', 'Agent', '#7048e8')],
	initialState: {},
	seed(editor) {
		frame(editor, 'agent-area', 300, 0, 300, 260, 'Agent area')
		box(editor, 'human', 20, 60, "Hana's idea")
	},
	connect: (u) =>
		u.id === 'hana'
			? allow({ userId: 'hana', role: 'human' })
			: allow({
					userId: 'bot',
					role: 'agent',
					agent: { frameId: agentFrame, shapeTypes: ['note', 'geo', 'text'] },
				}),
	policy: () => ({
		write: {
			shape: (args) => {
				const agent = args.session.meta.agent
				if (!agent) return true
				return bothSides(args, (s) => {
					if (s.id === agent.frameId) return 'the area itself is off limits'
					if (!agent.shapeTypes.includes(s.type)) return `agents may not make ${s.type} shapes`
					return (
						ancestors(args.get, s).some((p) => p.id === agent.frameId) || 'outside the agent area'
					)
				})
			},
		},
	}),
	Controls({ ctx }) {
		const run = () => {
			const bot = ctx.editors.bot
			if (!bot) return
			const plan: (() => void)[] = [
				() =>
					bot.createShape({
						type: 'note',
						parentId: agentFrame,
						x: 30,
						y: 40,
						props: { richText: toRichText('Agent: a summary') },
					}),
				() =>
					bot.createShape({
						type: 'note',
						x: 40,
						y: 300,
						props: { richText: toRichText('Agent: outside') },
					}),
				() =>
					bot.createShape({
						type: 'arrow',
						parentId: agentFrame,
						x: 40,
						y: 200,
						props: { end: { x: 160, y: 0 } },
					}),
				() => bot.deleteShape(sid('human')),
			]
			// The scene may be reset mid-plan, which disposes this editor.
			plan.forEach((step, i) => setTimeout(() => !bot.isDisposed && step(), i * 500))
		}
		return <Action onClick={run}>Run the agent&apos;s plan</Action>
	},
})

// 11. Dotcom: view, comment, edit -----------------------------------------------------------

type DotcomRole = 'edit' | 'comment' | 'view'

const dotcomUsers = [
	user('owen', 'Owen', '#e03131'),
	user('cora', 'Cora', '#1971c2'),
	user('vic', 'Vic', '#2f9e44'),
]

const dotcom = defineScene({
	id: 'dotcom',
	title: 'Dotcom: view, comment, or edit',
	status: 'solved',
	summary:
		'Two session options cover the three levels: isReadonly gates the canvas, and objectAccess gates the comment records. Comment authorship is forced on the server by createCommentAuthorizers.',
	tryThis: [
		'Pick the comment tool as Cora and add a comment.',
		'Try to draw as Cora, and to comment as Vic.',
		'Change a role.',
	],
	expect:
		"Cora can comment but not draw. Vic can read comments but not write them. Owen can do both. A comment's author is always the session's user.",
	primitives: ['isReadonly', 'objectAccess', 'objectTypes', 'createCommentAuthorizers'],
	users: dotcomUsers,
	initialState: {
		roles: { owen: 'edit', cora: 'comment', vic: 'view' } as Record<string, DotcomRole>,
	},
	comments: true,
	seed(editor) {
		box(editor, 'a', 60, 80, 'Landing page v2', { w: 220, h: 120 })
	},
	connect: (u, s) => {
		const role = s.roles[u.id]
		return allow(
			{ userId: u.id, role },
			{ readonly: role !== 'edit', objectAccess: role === 'view' ? 'read' : 'write' }
		)
	},
	policy: () => ({
		objectTypes: ['comment-thread', 'comment', 'comment-reaction'],
		// objectAccess already gates the comment lane, so every session that reaches these may comment.
		stamp: [
			createCommentAuthorizers<Meta>({
				getUserId: (s) => s.meta.userId,
				canComment: () => true,
			}) as TLBeforeWriteHooks<TLRecord, Meta>,
		],
	}),
	Controls: ({ ctx }) => (
		<>
			{dotcomUsers.map((u) => (
				<Segmented
					key={u.id}
					label={u.name}
					value={ctx.state.roles[u.id]}
					options={['edit', 'comment', 'view'] as const}
					onChange={(role) =>
						ctx.setState({ roles: { ...ctx.state.roles, [u.id]: role } }, { reconnect: [u.id] })
					}
				/>
			))}
		</>
	),
})

// 12. Folders that inherit ------------------------------------------------------------------

type Grant = 'inherit' | Level
const folders = ['Workspace', 'Project', 'This file'] as const
const folderUsers = [user('ada', 'Ada', '#e03131'), user('ben', 'Ben', '#1971c2')]

const folderInherit = defineScene({
	id: 'folder-inherit',
	title: 'Folders that inherit',
	status: 'solved',
	summary:
		"Access is set on folders and inherited by what's inside. The app walks up from the file to the nearest grant when the user connects, and reconnects the user when a grant changes.",
	tryThis: [
		'Give Ben "edit" on Project.',
		'Set "This file" to "none" for Ben, then back to "inherit".',
	],
	expect:
		"Ben's access follows the nearest grant above the file. The resolved level shows in his editor's header.",
	primitives: ['handleSocketConnect', 'isReadonly', 'closeSession'],
	users: folderUsers,
	initialState: {
		grants: {
			ada: ['edit', 'inherit', 'inherit'],
			ben: ['view', 'inherit', 'inherit'],
		} as Record<string, Grant[]>,
	},
	seed(editor) {
		box(editor, 'a', 60, 80, 'Spec diagram')
	},
	connect: (u, s) => {
		const grants = s.grants[u.id]
		let i = grants.length - 1
		while (i >= 0 && grants[i] === 'inherit') i--
		const level: Level = i === -1 ? 'none' : (grants[i] as Level)
		if (level === 'none') return deny
		return allow(
			{ userId: u.id, role: `${level} (from ${folders[i]})` },
			{ readonly: level === 'view' }
		)
	},
	policy: () => ({}),
	Controls: ({ ctx }) => (
		<>
			{folderUsers.map((u) => (
				<div key={u.id} className="perm-row">
					<strong>{u.name}</strong>
					{folders.map((folder, i) => (
						<Segmented
							key={folder}
							label={folder}
							value={ctx.state.grants[u.id][i]}
							options={
								(i === 0
									? ['edit', 'view', 'none']
									: ['inherit', 'edit', 'view', 'none']) as Grant[]
							}
							onChange={(grant) => {
								const next = [...ctx.state.grants[u.id]]
								next[i] = grant
								ctx.setState(
									{ grants: { ...ctx.state.grants, [u.id]: next } },
									{ reconnect: [u.id] }
								)
							}}
						/>
					))}
				</div>
			))}
		</>
	),
})

// 13. Classroom: edit only in some ways -----------------------------------------------------

const studentTypes = ['draw', 'highlight', 'text']

const stampOwner = (shape: TLShape, userId: string): TLShape => ({
	...shape,
	meta: { ...shape.meta, ownerId: userId },
})

const penAndText = defineScene({
	id: 'pen-and-text',
	title: 'Classroom: edit only in some ways',
	status: 'solved',
	summary:
		"Students may add pen strokes, highlights, and text, and change only their own shapes. The server stamps the owner on create. The student's toolbar shows only the tools that the same rule lets him use, through the editor's canWrite option.",
	tryThis: [
		'Write on the worksheet as Sam with the pen and the text tool.',
		"Try to move or erase the teacher's worksheet.",
		'Turn off client checks and paste a rectangle as Sam.',
	],
	expect:
		'Sam can add and erase his own marks only. The worksheet stays where it is. A pasted rectangle is undone by the server.',
	primitives: ['canWrite', 'beforeWrite (stamp)', 'canWrite (editor option)', 'store side effects'],
	users: [teacher, sam],
	initialState: {},
	seed(editor) {
		box(editor, 'ws', 40, 40, 'Worksheet: label the parts', {
			w: 420,
			h: 260,
			meta: { ownerId: 'tess' },
		})
	},
	connect: (u) =>
		u.id === 'tess'
			? allow({ userId: 'tess', role: 'teacher' })
			: allow({ userId: 'sam', role: 'student' }),
	policy: () => ({
		stamp: [
			{
				shape: ({ type, next, session }) =>
					type === 'create' ? stampOwner(next, session.meta.userId) : undefined,
			},
		],
		write: {
			shape: ({ session, type, prev, next }) => {
				if (isTeacher(session.meta)) return true
				if (type === 'create')
					return studentTypes.includes(next.type) || `students may not add ${next.type} shapes`
				if (prev.meta.ownerId !== session.meta.userId) return 'not your shape'
				if (next && next.meta.ownerId !== prev.meta.ownerId) return 'the owner is fixed'
				return true
			},
			page: teacherPages,
			document: teacherPages,
		},
	}),
	setup(editor, _, getSession) {
		// The client stamps the owner too, so its copy matches the server's and the gate sees it.
		return editor.sideEffects.registerBeforeCreateHandler('shape', (shape, source) =>
			source === 'user' ? stampOwner(shape, getSession().meta.userId) : shape
		)
	},
})

// 14. Poker: hide cards ---------------------------------------------------------------------

const deck = ['A♠', 'K♥', '7♦', '2♣', 'Q♠', '9♥', '5♦', 'J♣']
const players = ['pia', 'pete']

const pokerRule: Rule<TLShape> = ({ session, type, prev, next }) => {
	if (prev?.type !== 'poker-card' && next?.type !== 'poker-card') return true
	if (type !== 'update' || prev.type !== next.type) return 'only the dealer deals'
	const p = prev as CardShape
	const n = next as CardShape
	if (n.props.face !== p.props.face) return 'cards cannot change'
	if (n.meta.ownerId !== p.meta.ownerId) return 'the owner is fixed'
	if (n.props.revealed !== p.props.revealed) {
		if (p.meta.ownerId !== session.meta.userId) return 'only the owner shows a card'
		if (!n.props.revealed) return 'a shown card stays shown'
	}
	return true
}

function deal(): TLShapePartial<CardShape>[] {
	const faces = [...deck].sort(() => Math.random() - 0.5)
	return players.flatMap((owner, p) =>
		[0, 1].map((i) => ({
			id: sid(`card-${owner}-${i}`),
			type: 'poker-card' as const,
			x: p * 300 + i * 105,
			y: 40,
			props: { face: faces[p * 2 + i], revealed: false },
			meta: { ownerId: owner },
		}))
	)
}

const poker = defineScene({
	id: 'poker',
	title: 'Poker: hide cards',
	status: 'solved',
	summary:
		"beforeRead sends each card's face only to its owner, until the owner shows it. Everyone else gets a copy with the face masked. canWrite keeps faces fixed and lets only the owner show a card.",
	tryThis: [
		'Look at the cards in both editors.',
		'Press "Pia shows her cards".',
		'Press "Pete peeks at Pia\'s card" and "Pete changes his card".',
	],
	expect:
		"Each player sees only their own faces. When Pia shows hers, Pete gets the faces. Pete's peek and change are denied. Anyone may move any card: the move is a patch of x and y, so the hidden face is never written.",
	primitives: ['beforeRead', 'canWrite', 'storage.transaction'],
	users: [user('pia', 'Pia', '#e03131'), user('pete', 'Pete', '#1971c2')],
	initialState: {},
	seed(editor) {
		editor.createShapes(deal())
	},
	connect: (u) => allow({ userId: u.id, role: 'player' }),
	policy: () => ({
		write: { shape: pokerRule },
		mask: {
			shape: ({ session, record }) => {
				if (record.type !== 'poker-card') return
				const card = record as CardShape
				if (card.props.revealed || card.meta.ownerId === session.meta.userId) return
				return { ...card, props: { ...card.props, face: '??' } }
			},
		},
	}),
	Controls({ ctx }) {
		const { pia, pete } = ctx.editors
		const show = () =>
			pia?.updateShapes(
				[0, 1].map((i) => ({
					id: sid(`card-pia-${i}`),
					type: 'poker-card',
					props: { revealed: true },
				}))
			)
		return (
			<>
				<Action onClick={show}>Pia shows her cards</Action>
				<Action
					onClick={() =>
						pete?.updateShape({
							id: sid('card-pia-0'),
							type: 'poker-card',
							props: { revealed: true },
						})
					}
				>
					Pete peeks at Pia&apos;s card
				</Action>
				<Action
					onClick={() =>
						pete?.updateShape({ id: sid('card-pete-0'), type: 'poker-card', props: { face: 'K♣' } })
					}
				>
					Pete changes his card
				</Action>
				<Action
					onClick={() =>
						ctx.room.storage.transaction((txn) => {
							for (const card of deal()) {
								const stored = txn.get(card.id) as CardShape
								txn.set(card.id, {
									...stored,
									...card,
									props: { ...stored.props, ...card.props },
								} as TLShape)
							}
						})
					}
				>
					Deal again (server)
				</Action>
			</>
		)
	},
})

// 15. Redacted shapes -----------------------------------------------------------------------

const redactedShapes = defineScene({
	id: 'redacted',
	title: 'Redacted shapes',
	status: 'partly',
	summary:
		'For a reader without clearance, beforeRead sends a redacted shape in place of each shape marked redacted: same id, place, and size, nothing else. canWrite stops writes to redacted shapes.',
	tryThis: [
		'Compare the two editors.',
		'Select a shape as Ivy and press "Ivy unredacts the selection", then redact it again.',
		'Turn off client checks and drag a redacted box as Rex.',
	],
	expect:
		'Rex sees black boxes where the labels are, and nothing where the redacted text is. Unredacting sends him the real shape. His drag is undone.',
	gap: 'Only shapes with w and h get a box: the server has no geometry for draw, line, text, or arrow shapes, so those are hidden instead. When a shape is unredacted, its type changes on the client from redacted to geo, which the client does not check.',
	primitives: ['beforeRead', 'canWrite'],
	users: [user('ivy', 'Ivy (cleared)', '#e03131'), user('rex', 'Rex (not cleared)', '#1971c2')],
	initialState: {},
	seed(editor) {
		box(editor, 'r1', 40, 40, 'Launch: March 3', { meta: { redacted: true } })
		box(editor, 'r2', 240, 40, 'Codename: Kestrel', { meta: { redacted: true }, color: 'violet' })
		box(editor, 'open', 40, 180, 'Public roadmap', { color: 'green' })
		editor.createShape({
			id: sid('source'),
			type: 'text',
			x: 260,
			y: 210,
			meta: { redacted: true },
			props: { richText: toRichText('Source: J. Smith, finance') },
		})
	},
	connect: (u) =>
		allow({
			userId: u.id,
			role: u.id === 'ivy' ? 'cleared' : 'reader',
			clearance: u.id === 'ivy' ? 1 : 0,
		}),
	policy: () => ({
		write: {
			shape: (args) => {
				if (args.next?.type === 'redacted') return 'nobody writes redacted shapes'
				if (args.session.meta.clearance) return true
				// The reader's copy is a redacted shape with no meta, so check both.
				return bothSides(args, (s) => (!s.meta.redacted && s.type !== 'redacted') || 'redacted')
			},
		},
		mask: {
			shape: ({ session, record }) => {
				if (!record.meta.redacted || session.meta.clearance) return
				const { w, h } = record.props as { w?: number; h?: number }
				if (typeof w !== 'number' || typeof h !== 'number') return null
				return { ...record, type: 'redacted', props: { w, h }, meta: {} } as TLShape
			},
		},
	}),
	Controls({ ctx }) {
		const ivy = ctx.editors.ivy
		const setRedacted = (redacted: boolean) => {
			if (!ivy) return
			ivy.updateShapes(
				ivy
					.getSelectedShapes()
					.map((s) => ({ id: s.id, type: s.type, meta: { ...s.meta, redacted } }) as TLShapePartial)
			)
		}
		return (
			<>
				<Action onClick={() => setRedacted(false)}>Ivy unredacts the selection</Action>
				<Action onClick={() => setRedacted(true)}>Ivy redacts the selection</Action>
			</>
		)
	},
})

// 16. Writes that depend on each other ------------------------------------------------------

const pushRejection = defineScene({
	id: 'push-rejection',
	title: 'Writes that depend on each other',
	status: 'solved',
	summary:
		'Grouping makes a group and moves its children into it, in one push. Bob may not make groups. writeRejection decides what a rejection takes with it: the one record, or the whole push.',
	tryThis: [
		'With "record", press "Bob groups the boxes".',
		'Switch to "push" (a new room) and press it again.',
		'Turn client checks on and press it again.',
	],
	expect:
		"With 'record', the server stores the children's moves into a group it rejected, so the boxes vanish for everyone. With 'push', the server rejects all of it and Bob's client undoes the group. With client checks on, Bob's editor rolls back the whole operation, so nothing is sent and the boxes stay.",
	primitives: ['writeRejection', 'canWrite'],
	users: [user('alice', 'Alice', '#e03131'), user('bob', 'Bob (no groups)', '#1971c2')],
	initialState: { mode: 'record' as 'record' | 'push' },
	clientChecks: false,
	roomKey: (s) => s.mode,
	seed(editor) {
		box(editor, 'a', 40, 60, 'Header')
		box(editor, 'b', 240, 60, 'Footer', { color: 'blue' })
	},
	connect: (u) => allow({ userId: u.id, role: u.id === 'alice' ? 'editor' : 'no-groups' }),
	policy: (getState) => ({
		writeRejection: getState().mode,
		write: {
			shape: ({ session, type, next }) =>
				type !== 'create' ||
				next.type !== 'group' ||
				session.meta.role === 'editor' ||
				'only Alice makes groups',
		},
	}),
	Controls: ({ ctx }) => (
		<>
			<Segmented
				label="writeRejection"
				value={ctx.state.mode}
				options={['record', 'push'] as const}
				onChange={(mode) => ctx.setState({ mode })}
			/>
			<Action onClick={() => ctx.editors.bob?.groupShapes([sid('a'), sid('b')])}>
				Bob groups the boxes
			</Action>
		</>
	),
})

export const scenes: Scene[] = [
	serverActions,
	shareLink,
	classroomSections,
	workspaceRoles,
	teamPages,
	callOn,
	revealSteps,
	teamAccess,
	cadchat,
	agents,
	dotcom,
	folderInherit,
	penAndText,
	poker,
	redactedShapes,
	pushRejection,
]
