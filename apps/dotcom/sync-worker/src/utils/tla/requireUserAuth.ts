import { IRequest, StatusError } from 'itty-router'
import { Environment } from '../../types'
import { requireApiTokenAuth } from './getApiTokenAuth'
import { getAuth } from './getAuth'

/**
 * Authenticates a request via either Clerk session OR an API token. Returns
 * the resolved user id. Webhook management routes accept both so the dotcom
 * UI (session-cookie) and headless scripts (API token) can both manage
 * webhooks for files they own.
 */
export async function requireUserAuth(
	request: IRequest,
	env: Environment
): Promise<{ userId: string }> {
	// Prefer Clerk session if present; fall back to API token bearer.
	const sessionAuth = await getAuth(request, env)
	if (sessionAuth) return { userId: sessionAuth.userId }

	const authz = request.headers.get('Authorization') ?? request.headers.get('authorization')
	if (authz && /^Bearer\s+tldr_pat_/i.test(authz)) {
		const tokenAuth = await requireApiTokenAuth(request, env)
		return { userId: tokenAuth.userId }
	}

	throw new StatusError(401, 'Unauthorized')
}
