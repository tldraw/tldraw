import { Environment } from '../environment'
import { AuthenticatedRequest } from '../worker'

export async function streamTextHandler(request: AuthenticatedRequest, env: Environment) {
	// Auth is already validated and attached by requireTldrawEmail middleware
	const auth = request.auth

	// Read the body once and convert to string
	const bodyText = await request.text()

	// Use the user's ID for the durable object routing
	const id = env.AGENT_DURABLE_OBJECT.idFromName(auth.userId)
	const DO = env.AGENT_DURABLE_OBJECT.get(id)

	// Create a NEW request with /stream-text path
	const url = new URL(request.url)
	url.pathname = '/stream-text'

	const response = await DO.fetch(url.toString(), {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: bodyText,
	})

	// Return the response directly, don't wrap it again
	return response
}
