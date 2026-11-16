import { zeroKysely } from '@rocicorp/zero/server/adapters/kysely'
import { can, schema } from '@tldraw/dotcom-shared'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { getFileEffectProcessor } from '../../utils/durableObjects'
import { createMcpMutators } from '../../utils/tla/mcpMutators'
import {
	RENAME_BOARD_FORBIDDEN_MESSAGE,
	RENAME_BOARD_NOT_FOUND_MESSAGE,
	ToolResult,
	toolError,
} from './boardTools'

export type RenameBoardOutcome =
	| { ok: true; previousName: string }
	| { ok: false; reason: 'board_not_found' | 'rename_forbidden'; result: ToolResult }

export async function renameBoardForUser(
	env: Environment,
	userId: string,
	{ boardId, name }: { boardId: string; name: string },
	ctx?: ExecutionContext
): Promise<RenameBoardOutcome> {
	const db = createPostgresConnectionPool(env, 'sync-worker/renameBoardForUser')
	try {
		const outcome = await zeroKysely(schema, db).transaction(
			async (tx): Promise<RenameBoardOutcome> => {
				const trx = tx.dbTransaction.wrappedTransaction

				// The mutator refuses on its own, but with a bare error code. Reading the same access
				// first lets a refusal say why, and lets a board the caller cannot see at all read as
				// missing — the one message every other tool gives, so ids can't be probed for existence.
				const file = await trx
					.selectFrom('file')
					.leftJoin('group_user', (join) =>
						join
							.onRef('group_user.groupId', '=', 'file.owningGroupId')
							.on('group_user.userId', '=', userId)
					)
					.select(['file.name', 'file.shared', 'file.owningGroupId', 'group_user.role'])
					.where('file.id', '=', boardId)
					.where('file.isDeleted', '=', false)
					.executeTakeFirst()
				if (!file) {
					return {
						ok: false,
						reason: 'board_not_found',
						result: toolError(RENAME_BOARD_NOT_FOUND_MESSAGE),
					}
				}
				// The home workspace can have no group_user row; the mutator's getRole treats its owner
				// as owner regardless.
				const role = file.owningGroupId === userId ? 'owner' : file.role
				if (!can(role, 'accessFiles')) {
					return file.shared
						? {
								ok: false,
								reason: 'rename_forbidden',
								result: toolError(RENAME_BOARD_FORBIDDEN_MESSAGE),
							}
						: {
								ok: false,
								reason: 'board_not_found',
								result: toolError(RENAME_BOARD_NOT_FOUND_MESSAGE),
							}
				}

				// The mutator the app's rename pushes, so the access check and immutable-column guard
				// can't drift from a rename on tldraw.com.
				await createMcpMutators(userId).file.update(tx, { id: boardId, name })
				return { ok: true, previousName: file.name }
			}
		)

		if (outcome.ok) {
			// A poke failure must not fail a rename that already committed.
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
