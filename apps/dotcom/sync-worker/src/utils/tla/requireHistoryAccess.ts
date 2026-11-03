import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { requireAdminAccess, requireAuth } from './getAuth'
import { hasWriteAccessToFile } from './hasWriteAccessToFile'

/**
 * The gate for listing, previewing and restoring a board's history. A signed-in user who can edit
 * an app file may use its history; staff may use any board's history. Legacy rooms have no owner,
 * so only staff get in.
 */
export async function requireHistoryAccess(
	request: IRequest,
	env: Environment,
	roomId: string,
	isApp: boolean,
	opts: { raw?: boolean } = {}
): Promise<void> {
	const auth = await requireAuth(request, env)

	// Raw versions (every persist, system writes included) are a support tool.
	if (isApp && !opts.raw) {
		const db = createPostgresConnectionPool(env, 'sync-worker/requireHistoryAccess')
		try {
			if (await hasWriteAccessToFile(db, roomId, auth.userId)) return
		} finally {
			await db.destroy()
		}
	}

	await requireAdminAccess(env, auth)
}
