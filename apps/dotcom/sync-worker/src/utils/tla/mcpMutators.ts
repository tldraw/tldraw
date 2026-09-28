import { createMutators } from '@tldraw/dotcom-shared'

/**
 * The mutators a user reached over an OAuth access token may run: the ones that act on a board —
 * creating, renaming, sharing, pinning, removing it from a workspace, marking it visited — and
 * the user's own editor preferences, so an app that embeds the editor keeps the settings the user
 * has on tldraw.com. Workspace administration (membership, roles, invite links, deleting the
 * workspace) and the rest of the user row are not among them.
 *
 * The token stands for what the user handed an agent — Claude, ChatGPT, Cursor — for a stated
 * purpose, which is working on boards. The mutators check roles, so nothing here lets the agent do
 * what its user could not; this keeps it from doing everything its user could. A mutator missing
 * from the set is unknown to the push processor, and a push naming it is refused.
 */
const MCP_MUTATOR_NAMES = [
	'file',
	'file_state',
	'createFile',
	'pinFile',
	'unpinFile',
	'removeFileFromWorkspace',
	'onEnterFile',
	'updateUserPreferences',
] as const satisfies readonly (keyof ReturnType<typeof createMutators>)[]

export type McpMutators = Pick<
	ReturnType<typeof createMutators>,
	(typeof MCP_MUTATOR_NAMES)[number]
>

export function createMcpMutators(userId: string): McpMutators {
	const all = createMutators(userId)
	return Object.fromEntries(MCP_MUTATOR_NAMES.map((name) => [name, all[name]])) as McpMutators
}
