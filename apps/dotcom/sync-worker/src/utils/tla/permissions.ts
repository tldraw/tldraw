import { IRequest } from 'itty-router'
import { Environment } from '../../types'
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

export async function getUserIdFromRequest(request: IRequest, env: Environment) {
	const auth = await getAuth(request, env)
	if (!auth) return null
	return auth.userId
}
