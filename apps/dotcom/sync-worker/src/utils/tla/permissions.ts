import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { getAuth } from './getAuth'

export async function getUserIdFromRequest(request: IRequest, env: Environment) {
	const auth = await getAuth(request, env)
	if (!auth) return null
	return auth.userId
}
