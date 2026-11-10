import type { TLPermission } from '@tldraw/tlschema'

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
 * An entry in a list of granted permissions: a permission, or a prefix ending in `:*` that covers
 * everything under it (`tl:shape:*`, `tl:*`). A host can add names of its own under another prefix.
 *
 * @public
 */
export type TLPermissionGrant = TLPermission | (string & {})

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
 * Whether a list of granted permissions covers the one needed.
 *
 * @example
 * ```ts
 * hasPermission(['tl:shape:*'], 'tl:shape:delete') // true
 * hasPermission(['tl:shape:create'], 'tl:shape:delete') // false
 * ```
 *
 * @public
 */
export function hasPermission(granted: readonly TLPermissionGrant[], needed: string): boolean {
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
 * creating one needs `tl:shape:create`; later changes to assets aren't judged.
 *
 * @public
 */
export function getRequiredPermission(change: TLPermissionChange): TLPermission | null {
	switch ((change.next ?? change.prev)?.typeName) {
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
 * Why a holder of these permissions can't make this change, or null when they can. Pure, so a
 * client and a server can share it.
 *
 * @public
 */
export function judgeChange(
	granted: readonly TLPermissionGrant[],
	change: TLPermissionChange
): string | null {
	const needed = getRequiredPermission(change)
	return needed === null || hasPermission(granted, needed) ? null : `Needs ${needed}`
}

/** @public */
export interface TLPermissionPolicy {
	/** Whether the permission is granted. Pass as the editor's `can`, or ask about your own names. */
	can(permission: TLPermissionGrant): boolean
	/** Pass as the editor's `canChangeRecord`. */
	canChangeRecord(change: TLPermissionChange): boolean
}

/**
 * Turns a list of granted permissions into the two answers the editor asks for. The list is read on
 * every call: read signals inside `getGranted` and both answers follow.
 *
 * @example
 * ```tsx
 * const policy = createPermissionPolicy(() => ['tl:shape:*'])
 * <Tldraw canChangeRecord={policy.canChangeRecord} />
 * ```
 *
 * @public
 */
export function createPermissionPolicy(
	getGranted: () => readonly TLPermissionGrant[]
): TLPermissionPolicy {
	return {
		can: (permission) => hasPermission(getGranted(), permission),
		canChangeRecord: (change) => judgeChange(getGranted(), change) === null,
	}
}
