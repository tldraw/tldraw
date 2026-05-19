import { IRequest, StatusError } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { hashApiToken, isApiTokenShaped } from './hashApiToken'

export interface ApiTokenAuth {
	userId: string
	tokenId: string
}

function extractBearer(request: IRequest): string | null {
	const header = request.headers.get('Authorization') ?? request.headers.get('authorization')
	if (!header) return null
	const match = /^Bearer\s+(.+)$/i.exec(header)
	return match ? match[1].trim() : null
}

/**
 * Authenticates a request via API token (not Clerk). Throws 401 on failure.
 * Returns the user the token was issued for.
 */
export async function requireApiTokenAuth(
	request: IRequest,
	env: Environment
): Promise<ApiTokenAuth> {
	const rawToken = extractBearer(request)
	if (!rawToken || !isApiTokenShaped(rawToken)) {
		throw new StatusError(401, 'Missing or malformed API token')
	}

	const tokenHash = await hashApiToken(rawToken)
	const db = createPostgresConnectionPool(env, 'sync-worker/requireApiTokenAuth')
	try {
		const row = await db
			.selectFrom('api_token')
			.select(['id', 'userId', 'revokedAt'])
			.where('tokenHash', '=', tokenHash)
			.executeTakeFirst()

		if (!row) throw new StatusError(401, 'Invalid API token')
		if (row.revokedAt) throw new StatusError(401, 'Token revoked')

		// Fire-and-forget lastUsedAt update; don't block the request.
		db.updateTable('api_token')
			.set({ lastUsedAt: Date.now() })
			.where('id', '=', row.id)
			.execute()
			.catch(() => {})

		return { userId: row.userId, tokenId: row.id }
	} finally {
		await db.destroy()
	}
}
