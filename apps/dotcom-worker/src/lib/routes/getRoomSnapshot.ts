import { RoomSnapshot } from '@tldraw/tlsync'
import { IRequest } from 'itty-router'
import { Environment } from '../types'
import { createSupabaseClient, noSupabaseSorry } from '../utils/createSupabaseClient'
import { fourOhFour } from '../utils/fourOhFour'
import { getSnapshotsTable } from '../utils/getSnapshotsTable'

// Returns a snapshot of the room at a given point in time
export async function getRoomSnapshot(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) return fourOhFour()

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

	if (!data) return fourOhFour()

	// Send back the snapshot!
	return new Response(
		JSON.stringify({
			records: data.documents.map((d) => d.state),
			schema: data.schema,
			error: false,
		})
	)
}
