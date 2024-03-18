import { IRequest } from 'itty-router'
import { nanoid } from 'nanoid'
import { Environment } from '../types'
import { fourOhFour } from '../utils/fourOhFour'

// Return a URL to a readonly version of the room
export async function getReadonlySlug(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) return fourOhFour()

	let slug = await env.SLUG_TO_READONLY_SLUG.get(roomId)

	if (!slug) {
		slug = nanoid()
		await env.SLUG_TO_READONLY_SLUG.put(roomId, slug)
		await env.READONLY_SLUG_TO_SLUG.put(slug, roomId)
	}
	return new Response(
		JSON.stringify({
			slug,
		})
	)
}
