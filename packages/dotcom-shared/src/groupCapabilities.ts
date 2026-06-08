/**
 * Group authorization is expressed in terms of *capabilities*, never role names.
 *
 * A capability is a single thing a person can do inside a group ("rename the
 * group", "delete the group", etc.). Every authorization check asks "does this
 * member's role have capability X?" rather than "is this member an owner?". That
 * keeps the meaning of a role in exactly one place — the GROUP_ROLE_CAPABILITIES
 * table below — so that:
 *
 *   1. You can see what a role can do by reading its list, and
 *   2. You can change what a role can do, or add a new role, by editing the
 *      table without hunting down `role === '...'` checks scattered across the
 *      client, mutators, and workers.
 */
export type GroupCapability =
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
 * The roles a member can have within a group.
 *
 * NOTE: `'admin'` is in the process of being renamed to `'member'`. Because no
 * logic branches on the literal anymore (only on capabilities), that rename is
 * just relabeling the key below plus a data migration of stored values — no
 * behavior changes.
 */
export type GroupRole = 'owner' | 'admin'

/**
 * The single source of truth for what each role can do.
 *
 * To read what a role can do: look at its list.
 * To change what a role can do: edit its list.
 * To add a role: add an entry.
 *
 * Today the only difference between `admin` and `owner` is the three
 * "destructive"/administrative capabilities at the bottom of the owner list.
 */
export const GROUP_ROLE_CAPABILITIES: Record<GroupRole, readonly GroupCapability[]> = {
	admin: [
		'viewGroup', //
		'addFiles',
		'removeFiles',
		'manageInvites',
	],
	owner: [
		'viewGroup',
		'addFiles',
		'removeFiles',
		'manageInvites',
		'editGroup', // owner-only
		'manageMembers', // owner-only
		'deleteGroup', // owner-only
	],
}

/** Returns true if the given role is allowed to perform the given capability. */
export function roleHasCapability(role: GroupRole, capability: GroupCapability): boolean {
	return GROUP_ROLE_CAPABILITIES[role].includes(capability)
}
