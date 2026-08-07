import { TlaFile } from '@tldraw/dotcom-shared'
import { RoomSnapshot, TLObjectStoreAccess } from '@tldraw/sync-core'
import { IRequest } from 'itty-router'
import { loadLiveCommentDocuments, mergeCommentDocumentsIntoSnapshot } from '../../commentRows'
import { createPostgresConnectionPool } from '../../postgres'
import { getR2KeyForRoom } from '../../r2'
import { Environment } from '../../types'
import { writeDataPoint } from '../../utils/analytics'
import { checkReadAccessToFile, getAuth } from '../../utils/tla/getAuth'

/**
 * The payload for a lazy-transport board load. The snapshot's `documentClock` seeds the client's
 * sync clock so a later websocket connect catches up incrementally instead of re-downloading the
 * whole document.
 */
export interface LazyFileSnapshotResponse {
	/** Comments merged in, tombstones stripped (server-only and can be large). */
	snapshot: RoomSnapshot
	isReadonly: boolean
	objectAccess: TLObjectStoreAccess
	fileName: string
}

const DENIAL_STATUS = {
	'not-found': 404,
	'not-authenticated': 401,
	forbidden: 403,
	'rate-limited': 429,
} as const

/**
 * Serve a live app file's document from R2 without waking its durable object. This is the read
 * path for the lazy board transport: the client renders from this snapshot and only dials the
 * websocket on first edit or when the activity poll reports company.
 *
 * Freshness: R2 lags live state by up to the persist throttle while the room is occupied — but an
 * occupied room is exactly what the activity poll reports, and the client dials the socket instead
 * of trusting this snapshot. An unoccupied room's R2 is current as of the last-out persist.
 */
export async function getLazyFileSnapshot(request: IRequest, env: Environment): Promise<Response> {
	const start = Date.now()
	const roomId = request.params.roomId
	const track = (outcome: string, sizeBytes = 0) =>
		writeDataPoint(undefined, env.MEASURE, env, 'lazy_snapshot_load', {
			blobs: [outcome],
			doubles: [Date.now() - start, sizeBytes],
		})

	const db = createPostgresConnectionPool(env, 'getLazyFileSnapshot')
	try {
		const auth = await getAuth(request, env)

		const file = (await db
			.selectFrom('file')
			.selectAll()
			.where('id', '=', roomId)
			.executeTakeFirst()) as TlaFile | undefined
		if (!file) {
			track('not-found')
			return json({ error: 'not-found' }, 404)
		}

		const access = await checkReadAccessToFile({
			env,
			db,
			file,
			auth,
			rateLimitKey: auth?.userId ?? request.headers.get('cf-connecting-ip') ?? 'anon',
		})
		if (!access.ok) {
			track(access.reason)
			return json({ error: access.reason }, DENIAL_STATUS[access.reason])
		}

		const [r2Object, comments] = await Promise.all([
			env.ROOMS.get(getR2KeyForRoom({ slug: roomId, isApp: true })),
			loadLiveCommentDocuments(db, roomId),
		])

		if (!r2Object) {
			// A brand-new file has no R2 object until its first persist — the client falls back
			// to the websocket path, which seeds the room.
			track('not-persisted')
			return json({ error: 'not-persisted' }, 404)
		}

		const snapshot = (await r2Object.json()) as RoomSnapshot
		mergeCommentDocumentsIntoSnapshot(snapshot, comments)
		// Tombstones exist so the room can serve incremental diffs to reconnecting clients; a
		// fresh reader has no use for them and they can dwarf the document itself.
		delete (snapshot as Partial<RoomSnapshot>).tombstones

		const body: LazyFileSnapshotResponse = {
			snapshot,
			isReadonly: access.isReadonly,
			objectAccess: access.objectAccess,
			fileName: file.name,
		}
		const encoded = JSON.stringify(body)
		track('ok', encoded.length)
		return new Response(encoded, {
			headers: {
				'Content-Type': 'application/json',
				// Embeds per-user isReadonly/objectAccess and auth-gated content; must never be
				// cached by a shared cache.
				'Cache-Control': 'no-store',
			},
		})
	} finally {
		await db.destroy()
	}
}

function json(body: object, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
	})
}
