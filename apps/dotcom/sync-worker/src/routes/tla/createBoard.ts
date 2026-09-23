import { zeroKysely } from '@rocicorp/zero/server/adapters/kysely'
import { DB, MAX_NUMBER_OF_FILES, can, createMutators, schema } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { Kysely, sql } from 'kysely'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { getFileEffectProcessor } from '../../utils/durableObjects'
import {
	CreatableWorkspace,
	ToolResult,
	getWorkspaceFullMessage,
	resolveCreateBoardWorkspace,
	toolError,
} from './boardTools'

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
				await trx
					.selectFrom('group')
					.select('group.id')
					.where('group.id', '=', target.id)
					.forNoKeyUpdate()
					.execute()
				if ((await countWorkspaceBoards(trx, target.id)) >= MAX_NUMBER_OF_FILES) {
					return {
						ok: false,
						reason: 'workspace_full',
						result: toolError(getWorkspaceFullMessage(target, MAX_NUMBER_OF_FILES)),
					}
				}

				// The same mutator the client pushes, so the role check, id validation and the rows it
				// writes (file, group_file, file_state) cannot drift from a board created on tldraw.com.
				const boardId = uniqueId()
				await createMutators(userId).createFile(tx, {
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

// Every workspace the caller may add boards to. The home workspace is read by its id as well, and as
// its owner, the way the mutator's getRole treats it, because it can exist without a group_user row.
//
// Two index-served arms rather than one join filtered on `group_user."userId" = $1 OR "group".id = $1`:
// an OR across both sides of a left join can only be applied after the join, which walks every row of
// `group` — one per user. The home workspace usually comes back from both arms, so rows are deduped.
async function getCreatableWorkspaces(
	db: Kysely<DB>,
	userId: string
): Promise<CreatableWorkspace[]> {
	const rows = await db
		.selectFrom('group_user')
		.innerJoin('group', 'group.id', 'group_user.groupId')
		.select(['group.id', 'group.name', 'group_user.role'])
		.where('group_user.userId', '=', userId)
		.where('group.isDeleted', '=', false)
		.unionAll(
			db
				.selectFrom('group')
				.select(['group.id', 'group.name', sql<'owner'>`'owner'`.as('role')])
				.where('group.id', '=', userId)
				.where('group.isDeleted', '=', false)
		)
		.execute()

	const seen = new Set<string>()
	return rows
		.filter((row) => !seen.has(row.id) && seen.add(row.id))
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
