import type { UnknownRecord } from '@tldraw/store'
import {
	actorCan,
	defineCommand,
	type TLCommand,
	type TLCommandActor,
	type TLEditPolicy,
	type TLEditPolicyContext,
} from '@tldraw/sync-core'
import {
	PageRecordType,
	type TLBinding,
	type TLComment,
	type TLCommentAnchor,
	type TLCommentId,
	type TLCommentThread,
	type TLCommentThreadId,
	type TLPage,
	type TLPageId,
	type TLRecord,
	type TLRichText,
	type TLShape,
} from '@tldraw/tlschema'
import { getIndexAbove, sortByIndex, type IndexKey } from '@tldraw/utils'
import { T } from '@tldraw/validate'

/**
 * The permissions that the tldraw commands and {@link createOwnedShapesPolicy} check. Hosts give
 * them to actors; a role is just a list of these. `'*'` gives all of them.
 *
 * @public
 */
export const TLDRAW_PERMISSIONS = {
	/** The free-form edit lane: drags, resizes, drawing, text. See `TLEditPolicy`. */
	edit: 'edit',
	/** Edit and delete shapes that other actors own. */
	manageShapes: 'shapes:manage',
	/** Create, rename, and delete pages. */
	managePages: 'pages:manage',
	/** Start threads, reply, resolve, and edit or delete your own comments. */
	writeComments: 'comments:write',
	/** Delete any comment or thread. */
	manageComments: 'comments:manage',
} as const

type R = UnknownRecord

const id = <K extends string>(prefix: K) =>
	T.string.check((value) => {
		if (!value.startsWith(prefix + ':')) throw new T.ValidationError(`Expected a ${prefix} id`)
	})

function requireUser(ctx: { actor: TLCommandActor; deny(reason: string): never }) {
	if (!ctx.actor.userId) return ctx.deny('anonymous actors cannot do this')
	return ctx.actor.userId
}

const anchorArg = T.unknownObject as T.Validator<any> as T.Validator<TLCommentAnchor>
const richTextArg = T.unknownObject as T.Validator<any> as T.Validator<TLRichText>

/**
 * Comment commands. The server sets `authorId`, `createdBy`, and `createdAt`, so a client cannot
 * forge them. Raw writes of comment records must be off; pass {@link COMMENT_TYPES} as
 * `commandOnlyTypes` in the edit policy.
 *
 * @public
 */
export const commentCommands = [
	defineCommand<
		R,
		{
			threadId: string
			commentId: string
			pageId: string
			anchor?: TLCommentAnchor
			body: TLRichText
			now: number
		}
	>({
		name: 'comments.add',
		requires: TLDRAW_PERMISSIONS.writeComments,
		args: T.object({
			threadId: id('comment-thread'),
			commentId: id('comment'),
			pageId: id('page'),
			anchor: anchorArg.optional(),
			body: richTextArg,
			now: T.number,
		}),
		run(ctx, args) {
			const userId = requireUser(ctx)
			if (!ctx.get(args.pageId)) return ctx.deny('no such page')
			let thread = ctx.get<TLCommentThread & R>(args.threadId)
			if (!thread) {
				if (!args.anchor) return ctx.deny('a new thread needs an anchor')
				const created: TLCommentThread = {
					id: args.threadId as TLCommentThreadId,
					typeName: 'comment-thread',
					pageId: args.pageId as TLPageId,
					anchor: args.anchor,
					createdBy: userId,
					createdAt: args.now,
					resolved: null,
					isDeleted: false,
					meta: {},
				}
				thread = created as TLCommentThread & R
				ctx.put(thread)
			} else if (thread.isDeleted) {
				return ctx.deny('thread is deleted')
			}
			if (ctx.get(args.commentId)) return ctx.deny('comment exists')
			const comment: TLComment = {
				id: args.commentId as TLCommentId,
				typeName: 'comment',
				threadId: thread.id,
				pageId: thread.pageId,
				authorId: userId,
				createdAt: args.now,
				editedAt: null,
				body: args.body,
				isDeleted: false,
				meta: {},
			}
			ctx.put(comment as TLComment & R)
		},
	}),
	defineCommand<R, { commentId: string; body: TLRichText; now: number }>({
		name: 'comments.edit',
		requires: TLDRAW_PERMISSIONS.writeComments,
		args: T.object({ commentId: id('comment'), body: richTextArg, now: T.number }),
		run(ctx, args) {
			const userId = requireUser(ctx)
			const comment = ctx.get<TLComment & R>(args.commentId)
			if (!comment || comment.isDeleted) return ctx.deny('no such comment')
			if (comment.authorId !== userId) return ctx.deny('only the author can edit a comment')
			ctx.update<TLComment & R>(comment.id, { body: args.body, editedAt: args.now })
		},
	}),
	defineCommand<R, { commentId: string }>({
		name: 'comments.delete',
		requires: TLDRAW_PERMISSIONS.writeComments,
		args: T.object({ commentId: id('comment') }),
		run(ctx, args) {
			const userId = requireUser(ctx)
			const comment = ctx.get<TLComment & R>(args.commentId)
			if (!comment || comment.isDeleted) return ctx.deny('no such comment')
			if (comment.authorId !== userId && !ctx.can(TLDRAW_PERMISSIONS.manageComments)) {
				return ctx.deny('only the author or a moderator can delete a comment')
			}
			ctx.update<TLComment & R>(comment.id, { isDeleted: true })
			// The thread goes when its last live comment goes, in the same unit.
			const live = ctx
				.getAll<TLComment & R>('comment')
				.filter((c) => c.threadId === comment.threadId && !c.isDeleted)
			if (live.length === 0) ctx.update<TLCommentThread & R>(comment.threadId, { isDeleted: true })
		},
	}),
	defineCommand<R, { threadId: string; resolved: boolean; now: number }>({
		name: 'comments.resolve',
		requires: TLDRAW_PERMISSIONS.writeComments,
		args: T.object({ threadId: id('comment-thread'), resolved: T.boolean, now: T.number }),
		run(ctx, args) {
			const userId = requireUser(ctx)
			const thread = ctx.get<TLCommentThread & R>(args.threadId)
			if (!thread || thread.isDeleted) return ctx.deny('no such thread')
			ctx.update<TLCommentThread & R>(thread.id, {
				resolved: args.resolved ? { at: args.now, by: userId } : null,
			})
		},
	}),
] satisfies TLCommand<R>[]

/** @public */
export const COMMENT_TYPES = ['comment', 'comment-thread', 'comment-reaction'] as const

/**
 * Page commands. Deleting a page removes its shapes, bindings, and comments in the same unit, so
 * nobody needs delete rights on each shape, and nothing is left behind.
 *
 * @public
 */
export const pageCommands = [
	defineCommand<R, { id: string; name: string }>({
		name: 'pages.create',
		requires: TLDRAW_PERMISSIONS.managePages,
		args: T.object({ id: id('page'), name: T.string }),
		run(ctx, args) {
			if (ctx.get(args.id)) return ctx.deny('page exists')
			const pages = ctx.getAll<TLPage & R>('page').sort(sortByIndex)
			const index = getIndexAbove(pages.at(-1)?.index as IndexKey | undefined)
			ctx.put(PageRecordType.create({ id: args.id as TLPageId, name: args.name, index }))
		},
	}),
	defineCommand<R, { id: string; name: string }>({
		name: 'pages.rename',
		requires: TLDRAW_PERMISSIONS.managePages,
		args: T.object({ id: id('page'), name: T.string }),
		run(ctx, args) {
			if (!ctx.get(args.id)) return ctx.deny('no such page')
			ctx.update<TLPage & R>(args.id as TLPageId, { name: args.name })
		},
	}),
	defineCommand<R, { id: string }>({
		name: 'pages.delete',
		requires: TLDRAW_PERMISSIONS.managePages,
		args: T.object({ id: id('page') }),
		run(ctx, args) {
			if (!ctx.get(args.id)) return ctx.deny('no such page')
			const pages = ctx.getAll('page')
			if (pages.length <= 1) return ctx.deny('cannot delete the last page')
			// Walk the parent chain: a shape is on the page if its root parent is the page.
			const shapes = ctx.getAll<TLShape & R>('shape')
			const byId = new Map(shapes.map((s) => [s.id as string, s]))
			const pageOf = (shape: TLShape): string => {
				let parent: string = shape.parentId
				while (byId.has(parent)) parent = byId.get(parent)!.parentId
				return parent
			}
			const gone = new Set(shapes.filter((s) => pageOf(s) === args.id).map((s) => s.id as string))
			for (const shapeId of gone) ctx.delete(shapeId)
			for (const binding of ctx.getAll<TLBinding & R>('binding')) {
				if (gone.has(binding.fromId) || gone.has(binding.toId)) ctx.delete(binding.id)
			}
			for (const typeName of COMMENT_TYPES) {
				for (const record of ctx.getAll<R & { pageId: string }>(typeName)) {
					if (record.pageId === args.id) ctx.delete(record.id)
				}
			}
			ctx.delete(args.id)
		},
	}),
] satisfies TLCommand<R>[]

/** @public */
export interface OwnedShapesPolicyOptions {
	/**
	 * Whether the actor may put a shape inside this parent shape. Defaults to: the actor owns the
	 * parent. Pages are always allowed.
	 */
	canUseParent?(actor: TLCommandActor, parent: TLShape): boolean
}

/** The owner that {@link createOwnedShapesPolicy} stamps on a shape. @public */
export function getShapeOwner(shape: TLShape): string | undefined {
	const owner = shape.meta?.ownerId
	return typeof owner === 'string' ? owner : undefined
}

/**
 * An edit policy for "everyone edits only their own shapes". The server stamps
 * `meta.ownerId` on each new shape from the actor, so an owner is never client-chosen. An actor
 * with `shapes:manage` edits everything; an actor with `pages:manage` writes page records.
 * Comment records are command-only.
 *
 * It checks the parent on both sides of a move, so a shape cannot move into someone else's
 * frame. It runs the same on the client (shapes you cannot edit act locked) and on the server.
 *
 * @public
 */
export function createOwnedShapesPolicy(opts: OwnedShapesPolicyOptions = {}): TLEditPolicy<R> {
	const canUseParent =
		opts.canUseParent ?? ((actor: TLCommandActor, parent: TLShape) => ownsShape(actor, parent))

	function ownsShape(actor: TLCommandActor, shape: TLShape) {
		if (actorCan(actor, TLDRAW_PERMISSIONS.manageShapes)) return true
		// An unstamped shape (made before the policy, or by the server) belongs to nobody.
		const owner = getShapeOwner(shape)
		return owner !== undefined && owner === actor.userId
	}

	function parentOk(ctx: TLEditPolicyContext<R>, shape: TLShape) {
		if (actorCan(ctx.actor, TLDRAW_PERMISSIONS.manageShapes)) return true
		const parent = ctx.get(shape.parentId) as TLRecord | undefined
		if (!parent) return false
		if (parent.typeName === 'page') return true
		return parent.typeName === 'shape' && canUseParent(ctx.actor, parent)
	}

	return {
		commandOnlyTypes: COMMENT_TYPES,
		// every editor writes its user record on mount, read-only or not
		openTypes: ['user'],
		stamp(actor, record) {
			if (record.typeName !== 'shape' || !actor.userId) return record
			const shape = record as unknown as TLShape
			return { ...shape, meta: { ...shape.meta, ownerId: actor.userId } } as unknown as R
		},
		authorize(ctx) {
			const record = (ctx.next ?? ctx.prev) as TLRecord
			switch (record.typeName) {
				case 'shape': {
					if (!ctx.actor.userId) return false
					const prev = ctx.prev as TLShape | null
					const next = ctx.next as TLShape | null
					if (prev && !ownsShape(ctx.actor, prev)) return false
					if (next) {
						if (!ownsShape(ctx.actor, next)) return false
						// the owner is not editable, even by the owner
						if (prev && getShapeOwner(prev) !== getShapeOwner(next)) return false
						if (!parentOk(ctx, next)) return false
					}
					return true
				}
				case 'binding': {
					// A binding belongs to the shape it starts from (an arrow).
					const binding = record as TLBinding
					const from = ctx.get(binding.fromId) as TLShape | undefined
					// on delete the arrow may already be gone in the same push
					if (!from) return ctx.op === 'delete'
					return ownsShape(ctx.actor, from)
				}
				case 'page':
				case 'document':
					return actorCan(ctx.actor, TLDRAW_PERMISSIONS.managePages)
				default:
					return true
			}
		},
	}
}
