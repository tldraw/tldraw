import {
	BoardPresenceRequestBody,
	BoardPresenceResponseBody,
	MAX_BOARD_PRESENCE_FILE_IDS,
} from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { getRoomDurableObject } from '../../utils/durableObjects'
import { isRoomIdTooLong } from '../../utils/roomIdIsTooLong'
import { requireAuth } from '../../utils/tla/getAuth'

/**
 * Who is on each of a batch of boards right now, for the gallery's visitor avatars.
 *
 * Gated like the `fileVisitors` query whose roster it lights up: only boards the caller has opened
 * themselves (a file_state row). Without the gate, any signed-in user could poll an id they learned
 * and watch who is working on a board they can't see.
 */
export async function getBoardPresence(request: IRequest, env: Environment): Promise<Response> {
	const auth = await requireAuth(request, env)

	let fileIds: string[]
	try {
		const body = (await request.json()) as BoardPresenceRequestBody
		if (!Array.isArray(body.fileIds)) throw new Error('fileIds must be an array')
		fileIds = [...new Set(body.fileIds)].filter(
			(id): id is string => typeof id === 'string' && id !== '' && !isRoomIdTooLong(id)
		)
	} catch {
		return new Response('Invalid JSON', { status: 400 })
	}
	if (fileIds.length > MAX_BOARD_PRESENCE_FILE_IDS) {
		return new Response('Too many file ids', { status: 400 })
	}

	const presence: BoardPresenceResponseBody['presence'] = {}
	if (fileIds.length) {
		const db = createPostgresConnectionPool(env, 'getBoardPresence')
		let visibleFileIds: string[]
		try {
			const rows = await db
				.selectFrom('file_state')
				.select('fileId')
				.where('userId', '=', auth.userId)
				.where('fileId', 'in', fileIds)
				.execute()
			visibleFileIds = rows.map((r) => r.fileId)
		} finally {
			await db.destroy()
		}

		await Promise.all(
			visibleFileIds.map(async (fileId) => {
				const userIds = await getRoomDurableObject(env, fileId).getConnectedUserIds()
				if (userIds.length) presence[fileId] = userIds
			})
		)
	}

	return Response.json({ presence } satisfies BoardPresenceResponseBody, {
		headers: { 'cache-control': 'no-store' },
	})
}
