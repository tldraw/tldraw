import { IRequest } from 'itty-router'
import { Environment } from '../../types'
import { getAuth } from './getAuth'

export async function getUserIdFromRequest(request: IRequest, env: Environment) {
	return (await getAuth(request, env))?.userId ?? null
}
