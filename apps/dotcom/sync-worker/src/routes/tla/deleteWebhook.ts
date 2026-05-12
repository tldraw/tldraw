import { IRequest, StatusError } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { isRoomIdTooLong, roomIdIsTooLong } from '../../utils/roomIdIsTooLong'
import { requireAuth, requireWriteAccessForUser } from '../../utils/tla/getAuth'

export async function deleteWebhook(request: IRequest, env: Environment): Promise<Response> {
	const fileSlug = request.params.fileSlug
	const webhookId = request.params.webhookId
	if (!fileSlug || !webhookId) {
		return Response.json(
			{ error: true, message: 'fileSlug and webhookId required' },
			{ status: 400 }
		)
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

	const db = createPostgresConnectionPool(env, 'sync-worker/deleteWebhook')
	try {
		const result = await db
			.deleteFrom('file_webhook')
			.where('id', '=', webhookId)
			.where('fileId', '=', fileSlug)
			.executeTakeFirst()

		if (result.numDeletedRows === 0n) {
			return Response.json({ error: true, message: 'Webhook not found' }, { status: 404 })
		}

		return Response.json({ error: false })
	} finally {
		await db.destroy()
	}
}
