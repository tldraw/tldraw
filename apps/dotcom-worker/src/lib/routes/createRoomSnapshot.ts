import { CreateSnapshotRequestBody } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { nanoid } from 'nanoid'
import { Environment } from '../types'
import { createSupabaseClient, noSupabaseSorry } from '../utils/createSupabaseClient'
import { getSnapshotsTable } from '../utils/getSnapshotsTable'
import { validateSnapshot } from '../utils/validateSnapshot'

export async function createRoomSnapshot(request: IRequest, env: Environment): Promise<Response> {
	const data = (await request.json()) as CreateSnapshotRequestBody

	const snapshotResult = validateSnapshot(data)
	if (!snapshotResult.ok) {
		return Response.json({ error: true, message: snapshotResult.error }, { status: 400 })
	}

	const roomId = `v2_c_${nanoid()}`

	const persistedRoomSnapshot = {
		parent_slug: data.parent_slug,
		slug: roomId,
		drawing: {
			schema: data.schema,
			clock: 0,
			documents: Object.values(data.snapshot).map((r) => ({
				state: r,
				lastChangedClock: 0,
			})),
			tombstones: {},
		},
	}

	const supabase = createSupabaseClient(env)
	if (!supabase) return noSupabaseSorry()

	const supabaseTable = getSnapshotsTable(env)
	await supabase.from(supabaseTable).insert(persistedRoomSnapshot)

	return new Response(JSON.stringify({ error: false, roomId }))
}
