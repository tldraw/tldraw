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
 * they may update that shape. So a student may bind their own arrow to a teacher's shape, or
 * move its end to another shape, but may not bind or unbind the teacher's arrow.
 *
 * A binding whose shape at either end was deleted in the same change may be deleted, so deleting
 * your own shape also removes other people's bindings to it.
 *
 * @public
 */
export const defaultBindingPolicy: RecordPolicy<TLBinding> = {
	// A reader gets a binding only with both of its shapes.
	readFollows: (binding) => [binding.fromId, binding.toId],
	create: (ctx) => mayUpdate(ctx, ctx.get(ctx.next.fromId)),
	update: (ctx) => ctx.prev.fromId === ctx.next.fromId && mayUpdate(ctx, ctx.get(ctx.next.fromId)),
	delete: (ctx) => {
		const from = ctx.get(ctx.prev.fromId)
		return !from || !ctx.get(ctx.prev.toId) || mayUpdate(ctx, from)
	},
}
