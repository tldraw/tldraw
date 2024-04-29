import { GetReadonlySlugResponseBody } from '@tldraw/dotcom-shared'
import { lns } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { Environment } from '../types'

// Return a URL to a readonly version of the room
export async function getReadonlySlug(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) {
		return new Response('Bad request', {
			status: 400,
		})
	}

	let slug = await env.SLUG_TO_READONLY_SLUG.get(roomId)
	let isLegacy = false

	if (!slug) {
		// For all newly created rooms we add the readonly slug to the KV store.
		// If it does not exist there it means we are trying to get a slug for an old room.
		slug = lns(roomId)
		isLegacy = true
	}
	return new Response(
		JSON.stringify({
			slug,
			isLegacy,
		} satisfies GetReadonlySlugResponseBody)
	)
}
