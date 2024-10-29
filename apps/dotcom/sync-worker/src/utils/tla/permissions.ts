import { TldrawAppUserRecordType } from '@tldraw/dotcom-shared'
import { Result } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { getAuth } from './getAuth'
import { getTldrawAppDurableObject } from './getTldrawAppDurableObject'

export type FileOwnerStatusError = 'unauthorized' | 'not-found' | 'forbidden'

export function fileOwnerStatusErrorResponse(error: FileOwnerStatusError) {
	switch (error) {
		case 'forbidden':
			return new Response(JSON.stringify({ error: true, message: 'Forbidden' }), { status: 403 })
		case 'not-found':
			return new Response(JSON.stringify({ error: true, message: 'Not found' }), { status: 404 })
		case 'unauthorized':
			return new Response(JSON.stringify({ error: true, message: 'Unauthorized' }), { status: 401 })
	}
}

export async function getUserIdFromRequest(request: IRequest, env: Environment) {
	const auth = await getAuth(request, env)
	if (!auth) return null
	return TldrawAppUserRecordType.createId(auth.userId)
}

export async function getFileOwnerStatus(request: IRequest, env: Environment, slug: string) {
	const app = getTldrawAppDurableObject(env)
	const file = await app.getFileBySlug(slug)
	if (!file) return Result.err<FileOwnerStatusError>('not-found')
	const userId = await getUserIdFromRequest(request, env)
	if (!userId) return Result.err<FileOwnerStatusError>('unauthorized')
	if (file.ownerId === userId) {
		return Result.ok(true)
	}
	return Result.err<FileOwnerStatusError>('forbidden')
}
