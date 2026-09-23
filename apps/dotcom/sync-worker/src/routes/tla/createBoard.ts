import { zeroPostgresJS } from '@rocicorp/zero/server/adapters/postgresjs'
import { DB, MAX_NUMBER_OF_FILES, can, createMutators, schema } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { Kysely } from 'kysely'
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
	let target: CreatableWorkspace
	try {
		const resolved = resolveCreateBoardWorkspace(
			await getCreatableWorkspaces(db, userId),
			workspace
		)
		if (!resolved.ok) return resolved
		target = resolved.workspace

		// The createFile mutator has no file limit — the client enforces it before calling — so without
		// this an agent in a loop could fill a workspace past what the UI lets anyone manage.
		if ((await countWorkspaceBoards(db, target.id)) >= MAX_NUMBER_OF_FILES) {
			return {
				ok: false,
				reason: 'workspace_full',
				result: toolError(getWorkspaceFullMessage(target, MAX_NUMBER_OF_FILES)),
			}
		}
	} finally {
		await db.destroy()
	}

	// Through the same mutator the client pushes, so the role check, id validation and the rows it
	// writes (file, group_file, file_state) cannot drift from a board created on tldraw.com.
	const boardId = uniqueId()
	await zeroPostgresJS(schema, env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING).transaction((tx) =>
		createMutators(userId).createFile(tx, {
			fileId: boardId,
			workspaceId: target.id,
			name,
			time: Date.now(),
			createSource: null,
		})
	)

	// The insert queued an outbox row; wake its consumer the way /app/zero/mutate does. A poke failure
	// must not fail a create that already committed — the consumer drains on its own schedule too.
	ctx?.waitUntil(
		getFileEffectProcessor(env)
			.poke()
			.catch((e) => console.error('outbox poke failed', e))
	)

	return { ok: true, boardId, workspace: target }
}

// Every workspace the caller may add boards to. The home workspace is admitted on its id alone, the
// way the mutator's getRole does, because it can exist without a group_user row.
async function getCreatableWorkspaces(
	db: Kysely<DB>,
	userId: string
): Promise<CreatableWorkspace[]> {
	const rows = await db
		.selectFrom('group')
		.leftJoin('group_user', (join) =>
			join.onRef('group_user.groupId', '=', 'group.id').on('group_user.userId', '=', userId)
		)
		.select(['group.id', 'group.name', 'group_user.role'])
		.where('group.isDeleted', '=', false)
		.where((eb) => eb.or([eb('group_user.userId', '=', userId), eb('group.id', '=', userId)]))
		.execute()

	return rows
		.filter((row) => row.id === userId || can(row.role, 'addFiles'))
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
