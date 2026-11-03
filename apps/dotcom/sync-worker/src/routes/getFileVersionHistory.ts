import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { getRoomDurableObject } from '../utils/durableObjects'
import { isRoomIdTooLong, roomIdIsTooLong } from '../utils/roomIdIsTooLong'
import { requireHistoryAccess } from '../utils/tla/requireHistoryAccess'

function queryString(request: IRequest, key: string): string | undefined {
	const value = request.query?.[key]
	return typeof value === 'string' && value ? value : undefined
}

export async function getFileVersionHistory(request: IRequest, env: Environment) {
	const fileId = request.params.roomId
	if (!fileId) return notFound()
	if (isRoomIdTooLong(fileId)) return roomIdIsTooLong()
	const raw = queryString(request, 'raw') === '1'
	await requireHistoryAccess(request, env, fileId, true, { raw })
	const limit = queryString(request, 'limit')
	const result = await getRoomDurableObject(env, fileId).getVersionHistory({
		fileId,
		before: queryString(request, 'before'),
		limit: limit ? Math.min(Number(limit), 500) : undefined,
		raw,
	})
	return Response.json(result)
}

export async function getFileVersionPoints(request: IRequest, env: Environment) {
	const fileId = request.params.roomId
	if (!fileId) return notFound()
	if (isRoomIdTooLong(fileId)) return roomIdIsTooLong()
	const from = queryString(request, 'from')
	const to = queryString(request, 'to')
	if (!from || !to) return new Response('from and to are required', { status: 400 })
	await requireHistoryAccess(request, env, fileId, true)
	return Response.json(
		await getRoomDurableObject(env, fileId).getVersionPoints({ fileId, from, to })
	)
}

const MAX_VERSION_NAME_LENGTH = 100

export async function saveFileNamedVersion(request: IRequest, env: Environment) {
	const fileId = request.params.roomId
	if (!fileId) return notFound()
	if (isRoomIdTooLong(fileId)) return roomIdIsTooLong()
	const body = (await request.json().catch(() => null)) as { name?: unknown } | null
	const name = typeof body?.name === 'string' ? body.name.trim() : ''
	if (!name || name.length > MAX_VERSION_NAME_LENGTH) {
		return new Response('A name of 1-100 characters is required', { status: 400 })
	}
	await requireHistoryAccess(request, env, fileId, true)
	return Response.json(await getRoomDurableObject(env, fileId).saveNamedVersion({ fileId, name }))
}
