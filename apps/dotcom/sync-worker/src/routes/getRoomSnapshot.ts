import { RoomSnapshot } from '@tldraw/sync-core'
import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForSnapshot } from '../r2'
import { Environment } from '../types'
import { createSupabaseClient, noSupabaseSorry } from '../utils/createSupabaseClient'
import { getSnapshotsTable } from '../utils/getSnapshotsTable'
import { R2Snapshot } from './createRoomSnapshot'

function generateReponse(roomId: string, data: RoomSnapshot) {
	return new Response(
		JSON.stringify({
			roomId,
			records: data.documents.map((d) => d.state),
			schema: data.schema,
			error: false,
		}),
		{
			headers: { 'content-type': 'application/json' },
		}
	)
}

// Returns a snapshot of the room at a given point in time
export async function getRoomSnapshot(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) return notFound()

	// Get the parent slug if it exists
	const parentSlug = await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.get(roomId)

	// Get the room snapshot from R2
	const snapshot = await env.ROOM_SNAPSHOTS.get(
		getR2KeyForSnapshot({ parentSlug, snapshotSlug: roomId, isApp: false })
	)

	if (snapshot) {
		const data = ((await snapshot.json()) as R2Snapshot)?.drawing as RoomSnapshot
		if (data) {
			return generateReponse(roomId, data)
		}
	}

	// If we can't find the snapshot in R2 then fallback to Supabase
	// Create a supabase client
	const supabase = createSupabaseClient(env)
	if (!supabase) return noSupabaseSorry()

	// Get the snapshot from the table
	const supabaseTable = getSnapshotsTable(env)
	const result = await supabase
		.from(supabaseTable)
		.select('drawing')
		.eq('slug', roomId)
		.maybeSingle()
	const data = result.data?.drawing as RoomSnapshot

	if (!data) return notFound()

	// Send back the snapshot!
	return generateReponse(roomId, data)
}
