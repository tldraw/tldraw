import { PageRecordType, PolicyContext, toRichText, useValue } from 'tldraw'
import { Scenario, mayParent, ownsShape, pageOf } from './scenario'

// The teacher locks the board through the document record. Only `document:write` changes it.
const isBoardLocked = (ctx: PolicyContext) =>
	(ctx.get('document:document') as { meta?: { locked?: boolean } } | undefined)?.meta?.locked ===
	true

const ANSWERS_PAGE = PageRecordType.createId('answers')

export const classroom: Scenario = {
	id: 'classroom',
	title: 'Classroom',
	rules:
		'Students add shapes and change only their own. The teacher changes anything, locks the board, and hides the private Answers page.',
	tryThis:
		'As Sam, draw a shape, then try to move the teacher’s note. Turn off “Check locally” and try again: the server rejects it. As the teacher, lock the board or show the answers.',
	people: [
		{
			id: 'teacher',
			name: 'Teacher',
			role: 'teacher',
			actions: ['document:write', 'pages:read-private'],
		},
		{ id: 'sam', name: 'Sam', role: 'student', actions: ['shapes:create'] },
		{ id: 'ann', name: 'Ann', role: 'student', actions: ['shapes:create'] },
	],
	policies: {
		shape: {
			// Students add shapes in their own name, in places they may change.
			create: (ctx) =>
				ctx.base() ||
				(ctx.can('shapes:create') &&
					!isBoardLocked(ctx) &&
					ownsShape(ctx, ctx.next) &&
					mayParent(ctx, ctx.next.parentId)),
			// Students change only their own shapes, cannot give them away, and cannot move them into
			// a frame they do not own.
			update: (ctx) =>
				ctx.base() ||
				(ctx.can('shapes:create') &&
					!isBoardLocked(ctx) &&
					ownsShape(ctx, ctx.prev) &&
					ctx.next.meta.ownerId === ctx.prev.meta.ownerId &&
					(ctx.next.parentId === ctx.prev.parentId || mayParent(ctx, ctx.next.parentId))),
			delete: (ctx) =>
				ctx.base() || (ctx.can('shapes:create') && !isBoardLocked(ctx) && ownsShape(ctx, ctx.prev)),
			// Shapes on a private page are not sent to students.
			read: (ctx) => {
				const pageId = pageOf(ctx.record, ctx.get)
				const page = pageId && ctx.get(pageId)
				return !page || ctx.authorize({ verb: 'read', record: page })
			},
		},
		page: {
			read: (ctx) => !ctx.record.meta.private || ctx.can('pages:read-private'),
		},
		binding: {
			read: (ctx) => {
				const from = ctx.get(ctx.record.fromId)
				const to = ctx.get(ctx.record.toId)
				return (
					(!from || ctx.authorize({ verb: 'read', record: from })) &&
					(!to || ctx.authorize({ verb: 'read', record: to }))
				)
			},
		},
	},
	seed(editor, person) {
		if (person.id !== 'teacher' || editor.getPage(ANSWERS_PAGE)) return
		const pageId = editor.getCurrentPageId()
		editor.run(() => {
			editor.createShapes([
				{ type: 'frame', x: 0, y: 0, props: { w: 420, h: 260, name: 'Teacher’s area' } },
				{
					type: 'note',
					x: 40,
					y: 60,
					props: { richText: toRichText('Only the teacher changes this note.') },
				},
				{
					type: 'text',
					x: 0,
					y: 320,
					props: { richText: toRichText('Students: draw your answer below this line.') },
				},
			])
			editor.createPage({ id: ANSWERS_PAGE, name: 'Answers', meta: { private: true } })
			editor.createShapes([
				{
					type: 'text',
					parentId: ANSWERS_PAGE,
					x: 0,
					y: 0,
					props: { richText: toRichText('The answer is 42.') },
				},
			])
			editor.setCurrentPage(pageId)
		})
	},
	Controls({ editor, person }) {
		const isLocked = useValue('locked', () => !!editor.getDocumentSettings().meta.locked, [editor])
		const isPrivate = useValue('private', () => !!editor.getPage(ANSWERS_PAGE)?.meta.private, [
			editor,
		])
		if (person.id !== 'teacher') return null
		return (
			<>
				<button
					onClick={() =>
						editor.updateDocumentSettings({
							meta: { ...editor.getDocumentSettings().meta, locked: !isLocked },
						})
					}
				>
					{isLocked ? 'Unlock board' : 'Lock board'}
				</button>
				<button
					onClick={() => {
						const page = editor.getPage(ANSWERS_PAGE)
						if (page)
							editor.updatePage({ id: page.id, meta: { ...page.meta, private: !isPrivate } })
					}}
				>
					{isPrivate ? 'Show answers' : 'Hide answers'}
				</button>
			</>
		)
	},
}
