import { TldrawAppFile } from '@tldraw/dotcom-shared'
import { Result } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { APP_ID } from '../TLAppDurableObject'
import { Environment } from '../types'
import { getAuth } from './getAuth'

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

export async function getFileOwnerStatus(request: IRequest, env: Environment, slug: string) {
	const auth = await getAuth(request, env)
	if (!auth?.userId) return Result.err<FileOwnerStatusError>('unauthorized')
	const file = await getFile(env, slug)
	if (!file) return Result.err<FileOwnerStatusError>('not-found')
	if (file.ownerId === `user:${auth.userId}`) {
		return Result.ok(true)
	}
	return Result.err<FileOwnerStatusError>('forbidden')
}

export async function getFile(env: Environment, slug: string): Promise<TldrawAppFile | null> {
	const d1Result = await env.DB.prepare('select * from records where topicId = ?1 and id = ?2')
		.bind(APP_ID, `file:${slug}`)
		.first()
	if (!d1Result) return null
	return JSON.parse((d1Result as any).record)
}
