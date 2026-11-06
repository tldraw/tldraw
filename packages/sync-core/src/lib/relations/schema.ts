/**
 * Relation schema: a small rewrite-rule language in the style of Zanzibar, OpenFGA, and SpiceDB.
 *
 * A schema maps an object type (the part of an object reference before the first `:`) to its
 * relations. Each relation is an expression that says who has that relation on an object of the
 * type. Permissions are relations too: `update` on `shape` is just another relation, and the write
 * check asks for it.
 *
 * The same schema object runs on the server (in the sync room) and on the client (in the editor).
 *
 * @packageDocumentation
 */

/**
 * What a relation expression can read about the evaluation.
 *
 * @public
 */
export interface TLRelationEnv {
	/** The room's root object, for example `file:abc`. */
	readonly root: string
	/** The subject that writes are stamped with, or `null` for an anonymous session. */
	readonly actor: string | null
	/** The write being checked, when the check is part of a write. */
	readonly op?: TLRelationWriteOp
}

/**
 * A client write: create, update, or delete of one record.
 *
 * @public
 */
export type TLRelationWriteOp =
	| { readonly type: 'create'; readonly prev: null; readonly next: any }
	| { readonly type: 'update'; readonly prev: any; readonly next: any }
	| { readonly type: 'delete'; readonly prev: any; readonly next: null }

/**
 * A relation expression. Build them with {@link direct}, {@link field}, {@link from},
 * {@link anyOf}, {@link allOf}, {@link butNot}, {@link when}, {@link anyone}, and {@link nobody}. A
 * plain string is the name of another relation on the same object.
 *
 * @public
 */
export type TLRelationExpr =
	| string
	| { readonly kind: 'direct' }
	| TLRelationFieldExpr
	| { readonly kind: 'from'; readonly via: string; readonly relation: string }
	| { readonly kind: 'anyOf'; readonly exprs: readonly TLRelationExpr[] }
	| { readonly kind: 'allOf'; readonly exprs: readonly TLRelationExpr[] }
	| { readonly kind: 'butNot'; readonly base: TLRelationExpr; readonly subtract: TLRelationExpr }
	| { readonly kind: 'when'; test(record: any, env: TLRelationEnv): boolean }
	| { readonly kind: 'anyone' }
	| { readonly kind: 'nobody' }

/**
 * A relation whose tuples come from a field of the record, for example the parent of a shape or
 * the author of a comment. See {@link field}.
 *
 * @public
 */
export interface TLRelationFieldExpr {
	readonly kind: 'field'
	read(record: any, env: TLRelationEnv): string | readonly string[] | null | undefined
	stamp?(record: any, actor: string | null): any
	readonly lock?: true | string
}

/**
 * The relations of one object type.
 *
 * @public
 */
export type TLRelationTypeDef = Readonly<Record<string, TLRelationExpr>>

/**
 * A relation schema. Create one with {@link defineRelationSchema}.
 *
 * @public
 */
export interface TLRelationSchema {
	readonly types: Readonly<Record<string, TLRelationTypeDef>>
	/** The relation that links an object to its parent. Used by token ceilings. */
	readonly parentRelation: string
}

/**
 * Tuples written in the store for this object and relation. Subjects must be listed in a tuple.
 *
 * @public
 */
export function direct(): TLRelationExpr {
	return DIRECT
}
const DIRECT = { kind: 'direct' } as const

/**
 * Tuples that come from the record itself. `read` returns the subject (or object) references for
 * the relation, such as `user:ann` for an owner or `page:abc` for a parent.
 *
 * - `stamp`: on create, the server (and the client, so that local checks agree) sets the field to
 *   the acting subject. Return `null` to reject the create, for example when the actor is
 *   anonymous and the field needs a user.
 * - `lock`: the field cannot change on update. `true` means never. A relation name means only
 *   subjects with that relation on the record may change it.
 *
 * A field with `stamp` is locked by default.
 *
 * @public
 */
export function field(
	read: TLRelationFieldExpr['read'],
	opts: { stamp?: TLRelationFieldExpr['stamp']; lock?: true | string } = {}
): TLRelationFieldExpr {
	return {
		kind: 'field',
		read,
		stamp: opts.stamp,
		lock: opts.lock ?? (opts.stamp ? true : undefined),
	}
}

/**
 * Tuple-to-userset: for each object in relation `via` of this object (for example its parent),
 * check `relation` on that object.
 *
 * @public
 */
export function from(via: string, relation: string): TLRelationExpr {
	return { kind: 'from', via, relation }
}

/** @public */
export function anyOf(...exprs: TLRelationExpr[]): TLRelationExpr {
	return { kind: 'anyOf', exprs }
}

/** @public */
export function allOf(...exprs: TLRelationExpr[]): TLRelationExpr {
	return { kind: 'allOf', exprs }
}

/**
 * Exclusion: `base`, except for subjects that match `subtract`. Use it to break inheritance, for
 * example a page that does not inherit read access from its file.
 *
 * @public
 */
export function butNot(base: TLRelationExpr, subtract: TLRelationExpr): TLRelationExpr {
	return { kind: 'butNot', base, subtract }
}

/**
 * A condition on the record, like an OpenFGA condition. Use it sparingly: it is not a relation, so
 * the record must be present to evaluate it.
 *
 * @public
 */
export function when(test: (record: any, env: TLRelationEnv) => boolean): TLRelationExpr {
	return { kind: 'when', test }
}

/** Every session in the room. @public */
export function anyone(): TLRelationExpr {
	return ANYONE
}
const ANYONE = { kind: 'anyone' } as const

/** No session. @public */
export function nobody(): TLRelationExpr {
	return NOBODY
}
const NOBODY = { kind: 'nobody' } as const

/**
 * Create a relation schema. The schema is plain data plus functions, so the client and the server
 * can import the same module.
 *
 * Checks fail closed: an unknown type, an unknown relation, or a write relation (`create`,
 * `update`, `delete`) that a type does not define all deny.
 *
 * @public
 */
export function defineRelationSchema(
	types: Record<string, TLRelationTypeDef>,
	opts: { parentRelation?: string } = {}
): TLRelationSchema {
	for (const [type, relations] of Object.entries(types)) {
		for (const [name, expr] of Object.entries(relations)) {
			validateExpr(types, type, name, expr)
		}
	}
	return { types, parentRelation: opts.parentRelation ?? 'parent' }
}

function validateExpr(
	types: Record<string, TLRelationTypeDef>,
	type: string,
	name: string,
	expr: TLRelationExpr
) {
	const where = `relation schema: ${type}#${name}`
	if (typeof expr === 'string') {
		if (!(expr in types[type])) throw new Error(`${where} refers to unknown relation '${expr}'`)
		return
	}
	switch (expr.kind) {
		case 'from': {
			const via = types[type][expr.via]
			if (!via) throw new Error(`${where} traverses unknown relation '${expr.via}'`)
			if (!isTupleSource(via)) {
				throw new Error(
					`${where} traverses '${expr.via}', which must be direct(), field(), or anyOf() of them`
				)
			}
			return
		}
		case 'anyOf':
		case 'allOf':
			for (const e of expr.exprs) validateExpr(types, type, name, e)
			return
		case 'butNot':
			validateExpr(types, type, name, expr.base)
			validateExpr(types, type, name, expr.subtract)
			return
		default:
			return
	}
}

/** A relation that can be traversed with {@link from}: its tuples can be listed. */
export function isTupleSource(expr: TLRelationExpr): boolean {
	if (typeof expr === 'string') return false
	if (expr.kind === 'direct' || expr.kind === 'field') return true
	if (expr.kind === 'anyOf') return expr.exprs.every(isTupleSource)
	return false
}

/** The type of an object reference: the part before the first `:`. */
export function objectType(object: string): string {
	const i = object.indexOf(':')
	return i === -1 ? object : object.slice(0, i)
}
