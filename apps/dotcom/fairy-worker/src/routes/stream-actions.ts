import { Environment } from '../environment'
import { AuthenticatedRequest } from '../worker'

export async function streamActionsHandler(request: AuthenticatedRequest, env: Environment) {
	// Auth is already validated and attached by requireTldrawEmail middleware
	const auth = request.auth

	// Read the body once and convert to string
	const bodyText = await request.text() // or request.json() then JSON.stringify()

	// Use the user's ID for the durable object routing
	const id = env.AGENT_DURABLE_OBJECT.idFromName(auth.userId)
	const DO = env.AGENT_DURABLE_OBJECT.get(id)

	// Create a NEW request body from the text we read
	const response = await DO.fetch(request.url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Is-Admin': request.isAdmin.toString(),
			'X-Has-Fairy-Access': request.hasFairyAccess.toString(),
			'X-User-Id': auth.userId,
		},
		body: bodyText, // Pass the string, not the consumed stream
	})

	// Return the response directly, don't wrap it again
	return response
}
