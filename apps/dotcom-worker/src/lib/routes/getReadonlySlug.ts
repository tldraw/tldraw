import { IRequest } from 'itty-router'
import { fourOhFour } from '../utils/fourOhFour'

// Return a URL to a readonly version of the room
export async function getReadonlySlug(request: IRequest): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) return fourOhFour()

	return new Response(
		JSON.stringify({
			slug: 'here',
		})
	)
}
