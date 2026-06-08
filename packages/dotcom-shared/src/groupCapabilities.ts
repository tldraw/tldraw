import { assert } from '@tldraw/utils'
import { ZErrorCode } from './types'

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

/** A group, or just its id — so callers can pass either `group` or `groupId`. */
export type GroupRef = string | { readonly id: string }

/** Normalize a {@link GroupRef} to a group id. */
export function getGroupId(group: GroupRef): string {
	return typeof group === 'string' ? group : group.id
}

/**
 * A user, as seen by group authorization: it answers "can this user do X in this
 * group?". Both the client and the server build one of these for the acting user,
 * so call sites read `user.can('editGroup', group)` instead of inspecting roles
 * directly.
 */
export interface GroupActor {
	/** Whether the user may perform `capability` in `group`. */
	can(capability: GroupCapability, group: GroupRef): boolean
	/** Throw `forbidden` unless the user may perform `capability` in `group`. */
	assertCan(capability: GroupCapability, group: GroupRef): void
}

/**
 * Build a {@link GroupActor} from a function that resolves the user's role in a
 * group (or null if they aren't a member). All capability logic stays here; each
 * context only supplies how to look up a role.
 *
 * This resolves roles synchronously, which suits the client (memberships are
 * already synced into the store). The server has an async equivalent that reads
 * the role from the database — see `groupActor` in mutators.ts.
 */
export function createGroupActor(resolveRole: (groupId: string) => GroupRole | null): GroupActor {
	function can(capability: GroupCapability, group: GroupRef) {
		const role = resolveRole(getGroupId(group))
		return role !== null && roleHasCapability(role, capability)
	}
	return {
		can,
		assertCan(capability, group) {
			assert(can(capability, group), ZErrorCode.forbidden)
		},
	}
}
