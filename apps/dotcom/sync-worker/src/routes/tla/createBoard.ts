import { zeroKysely } from '@rocicorp/zero/server/adapters/kysely'
import { DB, MAX_NUMBER_OF_FILES, can, schema } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { Kysely } from 'kysely'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { getFileEffectProcessor } from '../../utils/durableObjects'
import { createMcpMutators } from '../../utils/tla/mcpMutators'
import {
	CreatableWorkspace,
	ToolResult,
	getWorkspaceFullMessage,
	getWorkspaceGoneMessage,
	resolveCreateBoardWorkspace,
	toolError,
} from './boardTools'
import { getWorkspaceMemberships } from './listWorkspaces'

// The database half of create_board. The model-facing half — the tool definition, how a workspace
// argument is matched and every refusal's wording — lives in boardTools.ts.

export type CreateBoardOutcome =
	| { ok: true; boardId: string; workspace: CreatableWorkspace }
	| {
			ok: false
			reason: 'workspace_not_found' | 'workspace_ambiguous' | 'workspace_full'
			result: ToolResult
	  }

export async function createBoardForUser(
	env: Environment,
	userId: string,
	{ name, workspace }: { name: string; workspace: string | null },
	ctx?: ExecutionContext
): Promise<CreateBoardOutcome> {
	const db = createPostgresConnectionPool(env, 'sync-worker/createBoardForUser')
	try {
		// One transaction on the pool's one connection, so every read below must go through `trx`:
		// a query on `db` would wait for the connection this transaction is holding.
		const outcome = await zeroKysely(schema, db).transaction(
			async (tx): Promise<CreateBoardOutcome> => {
				const trx = tx.dbTransaction.wrappedTransaction
				const resolved = resolveCreateBoardWorkspace(
					await getCreatableWorkspaces(trx, userId),
					workspace
				)
				if (!resolved.ok) return resolved
				const target = resolved.workspace

				// The createFile mutator has no file limit — the client enforces it before calling — so
				// without this an agent in a loop could fill a workspace past what the UI lets anyone
				// manage. The row lock serializes concurrent creates into one workspace; without it two
				// could both count 199. NO KEY so it doesn't block inserts whose foreign keys reference
				// the group (file, group_file, group_user), which FOR UPDATE would.
				//
				// It re-checks isDeleted because the list read above takes no lock: a locking read's
				// WHERE is re-evaluated against the newest committed row, so a workspace deleted in the
				// gap is caught here, and a delete that starts later waits for this transaction.
				const locked = await trx
					.selectFrom('group')
					.select('group.id')
					.where('group.id', '=', target.id)
					.where('group.isDeleted', '=', false)
					.forNoKeyUpdate()
					.execute()
				if (!locked.length) {
					return {
						ok: false,
						reason: 'workspace_not_found',
						result: toolError(getWorkspaceGoneMessage(target)),
					}
				}
				if ((await countWorkspaceBoards(trx, target.id)) >= MAX_NUMBER_OF_FILES) {
					return {
						ok: false,
						reason: 'workspace_full',
						result: toolError(getWorkspaceFullMessage(target, MAX_NUMBER_OF_FILES)),
					}
				}

				// The same mutator the client pushes, so the role check, id validation and the rows it
				// writes (file, group_file, file_state) cannot drift from a board created on tldraw.com.
				// Taken from the MCP set so a tool can only run what an MCP token may push.
				const boardId = uniqueId()
				await createMcpMutators(userId).createFile(tx, {
					fileId: boardId,
					workspaceId: target.id,
					name,
					time: Date.now(),
					createSource: null,
				})
				return { ok: true, boardId, workspace: target }
			}
		)

		if (outcome.ok) {
			// The insert queued an outbox row; wake its consumer the way /app/zero/mutate does. A poke
			// failure must not fail a create that already committed — the consumer drains on its own
			// schedule too.
			ctx?.waitUntil(
				getFileEffectProcessor(env)
					.poke()
					.catch((e) => console.error('outbox poke failed', e))
			)
		}
		return outcome
	} finally {
		await db.destroy()
	}
}

// Every workspace the caller may add boards to.
async function getCreatableWorkspaces(
	db: Kysely<DB>,
	userId: string
): Promise<CreatableWorkspace[]> {
	return (await getWorkspaceMemberships(db, userId))
		.filter((row) => can(row.role, 'addFiles'))
		.map((row) => ({ id: row.id, name: row.name, personal: row.id === userId }))
		.sort((a, b) => Number(b.personal) - Number(a.personal) || a.name.localeCompare(b.name))
}

// Counted the way the client's limit counts: files the workspace owns, not ones merely linked into it.
async function countWorkspaceBoards(db: Kysely<DB>, workspaceId: string): Promise<number> {
	const { count } = await db
		.selectFrom('file')
		.select((eb) => eb.fn.countAll().as('count'))
		.where('file.owningGroupId', '=', workspaceId)
		.where('file.isDeleted', '=', false)
		.executeTakeFirstOrThrow()
	return Number(count)
}
