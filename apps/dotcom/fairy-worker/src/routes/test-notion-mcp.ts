import { Environment } from '../environment'
import { AuthenticatedRequest } from '../worker'

export async function testNotionMCPHandler(request: AuthenticatedRequest, env: Environment) {
	// Auth is already validated and attached by requireTldrawEmail middleware
	const auth = request.auth

	// Use the user's ID for the durable object routing
	const id = env.AGENT_DURABLE_OBJECT.idFromName(auth.userId)
	const DO = env.AGENT_DURABLE_OBJECT.get(id)

	// Create a NEW request with /test-notion-mcp path
	const url = new URL(request.url)
	url.pathname = '/test-notion-mcp'

	console.warn('routes/test-notion-mcp')
	const response = await DO.fetch(url.toString(), {
		method: 'GET',
	})

	// Return the response directly, don't wrap it again
	return response
}
