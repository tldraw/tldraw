import { IRequest } from 'itty-router'
import { nanoid } from 'nanoid'
import { Environment } from '../types'

// Return a URL to a readonly version of the room
export async function getReadonlySlug(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) {
		return new Response('Bad request', {
			status: 400,
		})
	}

	// TODO: We will also request readonly slugs from existing rooms
	// I guess the best way to solve this is to always create a readonly slug when creating a room
	// then if we can't get it from KV it means we are dealing with a legacy room.
	// In which cakes we should use the legacy logic for generating a readonly slug.
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
