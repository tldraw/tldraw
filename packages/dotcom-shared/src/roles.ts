import { Capability } from './capabilities'

/**
 * Group authorization, expressed as capabilities rather than role names.
 *
 * Authorization asks `can(role, capability)` — never `role === 'owner'` — so the
 * meaning of a role lives in exactly one place: the `roles` table below. Read a
 * role's list to see what it can do; edit the list, or add a role, to change it.
 *
 * The role is stored in the DB as a plain string (`group_user.role`);
 * capabilities are never persisted — they're derived from that string here.
 *
 * NOTE: `'admin'` is in the process of being renamed to `'member'`. Because no
 * logic branches on the literal anymore, that rename is just relabeling the key
 * below plus a data migration of stored values.
 */

/**
 * What each role can do — the single source of truth. The role name is the key,
 * and {@link Role} is derived from these keys. Today the only difference between
 * `admin` and `owner` is the three administrative capabilities at the end of the
 * owner list.
 */
const roles = {
	admin: ['accessFiles', 'addFiles', 'removeFiles', 'manageInvites'],
	owner: [
		'accessFiles',
		'addFiles',
		'removeFiles',
		'manageInvites',
		'editGroup',
		'editMembers',
		'deleteGroup',
	],
} satisfies Record<string, readonly Capability[]>

/** A role a member can have in a group — the string stored in `group_user.role`. */
export type Role = keyof typeof roles

/**
 * Whether a role grants a capability.
 *
 * `role` is intentionally loose (`string`): it flows straight from the DB or the
 * synced store, and any unknown or null value returns `false` rather than
 * throwing, so callers never have to validate it first.
 */
export function can(role: string | null | undefined, capability: Capability): boolean {
	if (!isRole(role)) return false
	// `satisfies` narrows each array to a tuple of its own literals, so the cast
	// widens it back to the full Capability union for `includes`.
	return (roles[role] as readonly Capability[]).includes(capability)
}

/** Whether a string is a known role name. */
export function isRole(role: string | null | undefined): role is Role {
	return role != null && Object.hasOwn(roles, role)
}
