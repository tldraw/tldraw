import { createMutators, TlaMutators, ZErrorCode } from '@tldraw/dotcom-shared'
import { assert } from '@tldraw/utils'

/** The argument keys a mutator is allowed, or, for a group like `file`, the keys for each of its mutators. */
type McpFields<M> = M extends (tx: any, args: infer A) => any
	? readonly (keyof A & string)[]
	: { readonly [K in keyof M]: McpFields<M[K]> }

const FILE_STATE_FIELDS = [
	'userId',
	'fileId',
	'firstVisitAt',
	'lastEditAt',
	'lastSessionState',
	'lastVisitAt',
] as const

/**
 * The mutators a user reached over an OAuth access token may run, and the argument keys each one
 * accepts: the ones that act on a board — creating, renaming, pinning, removing it from a workspace,
 * marking it visited. Workspace administration (membership, roles, invite links, deleting the
 * workspace) is not among them.
 *
 * The token stands for what the user handed an agent — Claude, ChatGPT, Cursor — for a stated
 * purpose, which is working on boards. The mutators check roles, so nothing here lets the agent do
 * what its user could not; this keeps it from doing everything its user could. A mutator missing
 * from the set is unknown to the push processor, and a push naming it is refused.
 *
 * The argument keys are an allowlist because `file.update` writes whatever columns it is given,
 * including sharing and publishing, and publishing makes a board public at once.
 * An unlisted key is refused as `forbidden`, so a column added later stays closed to agents. A group
 * must list every mutator in it, so a new one fails the typecheck until someone decides on it.
 */
const MCP_MUTATOR_FIELDS = {
	file: { update: ['id', 'name'] },
	file_state: { insert: FILE_STATE_FIELDS, update: FILE_STATE_FIELDS },
	createFile: ['fileId', 'workspaceId', 'name', 'time', 'createSource'],
	pinFile: ['fileId', 'workspaceId', 'index'],
	unpinFile: ['fileId', 'workspaceId'],
	removeFileFromWorkspace: ['fileId', 'workspaceId'],
	onEnterFile: ['fileId', 'time'],
} as const satisfies { [K in keyof TlaMutators]?: McpFields<TlaMutators[K]> }

export type McpMutators = Pick<TlaMutators, keyof typeof MCP_MUTATOR_FIELDS>

export function createMcpMutators(userId: string): McpMutators {
	return restrictMcpMutators(createMutators(userId))
}

/** Picks the MCP mutators out of `all`, each refusing any argument key its allowlist leaves out. */
export function restrictMcpMutators(all: TlaMutators): McpMutators {
	return restrict(all, MCP_MUTATOR_FIELDS) as McpMutators
}

function restrict(mutators: any, fields: any): any {
	if (Array.isArray(fields)) {
		const allowed: readonly string[] = fields
		return async (tx: unknown, args: unknown) => {
			assert(args !== null && typeof args === 'object', ZErrorCode.bad_request)
			for (const key of Object.keys(args)) assert(allowed.includes(key), ZErrorCode.forbidden)
			return mutators(tx, args)
		}
	}
	return Object.fromEntries(
		Object.keys(fields).map((name) => [name, restrict(mutators[name], fields[name])])
	)
}
