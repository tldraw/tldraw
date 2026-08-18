import { Capability } from './capabilities'

/**
 * Workspace authorization asks `can(role, capability)` — never `role === 'owner'` — so what a role
 * means lives only in this table. The role is stored as a plain string (`group_user.role`);
 * capabilities are never persisted. Today owners differ from members only by `manageWorkspace`.
 */
const roles = {
	member: ['accessFiles', 'addFiles', 'removeFiles'],
	owner: ['accessFiles', 'addFiles', 'removeFiles', 'manageWorkspace'],
} satisfies Record<string, readonly Capability[]>

/** A role a member can have in a workspace — the string stored in `group_user.role`. */
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
