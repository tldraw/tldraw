import { DEFAULT_INITIAL_SNAPSHOT } from '@tldraw/sync-core'
import { lns, uniqueId } from '@tldraw/utils'
import { createRouter, notFound } from '@tldraw/worker-shared'
import { getR2KeyForRoom, getR2KeyForSnapshot } from './r2'
import {
	deleteEvalsFixtureSession,
	evalsFixtureMcp,
	planEvalsFixtureScreenshots,
	putEvalsFixtureBoard,
} from './routes/tla/evalsLocalMcp'
import { isDebugLogging, type Environment } from './types'
import { getRoomDurableObject } from './utils/durableObjects'

interface CreateLegacyRoomBody {
	slug?: string
	readonlySlug?: string
	legacyReadonlySlug?: string
	snapshotSlug?: string
	historyTimestamp?: string
}

export const testRoutes = createRouter<Environment>()
	.all('/app/__test__/*', (_, env) => {
		if (!isDebugLogging(env)) return notFound()
		return undefined
	})
	.post('/app/__test__/evals/plan', planEvalsFixtureScreenshots)
	.put('/app/__test__/evals/sessions/:sessionId/boards/:boardId', putEvalsFixtureBoard)
	.post('/app/__test__/evals/sessions/:sessionId/mcp', evalsFixtureMcp)
	.delete('/app/__test__/evals/sessions/:sessionId', deleteEvalsFixtureSession)
	.post('/app/__test__/legacy-room', async (req, env) => {
		const body = (await req.json().catch(() => ({}))) as CreateLegacyRoomBody
		const slug = body.slug ?? uniqueId()
		const readonlySlug = body.readonlySlug ?? uniqueId()
		const legacyReadonlySlug = body.legacyReadonlySlug ?? uniqueId()
		const legacyReadonlyActualSlug = lns(legacyReadonlySlug)
		const snapshotSlug = body.snapshotSlug ?? `v2_c_${uniqueId()}`
		const historyTimestamp = body.historyTimestamp ?? new Date().toISOString()
		const snapshot = DEFAULT_INITIAL_SNAPSHOT

		await getRoomDurableObject(env, slug).__admin__createLegacyRoom(slug)
		await getRoomDurableObject(env, legacyReadonlyActualSlug).__admin__createLegacyRoom(
			legacyReadonlyActualSlug
		)

		await env.SLUG_TO_READONLY_SLUG.put(slug, readonlySlug)
		await env.READONLY_SLUG_TO_SLUG.put(readonlySlug, slug)

		await env.ROOMS_HISTORY_EPHEMERAL.put(
			`${getR2KeyForRoom({ slug, isApp: false })}/${historyTimestamp}`,
			JSON.stringify(snapshot)
		)

		await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.put(snapshotSlug, slug)
		await env.ROOM_SNAPSHOTS.put(
			getR2KeyForSnapshot({ parentSlug: slug, snapshotSlug, isApp: false }),
			JSON.stringify({
				parent_slug: slug,
				drawing: snapshot,
			})
		)

		return Response.json({
			slug,
			readonlySlug,
			legacyReadonlySlug,
			snapshotSlug,
			historyTimestamp,
		})
	})
	.all('*', notFound)
