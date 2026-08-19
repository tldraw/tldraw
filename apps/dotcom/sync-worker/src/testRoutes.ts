import { TlaUserPartial } from '@tldraw/dotcom-shared'
import { DEFAULT_INITIAL_SNAPSHOT } from '@tldraw/sync-core'
import { IndexKey, lns, uniqueId } from '@tldraw/utils'
import { createRouter, notFound } from '@tldraw/worker-shared'
import { createPostgresConnectionPool } from './postgres'
import { getR2KeyForRoom, getR2KeyForSnapshot } from './r2'
import {
	deleteEvalsFixtureSession,
	evalsFixtureMcp,
	planEvalsFixtureScreenshots,
	putEvalsFixtureBoard,
} from './routes/tla/evalsLocalMcp'
import { isDebugLogging, type Environment } from './types'
import { getFileEffectProcessor, getRoomDurableObject } from './utils/durableObjects'

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
	// Per-test DB isolation for the e2e suites: reset the user's prefs and delete every
	// workspace they belong to (FK cascades take group_user, group_file and owned files;
	// the file deletes flow through the effect outbox like any other delete), then recreate
	// the home workspace. Local-only — isDebugLogging above also passes on preview, which is
	// a real shared deployment.
	.post('/app/__test__/user/:userId/prepare-for-test', async (req, env) => {
		if (env.IS_LOCAL !== 'true') return notFound()
		const userId = req.params.userId
		const db = createPostgresConnectionPool(env, '/app/__test__/prepare-for-test')
		try {
			await db.transaction().execute(async (tx) => {
				const user = await tx
					.selectFrom('user')
					.where('id', '=', userId)
					.select('id')
					.executeTakeFirst()
				if (!user) return

				await tx
					.updateTable('user')
					.set({
						flags: '',
						allowAnalyticsCookie: null,
						enhancedA11yMode: null,
						colorScheme: null,
						locale: null,
						exportBackground: true,
						exportPadding: true,
						exportFormat: 'png',
						inputMode: null,
					} satisfies Omit<TlaUserPartial, 'id'>)
					.where('id', '=', userId)
					.execute()

				const userGroups = await tx
					.selectFrom('group_user')
					.where('userId', '=', userId)
					.select('groupId')
					.execute()
				const groupIds = userGroups.map((g) => g.groupId)
				if (groupIds.length > 0) {
					await tx.deleteFrom('group').where('id', 'in', groupIds).execute()
				}

				await tx
					.insertInto('group')
					.values({
						id: userId,
						name: 'My workspace',
						createdAt: Date.now(),
						updatedAt: Date.now(),
						isDeleted: false,
						inviteSecret: null,
					})
					.onConflict((oc) => oc.doNothing())
					.execute()
				await tx
					.insertInto('group_user')
					.values({
						userId,
						groupId: userId,
						createdAt: Date.now(),
						updatedAt: Date.now(),
						role: 'owner',
						index: 'a1' as IndexKey,
						userColor: '',
						userName: '',
					})
					.onConflict((oc) => oc.doNothing())
					.execute()
			})
		} finally {
			await db.destroy()
		}
		// Best-effort nudge so the deleted files' outbox effects (session kicks, R2 cleanup)
		// land before the next test rather than on the 30s sweep.
		await getFileEffectProcessor(env)
			.poke()
			.catch(() => {})
		return new Response('ok')
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
