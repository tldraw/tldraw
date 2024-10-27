import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { getTldrawAppDurableObject } from '../utils/tla/getTldrawAppDurableObject'
import { getUserIdFromRequest } from '../utils/tla/permissions'

export async function unpublishFile(request: IRequest, env: Environment): Promise<Response> {
	const { roomId } = request.params
	if (!roomId) {
		return Response.json({ error: true, message: 'Room ID is required' }, { status: 400 })
	}

	const userId = await getUserIdFromRequest(request, env)
	if (!userId) {
		return Response.json({ error: true, message: 'No user' }, { status: 401 })
	}

	const app = getTldrawAppDurableObject(env)

	try {
		await app.unpublishFile(roomId, userId)
		return new Response(JSON.stringify({ error: false }))
	} catch (e: any) {
		return new Response(JSON.stringify({ error: true, message: e.message }), { status: 500 })
	}
}
