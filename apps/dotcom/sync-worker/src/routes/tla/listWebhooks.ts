import type { TlaFileWebhookEventType, TlaFileWebhookFilter } from '@tldraw/dotcom-shared'
import { IRequest, StatusError } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { isRoomIdTooLong, roomIdIsTooLong } from '../../utils/roomIdIsTooLong'
import { requireAuth, requireWriteAccessForUser } from '../../utils/tla/getAuth'

function parseFilter(value: unknown): TlaFileWebhookFilter | null {
	if (value === null || value === undefined) return null
	if (typeof value !== 'object') return null
	const paths = (value as { paths?: unknown }).paths
	if (!Array.isArray(paths) || !paths.every((p) => typeof p === 'string')) return null
	if (paths.length === 0) return null
	return { paths }
}

export async function listWebhooks(request: IRequest, env: Environment): Promise<Response> {
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

	const db = createPostgresConnectionPool(env, 'sync-worker/listWebhooks')
	try {
		const rows = await db
			.selectFrom('file_webhook')
			.where('fileId', '=', fileSlug)
			.select(['id', 'url', 'eventType', 'filter', 'createdAt'])
			.orderBy('createdAt', 'asc')
			.execute()

		const webhooks = rows.map((row) => ({
			id: row.id,
			fileId: fileSlug,
			url: row.url,
			eventType: row.eventType as TlaFileWebhookEventType,
			filter: parseFilter(row.filter),
			createdAt: Number(row.createdAt),
		}))

		return Response.json({ error: false, webhooks })
	} finally {
		await db.destroy()
	}
}
