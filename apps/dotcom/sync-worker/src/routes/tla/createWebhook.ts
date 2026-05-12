import { uniqueId } from '@tldraw/utils'
import { IRequest, StatusError } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { isRoomIdTooLong, roomIdIsTooLong } from '../../utils/roomIdIsTooLong'
import { requireAuth, requireWriteAccessForUser } from '../../utils/tla/getAuth'
import { validateWebhookUrl } from '../../utils/webhookValidation'

const MAX_WEBHOOKS_PER_FILE = 10
const SECRET_PREFIX = 'whsec_'
const SECRET_BODY_LENGTH = 32

export async function createWebhook(request: IRequest, env: Environment): Promise<Response> {
	const fileSlug = request.params.fileSlug
	if (!fileSlug) {
		return Response.json({ error: true, message: 'fileSlug required' }, { status: 400 })
	}
	if (isRoomIdTooLong(fileSlug)) return roomIdIsTooLong()

	const auth = await requireAuth(request, env)
	try {
		await requireWriteAccessForUser(env, auth.userId, fileSlug)
	} catch (e) {
		if (e instanceof StatusError) {
			return Response.json({ error: true, message: e.message }, { status: e.status })
		}
		throw e
	}

	const body = (await request.json().catch(() => null)) as { url?: string } | null
	if (!body) {
		return Response.json({ error: true, message: 'Invalid JSON body' }, { status: 400 })
	}
	const urlValidation = validateWebhookUrl(body.url ?? '', env)
	if (!urlValidation.ok) {
		return Response.json({ error: true, message: urlValidation.message }, { status: 400 })
	}

	const db = createPostgresConnectionPool(env, 'sync-worker/createWebhook')
	try {
		const count = await db
			.selectFrom('file_webhook')
			.select(db.fn.count<number>('id').as('count'))
			.where('fileId', '=', fileSlug)
			.executeTakeFirst()
		if (count && count.count >= MAX_WEBHOOKS_PER_FILE) {
			return Response.json(
				{ error: true, message: 'Webhook limit reached for this file' },
				{ status: 400 }
			)
		}

		const id = uniqueId()
		const secret = SECRET_PREFIX + uniqueId(SECRET_BODY_LENGTH)
		const createdAt = Date.now()
		await db
			.insertInto('file_webhook')
			.values({
				id,
				fileId: fileSlug,
				userId: auth.userId,
				url: body.url!,
				secret,
				createdAt,
			})
			.execute()

		return Response.json({
			error: false,
			id,
			url: body.url,
			secret,
			createdAt,
		})
	} finally {
		await db.destroy()
	}
}
