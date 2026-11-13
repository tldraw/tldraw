import type { TLPermission, TLPermissionGrant } from '@tldraw/tlschema'

/**
 * The permissions the tldraw editor and UI understand.
 *
 * @public
 */
export const TL_PERMISSIONS: readonly TLPermission[] = [
	'tl:shape:create',
	'tl:shape:update',
	'tl:shape:delete',
	'tl:page:create',
	'tl:page:update',
	'tl:page:delete',
]

/**
 * One write to a record: the record before and after. The editor's `TLRecordChange` and the sync
 * server's change both fit.
 *
 * @public
 */
export interface TLPermissionChange {
	type: 'create' | 'update' | 'delete'
	prev: { typeName: string } | null
	next: { typeName: string } | null
}

/**
 * The permission a write to each of your own record types needs, keyed by `typeName`. A record type
 * with no entry, and that tldraw doesn't know, isn't judged at all: give every type a rule has to
 * protect an entry.
 *
 * @example
 * ```ts
 * const types = { sticker: 'stickers:edit' }
 * getRequiredPermission({ type: 'update', prev: sticker, next: moved }, types) // 'stickers:edit'
 * ```
 *
 * @public
 */
export type TLRecordTypePermissions = Readonly<Record<string, TLPermissionGrant>>

/**
 * Whether a list of granted permissions covers the one needed. `null` (permissions not in use)
 * covers nothing, so a rule that asks fails closed when a session was never given a list.
 *
 * @example
 * ```ts
 * isPermitted(['tl:shape:*'], 'tl:shape:delete') // true
 * isPermitted(['tl:shape:create'], 'tl:shape:delete') // false
 * ```
 *
 * @public
 */
export function isPermitted(granted: readonly TLPermissionGrant[] | null, needed: string): boolean {
	if (!granted) return false
	return granted.some(
		(grant) => grant === needed || (grant.endsWith(':*') && needed.startsWith(grant.slice(0, -1)))
	)
}

/**
 * The permission a change to a record needs, or null when the record isn't covered by any (the
 * change is then allowed).
 *
 * Shapes and pages map onto their own create, update and delete. A binding belongs to the shapes it
 * joins, so any change to one needs `tl:shape:update`. A new asset only arrives with a new shape, so
 * creating one needs `tl:shape:create`. `types` covers your own record types and wins over these.
 *
 * Left unjudged:
 *
 * - Record types tldraw doesn't know and that have no entry in `types`. They're allowed.
 * - Asset updates and deletes. An asset is shared across pages, so changing one affects every page
 *   that shows it.
 *
 * @public
 */
export function getRequiredPermission(
	change: TLPermissionChange,
	types?: TLRecordTypePermissions
): TLPermissionGrant | null {
	const typeName = (change.next ?? change.prev)?.typeName
	if (typeName !== undefined && types && Object.hasOwn(types, typeName)) return types[typeName]
	switch (typeName) {
		case 'shape':
			return `tl:shape:${change.type}`
		case 'page':
			return `tl:page:${change.type}`
		case 'binding':
			return 'tl:shape:update'
		case 'asset':
			return change.type === 'create' ? 'tl:shape:create' : null
		default:
			return null
	}
}

/**
 * Whether these permissions cover a change: the permission it needs (see
 * {@link getRequiredPermission}) is granted, or it needs none. Pure, so a client and a server can
 * share it.
 *
 * @example
 * ```ts
 * if (!isChangePermitted(session.permissions, change)) {
 * 	return { reason: `Needs ${getRequiredPermission(change)}`, ids: [(change.next ?? change.prev).id] }
 * }
 * ```
 *
 * @public
 */
export function isChangePermitted(
	granted: readonly TLPermissionGrant[] | null,
	change: TLPermissionChange,
	types?: TLRecordTypePermissions
): boolean {
	const needed = getRequiredPermission(change, types)
	return needed === null || isPermitted(granted, needed)
}

/**
 * Where a policy reads granted permissions by default: the editor, which passes itself to `isPermitted`
 * and `isChangePermitted`.
 *
 * @public
 */
export interface TLPermissionSource {
	getPermissions(): readonly TLPermissionGrant[] | null
}

/** @public */
export interface TLPermissionPolicy {
	/** Whether the permission is granted. Pass as the editor's `isPermitted`, or ask about your own names. */
	isPermitted(permission: TLPermissionGrant, editor?: TLPermissionSource): boolean
	/** Pass as the editor's `isChangePermitted`. */
	isChangePermitted(change: TLPermissionChange, editor?: TLPermissionSource): boolean
}

/**
 * Turns a list of granted permissions into the two answers the editor asks for. The editor
 * already answers from the session's permissions with the built-in mapping; use this when you need
 * more: your own record types (`types`), or a list of your own (`getGranted`, read on every call,
 * so read signals inside it). By default the list is the editor's session permissions
 * (`editor.getPermissions()`), and `null` grants nothing.
 *
 * @example
 * ```tsx
 * const policy = createPermissionPolicy(undefined, { types: { sticker: 'stickers:edit' } })
 * <Tldraw store={store} isPermitted={policy.isPermitted} isChangePermitted={policy.isChangePermitted} />
 * ```
 *
 * @public
 */
export function createPermissionPolicy(
	getGranted: (editor?: TLPermissionSource) => readonly TLPermissionGrant[] | null = (editor) =>
		editor?.getPermissions() ?? null,
	opts: { types?: TLRecordTypePermissions } = {}
): TLPermissionPolicy {
	return {
		isPermitted: (permission, editor) => isPermitted(getGranted(editor), permission),
		isChangePermitted: (change, editor) =>
			isChangePermitted(getGranted(editor), change, opts.types),
	}
}
