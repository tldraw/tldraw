import { CreateRoomRequestBody } from '@tldraw/dotcom-shared'
import { RoomSnapshot, schema } from '@tldraw/tlsync'
import { IRequest } from 'itty-router'
import { nanoid } from 'nanoid'
import { getR2KeyForRoom } from '../r2'
import { Environment } from '../types'
import { validateSnapshot } from '../utils/validateSnapshot'

// Sets up a new room based on a provided snapshot, e.g. when a user clicks the "Share" buttons or the "Fork project" buttons.
export async function createRoom(request: IRequest, env: Environment): Promise<Response> {
	// The data sent from the client will include the data for the new room
	const data = (await request.json()) as CreateRoomRequestBody

	// There's a chance the data will be invalid, so we check it first
	const snapshotResult = validateSnapshot(data.snapshot)
	if (!snapshotResult.ok) {
		return Response.json({ error: true, message: snapshotResult.error }, { status: 400 })
	}

	// Create a new slug for the room
	const slug = nanoid()

	// Create the new snapshot
	const snapshot: RoomSnapshot = {
		schema: schema.serialize(),
		clock: 0,
		documents: Object.values(snapshotResult.value).map((r) => ({
			state: r,
			lastChangedClock: 0,
		})),
		tombstones: {},
	}

	// Bang that snapshot into the database
	await env.ROOMS.put(getR2KeyForRoom(slug), JSON.stringify(snapshot))

	// Create a readonly slug and store it
	const readonlySlug = nanoid()
	await env.SLUG_TO_READONLY_SLUG.put(slug, readonlySlug)
	await env.READONLY_SLUG_TO_SLUG.put(readonlySlug, slug)

	// Send back the slug so that the client can redirect to the new room
	return new Response(JSON.stringify({ error: false, slug }))
}
