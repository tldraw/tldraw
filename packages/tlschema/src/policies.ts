import { PolicyContext, RecordPolicy, UnknownRecord } from '@tldraw/store'
import type { TLBinding } from './records/TLBinding'

/**
 * The bottom policy layer of a tldraw schema. Every write to a document record needs the
 * `document:write` action, unless the record type's own policy says otherwise. Reads are open.
 *
 * A record type that has no policy of its own (a plugin type that forgot one) gets this policy,
 * so a viewer or a comment-only actor cannot write it.
 *
 * @public
 */
export const defaultRecordPolicy: RecordPolicy = {
	create: (ctx) => ctx.can('document:write'),
	update: (ctx) => ctx.can('document:write'),
	delete: (ctx) => ctx.can('document:write'),
}

/**
 * True when the actor may change `record` at all. Use it in a rule that follows the access of
 * another record, for example a binding that follows its shape.
 *
 * @public
 */
export function mayUpdate(ctx: PolicyContext, record: UnknownRecord | undefined): boolean {
	return !!record && ctx.authorize({ verb: 'update', prev: record, next: record })
}

/**
 * A binding follows the shape it starts from (`fromId`): the actor may write the binding when
 * they may update that shape. So a student may bind their own arrow to a teacher's shape, but may
 * not bind the teacher's arrow.
 *
 * A binding whose shape was deleted in the same change may be deleted.
 *
 * @public
 */
export const defaultBindingPolicy: RecordPolicy<TLBinding> = {
	create: (ctx) => mayUpdate(ctx, ctx.get(ctx.next.fromId)),
	update: (ctx) =>
		ctx.prev.fromId === ctx.next.fromId &&
		ctx.prev.toId === ctx.next.toId &&
		mayUpdate(ctx, ctx.get(ctx.next.fromId)),
	delete: (ctx) => {
		const from = ctx.get(ctx.prev.fromId)
		return !from || mayUpdate(ctx, from)
	},
}
