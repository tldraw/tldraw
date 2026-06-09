/**
 * Every capability — a single thing someone can do in a group. Exported as a
 * runtime list so all capabilities can be enumerated; the {@link Capability}
 * type is derived from it. Roles grant subsets of these — see `roles.ts`.
 */
export const capabilities = [
	'accessFiles', // open and edit the group's files (any member)
	'addFiles', // link an existing file into the group, or move one in
	'removeFiles', // remove a file from the group
	'manageInvites', // create and revoke the shared invite link
	'editGroup', // rename the group
	'editMembers', // edit the group's members (currently: change their roles)
	'deleteGroup', // delete the whole group and the files it owns
] as const

export type Capability = (typeof capabilities)[number]
