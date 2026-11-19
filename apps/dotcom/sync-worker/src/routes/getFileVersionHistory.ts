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

const MAX_PAGE_LIMIT = 500

export async function getFileVersionHistory(request: IRequest, env: Environment) {
	const fileId = request.params.roomId
	if (!fileId) return notFound()
	if (isRoomIdTooLong(fileId)) return roomIdIsTooLong()
	const raw = queryString(request, 'raw') === '1'
	const limitParam = queryString(request, 'limit')
	const limit = limitParam === undefined ? undefined : Number(limitParam)
	if (limit !== undefined && !(Number.isInteger(limit) && limit >= 1 && limit <= MAX_PAGE_LIMIT)) {
		return new Response(`limit must be an integer from 1 to ${MAX_PAGE_LIMIT}`, { status: 400 })
	}
	await requireHistoryAccess(request, env, fileId, true, { raw })
	const result = await getRoomDurableObject(env, fileId).getVersionHistory({
		fileId,
		before: queryString(request, 'before'),
		limit,
		raw,
	})
	return Response.json(result)
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
