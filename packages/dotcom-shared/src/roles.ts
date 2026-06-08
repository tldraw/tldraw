/**
 * Group authorization, expressed as capabilities rather than role names.
 *
 * A capability is a single thing someone can do in a group ("rename the group",
 * "delete the group"). Authorization asks `can(role, capability)` — never
 * `role === 'owner'` — so the meaning of a role lives in exactly one place (the
 * `roles` table below). You can see what a role can do by reading its list, and
 * change what it can do, or add a role, by editing the table.
 *
 * The role is stored in the DB as a plain string (`group_user.role`);
 * capabilities are never persisted — they're derived from that string here.
 *
 * NOTE: `'admin'` is in the process of being renamed to `'member'`. Because no
 * logic branches on the literal anymore, that rename is just relabeling the key
 * below plus a data migration of stored values.
 */
export type Capability =
	/** See the group and open the files inside it. (Everyone who is a member.) */
	| 'viewGroup'
	/** Add files to the group — link an existing file in, or move one in. */
	| 'addFiles'
	/** Remove files from the group. */
	| 'removeFiles'
	/** Create and revoke the shared invite link. */
	| 'manageInvites'
	/** Rename the group. */
	| 'editGroup'
	/** Change other members' roles (promote/demote). */
	| 'manageMembers'
	/** Delete the whole group and the files it owns. */
	| 'deleteGroup'

/**
 * What each role can do — the single source of truth. The role name is the key,
 * and {@link Role} is derived from these keys. Today the only difference between
 * `admin` and `owner` is the three administrative capabilities at the end of the
 * owner list.
 */
const roles = {
	admin: ['viewGroup', 'addFiles', 'removeFiles', 'manageInvites'],
	owner: [
		'viewGroup',
		'addFiles',
		'removeFiles',
		'manageInvites',
		'editGroup',
		'manageMembers',
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
	if (role == null || !Object.hasOwn(roles, role)) return false
	// `satisfies` narrows each array to a tuple of its own literals, so the cast
	// widens it back to the full Capability union for `includes`.
	return (roles[role as Role] as readonly Capability[]).includes(capability)
}
