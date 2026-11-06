import {
	createPolicyActor,
	createUserId,
	isOwnedBy,
	mayUpdate,
	PolicyContext,
	TLPolicies,
	TLShape,
} from 'tldraw'

// One set of rules for the editor and for the sync server. Both import this file.

export type Role = 'teacher' | 'student'

export interface Person {
	id: string
	name: string
	role: Role
}

const actionsByRole: Record<Role, string[]> = {
	teacher: ['document:write', 'pages:read-private'],
	student: ['shapes:create'],
}

export function actorFor(person: Person) {
	return createPolicyActor({ id: person.id, actions: actionsByRole[person.role] })
}

// The teacher locks the board through the document record. Only `document:write` changes it.
const isBoardLocked = (ctx: PolicyContext) =>
	(ctx.get('document:document') as { meta?: { locked?: boolean } } | undefined)?.meta?.locked ===
	true

const mayParent = (ctx: PolicyContext, parentId: TLShape['parentId']) =>
	parentId.startsWith('page:') || mayUpdate(ctx, ctx.get(parentId))

const ownsShape = (ctx: PolicyContext, shape: TLShape) => isOwnedBy(ctx.actor, shape.meta.ownerId)

function pageOf(shape: TLShape, get: PolicyContext['get']) {
	let parentId: string | undefined = shape.parentId
	for (let i = 0; i < 100 && parentId; i++) {
		if (parentId.startsWith('page:')) return get(parentId)
		parentId = (get(parentId) as TLShape | undefined)?.parentId
	}
	return undefined
}

export const classroomPolicies: TLPolicies = {
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
			const page = pageOf(ctx.record, ctx.get)
			return !page || ctx.authorize({ verb: 'read', record: page })
		},
	},
	// Everyone writes their own user record (name and color for attribution), nobody else's.
	user: {
		create: (ctx) => ctx.base() || ctx.next.id === createUserId(ctx.actor.id ?? ''),
		update: (ctx) => ctx.base() || ctx.next.id === createUserId(ctx.actor.id ?? ''),
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
}
