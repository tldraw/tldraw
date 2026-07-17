/**
 * Every capability — a single thing someone can do in a workspace. Exported as a
 * runtime list so all capabilities can be enumerated; the {@link Capability}
 * type is derived from it. Roles grant subsets of these — see `roles.ts`.
 */
export const capabilities = [
	'accessFiles', // open and edit the workspace's files (any member)
	'addFiles', // move a file into the workspace
	'removeFiles', // remove a file from the workspace
	'manageWorkspace', // manage the workspace: its invite link, members' roles, name, and deletion (owners)
] as const

export type Capability = (typeof capabilities)[number]
