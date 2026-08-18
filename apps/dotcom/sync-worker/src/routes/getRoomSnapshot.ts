import { RoomSnapshot } from '@tldraw/sync-core'
import { notFound } from '@tldraw/worker-shared'
import { IRequest } from 'itty-router'
import { getR2KeyForSnapshot } from '../r2'
import { Environment } from '../types'
import { createSupabaseClient, noSupabaseSorry } from '../utils/createSupabaseClient'
import { getSnapshotsTable } from '../utils/getSnapshotsTable'
import { R2Snapshot } from './createRoomSnapshot'

export async function getSnapshotFromR2(
	env: Environment,
	roomId: string
): Promise<RoomSnapshot | undefined> {
	const parentSlug = await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.get(roomId)
	const object = await env.ROOM_SNAPSHOTS.get(
		getR2KeyForSnapshot({ parentSlug, snapshotSlug: roomId, isApp: false })
	)
	if (!object) return undefined
	return ((await object.json()) as R2Snapshot)?.drawing
}

// Snapshots created before the R2 store live in Supabase.
export async function getSnapshotFromSupabase(
	supabase: NonNullable<ReturnType<typeof createSupabaseClient>>,
	env: Environment,
	roomId: string
): Promise<RoomSnapshot | undefined> {
	const result = await supabase
		.from(getSnapshotsTable(env))
		.select('drawing')
		.eq('slug', roomId)
		.maybeSingle()
	return result.data?.drawing as RoomSnapshot | undefined
}

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

export async function getRoomSnapshot(request: IRequest, env: Environment): Promise<Response> {
	const roomId = request.params.roomId
	if (!roomId) return notFound()

	const r2Data = await getSnapshotFromR2(env, roomId)
	if (r2Data) return generateReponse(roomId, r2Data)

	const supabase = createSupabaseClient(env)
	if (!supabase) return noSupabaseSorry()

	const data = await getSnapshotFromSupabase(supabase, env, roomId)
	if (!data) return notFound()

	return generateReponse(roomId, data)
}
