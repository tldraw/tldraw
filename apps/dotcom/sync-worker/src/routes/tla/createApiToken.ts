import { uniqueId } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { requireAuth } from '../../utils/tla/getAuth'
import { generateApiToken, hashApiToken } from '../../utils/tla/hashApiToken'

const MAX_TOKENS_PER_USER = 50

export async function createApiToken(request: IRequest, env: Environment): Promise<Response> {
	const auth = await requireAuth(request, env)

	const db = createPostgresConnectionPool(env, 'sync-worker/createApiToken')
	try {
		const count = await db
			.selectFrom('api_token')
			.select(db.fn.count<number>('id').as('count'))
			.where('userId', '=', auth.userId)
			.where('revokedAt', 'is', null)
			.executeTakeFirst()
		if (count && count.count >= MAX_TOKENS_PER_USER) {
			return Response.json({ error: true, message: 'Token limit reached' }, { status: 400 })
		}

		const rawToken = generateApiToken()
		const tokenHash = await hashApiToken(rawToken)
		const id = uniqueId()
		const createdAt = Date.now()

		await db
			.insertInto('api_token')
			.values({
				id,
				userId: auth.userId,
				tokenHash,
				createdAt,
				lastUsedAt: null,
				revokedAt: null,
			})
			.execute()

		return Response.json({
			error: false,
			id,
			token: rawToken,
			createdAt,
		})
	} finally {
		await db.destroy()
	}
}
