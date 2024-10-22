import { TldrawAppFile } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { APP_ID } from '../TLAppDurableObject'
import { Environment } from '../types'
import { getAuth } from './getAuth'

export async function isFileOwner(request: IRequest, env: Environment, slug: string) {
	const auth = await getAuth(request, env)
	if (!auth?.userId) return false
	const file = await getFile(env, slug)
	if (!file) return false
	return file.ownerId === `user:${auth.userId}`
}

export async function getFile(env: Environment, slug: string): Promise<TldrawAppFile | null> {
	const d1Result = await env.DB.prepare('select * from records where topicId = ?1 and id = ?2')
		.bind(APP_ID, `file:${slug}`)
		.first()
	if (!d1Result) return null
	return JSON.parse((d1Result as any).record)
}
