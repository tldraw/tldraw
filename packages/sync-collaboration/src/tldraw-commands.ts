import type { UnknownRecord } from '@tldraw/store'
import {
	actorCan,
	defineCommand,
	type TLCommand,
	type TLCommandActor,
	type TLEditPolicy,
	type TLEditPolicyContext,
	type TLReadPolicy,
	type TLRecordLookup,
} from '@tldraw/sync-core'
import {
	PageRecordType,
	type TLBinding,
	type TLComment,
	type TLCommentAnchor,
	type TLCommentId,
	type TLCommentReaction,
	type TLCommentThread,
	type TLCommentThreadId,
	type TLPage,
	type TLArrowBinding,
	type TLArrowShape,
	type TLPageId,
	type TLRecord,
	type TLRichText,
	type TLShape,
} from '@tldraw/tlschema'
import { getIndexAbove, isEqual, sortByIndex, type IndexKey } from '@tldraw/utils'
import { T } from '@tldraw/validate'

/**
 * The permissions that the tldraw commands and {@link createOwnedShapesPolicy} check. Hosts give
 * them to actors; a role is just a list of these. `'*'` gives all of them.
 *
 * @public
 */
export const TLDRAW_PERMISSIONS = {
	/** Open the file at all. See {@link createPageReadPolicy}. */
	read: 'read',
	/** The free-form edit lane: drags, resizes, drawing, text. See `TLEditPolicy`. */
	edit: 'edit',
	/** Edit and delete shapes that other actors own. */
	manageShapes: 'shapes:manage',
	/** Create, rename, and delete pages, set who reads them, and read every page. */
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
			return { name: 'comments.delete', args: { commentId: args.commentId } }
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
			return { name: 'comments.edit', args: { ...args, body: comment.body } }
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
			return { name: 'comments.restore', args: { commentId: args.commentId } }
		},
	}),
	defineCommand<R, { commentId: string }>({
		name: 'comments.restore',
		requires: TLDRAW_PERMISSIONS.writeComments,
		args: T.object({ commentId: id('comment') }),
		run(ctx, args) {
			const userId = requireUser(ctx)
			const comment = ctx.get<TLComment & R>(args.commentId)
			if (!comment || !comment.isDeleted) return ctx.deny('no deleted comment')
			if (comment.authorId !== userId && !ctx.can(TLDRAW_PERMISSIONS.manageComments)) {
				return ctx.deny('only the author or a moderator can restore a comment')
			}
			ctx.update<TLComment & R>(comment.id, { isDeleted: false })
			const thread = ctx.get<TLCommentThread & R>(comment.threadId)
			if (thread?.isDeleted) ctx.update<TLCommentThread & R>(thread.id, { isDeleted: false })
			return { name: 'comments.delete', args: { commentId: args.commentId } }
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
			return { name: 'comments.resolve', args: { ...args, resolved: !!thread.resolved } }
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
			return { name: 'pages.delete', args: { id: args.id } }
		},
	}),
	defineCommand<R, { id: string; name: string }>({
		name: 'pages.rename',
		requires: TLDRAW_PERMISSIONS.managePages,
		args: T.object({ id: id('page'), name: T.string }),
		run(ctx, args) {
			const page = ctx.get<TLPage & R>(args.id) ?? ctx.deny('no such page')
			ctx.update<TLPage & R>(page.id, { name: args.name })
			return { name: 'pages.rename', args: { id: args.id, name: page.name } }
		},
	}),
	defineCommand<R, { id: string; readers: string[] | null }>({
		name: 'pages.setReaders',
		requires: TLDRAW_PERMISSIONS.managePages,
		args: T.object({ id: id('page'), readers: T.arrayOf(T.string).nullable() }),
		run(ctx, args) {
			const page = ctx.get<TLPage & R>(args.id) ?? ctx.deny('no such page')
			const { readers: _, ...meta } = page.meta
			ctx.update<TLPage & R>(page.id, {
				meta: args.readers ? { ...meta, readers: args.readers } : meta,
			})
			return { name: 'pages.setReaders', args: { id: args.id, readers: getPageReaders(page) } }
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
				// a stored parent cycle must not hang the server
				const seen = new Set<string>()
				while (byId.has(parent) && !seen.has(parent)) {
					seen.add(parent)
					parent = byId.get(parent)!.parentId
				}
				return parent
			}
			const gone = new Set(shapes.filter((s) => pageOf(s) === args.id).map((s) => s.id as string))
			// everything deleted, for the undo
			const removed: R[] = [ctx.get(args.id)!]
			const remove = (record: R) => {
				removed.push(record)
				ctx.delete(record.id)
			}
			for (const shapeId of gone) remove(byId.get(shapeId)! as TLShape & R)
			for (const binding of ctx.getAll<TLBinding & R>('binding')) {
				if (gone.has(binding.fromId) || gone.has(binding.toId)) remove(binding)
			}
			for (const typeName of COMMENT_TYPES) {
				for (const record of ctx.getAll<R & { pageId: string }>(typeName)) {
					if (record.pageId === args.id) remove(record)
				}
			}
			ctx.delete(args.id)
			return { name: 'pages.restore', args: { records: removed } }
		},
	}),
	defineCommand<R, { records: R[] }>({
		name: 'pages.restore',
		requires: TLDRAW_PERMISSIONS.managePages,
		args: T.object({ records: T.arrayOf(T.unknownObject as T.Validator<any>) }),
		run(ctx, args) {
			// The undo of pages.delete: the page and what was on it. The args come from a client, so
			// check that they are one page and its own records, and that nobody else's authorship
			// is forged. The server validates each record against the schema when it stores it.
			const pages = args.records.filter((r) => r.typeName === 'page')
			if (pages.length !== 1) return ctx.deny('restore needs exactly one page')
			const pageId = pages[0].id as string
			const byId = new Map(args.records.map((r) => [r.id as string, r]))
			const rootOf = (shape: TLShape) => {
				let parent: string = shape.parentId
				const seen = new Set<string>()
				while (byId.get(parent)?.typeName === 'shape' && !seen.has(parent)) {
					seen.add(parent)
					parent = (byId.get(parent) as unknown as TLShape).parentId
				}
				return parent
			}
			for (const record of args.records) {
				if (ctx.get(record.id)) return ctx.deny(`exists: ${record.id}`)
				const r = record as unknown as TLRecord | TLComment | TLCommentThread | TLCommentReaction
				switch (r.typeName) {
					case 'page':
						break
					case 'shape':
						if (rootOf(r) !== pageId) return ctx.deny(`not on the page: ${r.id}`)
						if (
							getShapeOwner(r) !== ctx.actor.userId &&
							!ctx.can(TLDRAW_PERMISSIONS.manageShapes)
						) {
							return ctx.deny('restoring shapes of others needs shapes:manage')
						}
						break
					case 'binding':
						if (!byId.has(r.fromId) && !byId.has(r.toId)) {
							return ctx.deny(`not on the page: ${r.id}`)
						}
						break
					case 'comment':
					case 'comment-thread':
					case 'comment-reaction': {
						if (r.pageId !== pageId) return ctx.deny(`not on the page: ${r.id}`)
						const author =
							r.typeName === 'comment'
								? r.authorId
								: r.typeName === 'comment-thread'
									? r.createdBy
									: r.userId
						if (author !== ctx.actor.userId && !ctx.can(TLDRAW_PERMISSIONS.manageComments)) {
							return ctx.deny('restoring comments of others needs comments:manage')
						}
						break
					}
					default:
						return ctx.deny(`cannot restore a ${r.typeName}`)
				}
			}
			for (const record of args.records) ctx.put(record)
			return { name: 'pages.delete', args: { id: pageId } }
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

/**
 * The id of the actor's `user` record and of the `userId` on its cursor. tldraw user ids start
 * with `user:`; an actor id without the prefix gets it.
 *
 * @public
 */
export function getActorUserRecordId(actor: TLCommandActor): string | null {
	if (!actor.userId) return null
	return actor.userId.startsWith('user:') ? actor.userId : `user:${actor.userId}`
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
export function createOwnedShapesPolicy<Rec extends UnknownRecord = UnknownRecord>(
	opts: OwnedShapesPolicyOptions = {}
): TLEditPolicy<Rec> {
	const canUseParent =
		opts.canUseParent ?? ((actor: TLCommandActor, parent: TLShape) => ownsShape(actor, parent))

	function ownsShape(actor: TLCommandActor, shape: TLShape) {
		if (actorCan(actor, TLDRAW_PERMISSIONS.manageShapes)) return true
		// An unstamped shape (made before the policy, or by the server) belongs to nobody.
		const owner = getShapeOwner(shape)
		return owner !== undefined && owner === actor.userId
	}

	// A parent chain that loops crashes the editor, so nobody may store one.
	function hasParentCycle(ctx: TLEditPolicyContext<R>, shape: TLShape) {
		const seen = new Set<string>([shape.id])
		let parent = ctx.get(shape.parentId) as TLRecord | undefined
		while (parent?.typeName === 'shape') {
			if (seen.has(parent.id)) return true
			seen.add(parent.id)
			parent = ctx.get(parent.parentId) as TLRecord | undefined
		}
		return false
	}

	/**
	 * When a shape is deleted, tldraw unbinds the arrows attached to it and moves each arrow's
	 * loose end to where the shape was. That arrow may be someone else's. The actor may make that
	 * one change: only the end points and the bend, and only the ends that were bound to a shape
	 * the actor owns.
	 */
	function isUnbindFixup(ctx: TLEditPolicyContext<R>, prev: TLShape, next: TLShape) {
		if (prev.type !== 'arrow' || next.type !== 'arrow') return false
		const a = prev as TLArrowShape
		const b = next as TLArrowShape
		const rest = (s: TLArrowShape) => ({ ...s, props: { ...s.props, start: 0, end: 0, bend: 0 } })
		if (!isEqual(rest(a), rest(b))) return false
		const ownedEnds = new Set<string>()
		for (const binding of ctx.before.getAll('binding') as unknown as TLArrowBinding[]) {
			if (binding.fromId !== a.id || binding.type !== 'arrow') continue
			const to = ctx.before.get(binding.toId) as TLShape | undefined
			if (to && ownsShape(ctx.actor, to)) ownedEnds.add(binding.props.terminal)
		}
		if (ownedEnds.size === 0) return false
		for (const end of ['start', 'end'] as const) {
			if (!isEqual(a.props[end], b.props[end]) && !ownedEnds.has(end)) return false
		}
		return true
	}

	function parentOk(ctx: TLEditPolicyContext<R>, shape: TLShape) {
		if (actorCan(ctx.actor, TLDRAW_PERMISSIONS.manageShapes)) return true
		const parent = ctx.get(shape.parentId) as TLRecord | undefined
		if (!parent) return false
		if (parent.typeName === 'page') return true
		return parent.typeName === 'shape' && canUseParent(ctx.actor, parent)
	}

	const policy: TLEditPolicy<R> = {
		commandOnlyTypes: COMMENT_TYPES,
		// every editor writes its user record on mount, read-only or not
		openTypes: ['user'],
		stamp(actor, record) {
			if (!actor.userId) return record
			if (record.typeName === 'instance_presence') {
				// a cursor always shows who really moves it
				return { ...record, userId: getActorUserRecordId(actor) } as R
			}
			if (record.typeName !== 'shape') return record
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
					if (next && hasParentCycle(ctx, next)) return false
					if (prev && next && !ownsShape(ctx.actor, prev) && isUnbindFixup(ctx, prev, next)) {
						return true
					}
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
					// Deleting a shape unbinds everything attached to it, including other people's
					// arrows. Without this, deleting your own shape would leave a binding to nothing.
					if (ctx.op === 'delete') {
						const binding = ctx.prev as TLBinding
						const to = ctx.get(binding.toId) as TLShape | undefined
						if (!to || ownsShape(ctx.actor, to)) return true
					}
					// A binding belongs to the shape it starts from (an arrow). Check both sides, so
					// nobody can take over someone else's binding by pointing it at their own arrow.
					for (const binding of [ctx.prev, ctx.next] as (TLBinding | null)[]) {
						if (!binding) continue
						const from = ctx.get(binding.fromId) as TLShape | undefined
						// on delete the arrow may already be gone in the same push
						if (!from) {
							if (ctx.op !== 'delete') return false
							continue
						}
						if (!ownsShape(ctx.actor, from)) return false
					}
					return true
				}
				case 'page':
				case 'document':
					return actorCan(ctx.actor, TLDRAW_PERMISSIONS.managePages)
				case 'user':
					// Each actor changes only its own user record (name, color). Any editor may add a
					// missing one: editors keep user records as a cache for attribution, and refusing
					// the add would make the editor try again forever.
					return ctx.op === 'create' || record.id === getActorUserRecordId(ctx.actor)
				default:
					return true
			}
		},
	}
	return policy as TLEditPolicy<any>
}

/** Who may read a page, or `null` for everyone with the `read` permission. @public */
export function getPageReaders(page: TLPage): string[] | null {
	const readers = page.meta?.readers
	return Array.isArray(readers) ? readers.filter((r): r is string => typeof r === 'string') : null
}

/**
 * The page a record belongs to: a page itself, a shape's root page, a binding's arrow's page, a
 * comment's page, a cursor's current page. `undefined` for records that belong to no page
 * (the document, assets, users).
 *
 * @public
 */
export function getRecordPageId(
	record: UnknownRecord,
	get: (id: string) => UnknownRecord | undefined
): string | undefined {
	const r = record as TLRecord
	switch (r.typeName) {
		case 'page':
			return r.id
		case 'shape': {
			let parent: string = r.parentId
			// a stored parent cycle must not hang the server
			const seen = new Set<string>()
			while (!seen.has(parent)) {
				seen.add(parent)
				const next = get(parent) as TLRecord | undefined
				if (next?.typeName !== 'shape') return parent
				parent = next.parentId
			}
			return undefined
		}
		case 'binding': {
			const from = get(r.fromId)
			return from ? getRecordPageId(from, get) : undefined
		}
		case 'instance_presence':
			return r.currentPageId
		default: {
			const pageId = (record as { pageId?: unknown }).pageId
			return typeof pageId === 'string' ? pageId : undefined
		}
	}
}

/**
 * A read policy for "some pages are only for some people". A page with `meta.readers` (set by the
 * `pages.setReaders` command) is visible only to those user ids and to actors with
 * `pages:manage`. Everything on the page follows it: shapes, bindings, comments, the cursors of
 * people on it, and assets that only its shapes use. Opening the file needs the `read`
 * permission and at least one page the actor can read.
 *
 * @public
 */
export function createPageReadPolicy<
	Rec extends UnknownRecord = UnknownRecord,
>(): TLReadPolicy<Rec> {
	function canReadPage(actor: TLCommandActor, page: UnknownRecord | undefined) {
		// a record on a missing page is a record nobody should see
		if (!page || page.typeName !== 'page') return false
		const readers = getPageReaders(page as TLPage)
		return !readers || (!!actor.userId && readers.includes(actor.userId))
	}

	function canReadShape(actor: TLCommandActor, shape: UnknownRecord, records: TLRecordLookup<R>) {
		const pageId = getRecordPageId(shape, records.get)
		return !!pageId && canReadPage(actor, records.get(pageId))
	}

	const policy: TLReadPolicy<R> = {
		requires: TLDRAW_PERMISSIONS.read,
		canOpen(actor, records) {
			// the editor needs a page; an actor who can read none has no use for the file
			if (actorCan(actor, TLDRAW_PERMISSIONS.managePages)) return true
			return records.getAll('page').some((page) => canReadPage(actor, page))
		},
		canRead(actor, record, records) {
			if (actorCan(actor, TLDRAW_PERMISSIONS.managePages)) return true
			if (record.typeName === 'asset') {
				// An asset is visible when a shape the actor can read uses it. An asset that no shape
				// uses is hidden too: it may be left over from a hidden page. Its uploader still has it,
				// and others get it with the first shape that uses it.
				return records
					.getAll('shape')
					.some(
						(shape) =>
							(shape as TLShape & { props: { assetId?: unknown } }).props.assetId === record.id &&
							canReadShape(actor, shape, records)
					)
			}
			const pageId = getRecordPageId(record, records.get)
			if (!pageId) return true
			return canReadPage(actor, records.get(pageId))
		},
		isScopeChange(prev, next) {
			const record = (next ?? prev) as TLRecord
			if (record.typeName === 'page') return true
			if (record.typeName !== 'shape') return false
			// a shape that comes, goes, or changes asset can show or hide that asset
			const assetOf = (s: unknown) => (s as { props: { assetId?: unknown } } | null)?.props.assetId
			if (assetOf(prev) !== assetOf(next)) return true
			if (!prev || !next) return false
			// a move between pages carries the shape's children with it
			return (prev as TLShape).parentId !== (next as TLShape).parentId
		},
	}
	return policy as TLReadPolicy<any>
}
