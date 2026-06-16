/**
 * Every capability — a single thing someone can do in a workspace. Exported as a
 * runtime list so all capabilities can be enumerated; the {@link Capability}
 * type is derived from it. Roles grant subsets of these — see `roles.ts`.
 */
export const capabilities = [
	'accessFiles', // open and edit the workspace's files (any member)
	'addFiles', // move a file into the workspace
	'removeFiles', // remove a file from the workspace
	'manageInvites', // create and revoke the shared invite link
	'editWorkspace', // rename the workspace
	'editMembers', // edit the workspace's members (currently: change their roles)
	'deleteWorkspace', // delete the whole workspace and the files it owns
] as const

export type Capability = (typeof capabilities)[number]
