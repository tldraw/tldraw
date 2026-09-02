import {
	AdminFileAssetsResponseBody,
	AdminFileStatsResponseBody,
	AdminOutboxRowsResponseBody,
	AdminOutboxStatsResponseBody,
	AllowlistEntry,
	FILE_PREFIX,
	FeatureFlagKey,
	FeatureFlagValue,
	LOCAL_FILE_PREFIX,
	PUBLISH_PREFIX,
	ROOM_PREFIX,
	TlaFile,
	WELCOME_CREATE_SOURCE,
} from '@tldraw/dotcom-shared'
import { assert, retry, sleep, uniqueId } from '@tldraw/utils'
import { createRouter } from '@tldraw/worker-shared'
import { StatusError, json } from 'itty-router'
import { sql } from 'kysely'
import PQueue from 'p-queue'
import { getUploadObjectName } from './assetAssociation'
import { summarizeSnapshotDocuments } from './fileStats'
import { MAX_ATTEMPTS } from './outboxDrain'
import { createPostgresConnectionPool } from './postgres'
import { getR2KeyForRoom } from './r2'
import { getFileSnapshot, returnFileSnapshot } from './routes/tla/getFileSnapshot'
import { type Environment } from './types'
import { undeleteFile } from './undeleteFile'
import {
	getFileEffectProcessor,
	getRoomDurableObject,
	getRoomDurableObjectById,
	getRoomDurableObjectId,
} from './utils/durableObjects'
import {
	FEATURE_FLAG_KEYS,
	FeatureFlagUpdate,
	getAllFeatureFlagValues,
	getFeatureFlagType,
	parseAllowlistEmails,
	setFeatureFlag,
} from './utils/featureFlags'
import { getClerkClient, requireAdminAccess, requireAuth } from './utils/tla/getAuth'

/**
 * Resolves the admin's emails to user ids once, at save time, so the request path only ever has to
 * compare the userId `getAuth` already gives it. One query for the whole list rather than a lookup
 * per address, and an email with no tldraw account fails the save instead of being stored as an
 * entry that can never match.
 */
async function resolveAllowlistUsers(
	env: Environment,
	emails: string[]
): Promise<AllowlistEntry[]> {
	if (!emails.length) return []

	const db = createPostgresConnectionPool(env, '/app/admin/feature-flags')
	try {
		const rows = await db
			.selectFrom('user')
			.select(['id', 'email'])
			.where(sql<string>`lower(email)`, 'in', emails)
			.execute()

		const byEmail = new Map(rows.map((row) => [row.email.toLowerCase(), row]))
		const unknown = emails.filter((email) => !byEmail.has(email))
		if (unknown.length) {
			throw new StatusError(400, `No tldraw account for: ${unknown.join(', ')}`)
		}

		// Store the address as the database has it, not as the admin typed it, so the panel shows the
		// account's real email.
		return emails.map((email) => {
			const row = byEmail.get(email)!
			return { userId: row.id, email: row.email }
		})
	} finally {
		await db.destroy()
	}
}

/**
 * Refreshes the email labels an allowlist carries, and marks the entries whose user id no longer
 * resolves to an account.
 *
 * The stored email is written once at save time and never updated, so it rots: an address change
 * leaves an entry that still *works* — matching is by id — while displaying the old address, and
 * re-saving the list as displayed then 400s on a line the admin cannot pick out from the rest. A
 * deleted account leaves an entry that looks like a live grant and matches nobody. Resolved on read
 * instead, which costs the admin panel one query per page load and the request path nothing.
 */
async function withResolvedAllowlistLabels(
	env: Environment,
	flags: Record<string, FeatureFlagValue>
): Promise<Record<string, FeatureFlagValue>> {
	const entriesOf = (flag: FeatureFlagValue) =>
		flag.type === 'allowlist' && Array.isArray(flag.users) ? flag.users : []

	const ids = [
		...new Set(Object.values(flags).flatMap((flag) => entriesOf(flag).map((e) => e.userId))),
	]
	if (!ids.length) return flags

	const db = createPostgresConnectionPool(env, '/app/admin/feature-flags')
	let emailById: Map<string, string>
	try {
		const rows = await db
			.selectFrom('user')
			.select(['id', 'email'])
			.where('id', 'in', ids)
			.execute()
		emailById = new Map(rows.map((row) => [row.id, row.email]))
	} finally {
		await db.destroy()
	}

	return Object.fromEntries(
		Object.entries(flags).map(([key, flag]) => {
			if (flag.type !== 'allowlist') return [key, flag]
			return [
				key,
				{
					...flag,
					users: entriesOf(flag).map((entry) => {
						const email = emailById.get(entry.userId)
						return email ? { ...entry, email } : { ...entry, missing: true }
					}),
				},
			]
		})
	)
}

async function requireUser(env: Environment, q: string) {
	const db = createPostgresConnectionPool(env, '/app/admin/user')
	const userRow = await db
		.selectFrom('user')
		.where((eb) => eb.or([eb('email', '=', q), eb('id', '=', q)]))
		.selectAll()
		.executeTakeFirst()

	if (!userRow) {
		throw new StatusError(404, 'User not found ' + q)
	}
	return userRow
}

export const adminRoutes = createRouter<Environment>()
	.all('/app/admin/*', async (req, env) => {
		const auth = await requireAuth(req, env)
		await requireAdminAccess(env, auth)
	})
	.get('/app/admin/user', async (res, env) => {
		const q = res.query['q']
		if (typeof q !== 'string') {
			return new Response('Missing query param', { status: 400 })
		}
		const userRow = await requireUser(env, q)
		const db = createPostgresConnectionPool(env, '/app/admin/user')
		try {
			const memberships = await db
				.selectFrom('group_user')
				.innerJoin('group', 'group.id', 'group_user.groupId')
				.where('group_user.userId', '=', userRow.id)
				.select(['group.id', 'group.name', 'group.isDeleted', 'group_user.role'])
				.execute()
			const files = await db
				.selectFrom('file')
				.leftJoin('group_file', 'group_file.fileId', 'file.id')
				.where('file.isDeleted', '=', false)
				.where((eb) =>
					eb('group_file.groupId', 'in', memberships.length ? memberships.map((m) => m.id) : [''])
				)
				// distinctOn dedupes before the limit is applied, so a file matching multiple
				// group memberships (join fanout) still only counts once against the 500 cap.
				.distinctOn('file.id')
				.orderBy('file.id')
				.selectAll('file')
				.limit(500)
				.execute()
			return json({ user: userRow, memberships, files })
		} finally {
			await db.destroy()
		}
	})
	.get('/app/admin/outbox', async (res, env) => {
		const db = createPostgresConnectionPool(env, '/app/admin/outbox')
		try {
			const stats = await db
				.selectFrom('effect_outbox')
				.select((eb) => [
					eb.fn.countAll<number>().filterWhere('attempts', '<', MAX_ATTEMPTS).as('pending'),
					eb.fn.countAll<number>().filterWhere('attempts', '>=', MAX_ATTEMPTS).as('parked'),
					eb.fn.min('createdAt').filterWhere('attempts', '<', MAX_ATTEMPTS).as('oldestPending'),
				])
				.executeTakeFirstOrThrow()
			const result: AdminOutboxStatsResponseBody = {
				outbox: {
					pending: Number(stats.pending),
					parked: Number(stats.parked),
					oldestPendingAgeSeconds: stats.oldestPending
						? Math.round((Date.now() - new Date(stats.oldestPending).getTime()) / 1000)
						: null,
				},
			}
			return json(result)
		} finally {
			await db.destroy()
		}
	})
	// Up to 100 outbox rows for manual inspection. Batches the current 'file' row per file-table
	// entity in one query (rather than N+1) so the operator can compare payload vs. live state
	// without a separate lookup per row.
	.get('/app/admin/outbox/rows', async (_res, env) => {
		const db = createPostgresConnectionPool(env, '/app/admin/outbox/rows')
		try {
			// Pending rows first, then parked, so old parked rows can't crowd new pending rows out
			// of the 100-row cap.
			const rows = await db
				.selectFrom('effect_outbox')
				.selectAll()
				.orderBy(sql`("attempts" >= ${sql.raw(String(MAX_ATTEMPTS))})`)
				.orderBy('id')
				.limit(100)
				.execute()

			const fileIds = [
				...new Set(rows.filter((r) => r.tableName === 'file').map((r) => r.entityId)),
			]
			const currentFiles = fileIds.length
				? await db.selectFrom('file').where('id', 'in', fileIds).selectAll().execute()
				: []
			const currentFileById = new Map(currentFiles.map((f) => [f.id, f]))

			const now = Date.now()
			const result: AdminOutboxRowsResponseBody = {
				rows: rows.map((row) => ({
					...row,
					createdAt: row.createdAt.toISOString(),
					nextRetryAt: row.nextRetryAt ? row.nextRetryAt.toISOString() : null,
					ageSeconds: Math.round((now - row.createdAt.getTime()) / 1000),
					parked: row.attempts >= MAX_ATTEMPTS,
					currentEntity:
						row.tableName === 'file' ? (currentFileById.get(row.entityId) ?? null) : null,
				})),
			}
			return json(result)
		} finally {
			await db.destroy()
		}
	})
	.post('/app/admin/outbox/:id/retry', async (res, env) => {
		const id = Number(res.params.id)
		if (Number.isNaN(id)) {
			throw new StatusError(400, 'id must be numeric')
		}

		const db = createPostgresConnectionPool(env, '/app/admin/outbox/retry')
		let numUpdatedRows: bigint
		try {
			const result = await db
				.updateTable('effect_outbox')
				.set({ attempts: 0, nextRetryAt: null })
				.where('id', '=', id)
				.executeTakeFirst()
			numUpdatedRows = result.numUpdatedRows
		} finally {
			await db.destroy()
		}
		// The drain (or another operator) may have deleted the row concurrently.
		if (numUpdatedRows === 0n) {
			throw new StatusError(404, `Outbox row ${id} not found`)
		}
		// Best-effort nudge: the reset already committed, so a poke failure must not 500 this
		// request; the sweep alarm picks the row up within 30s regardless.
		try {
			await getFileEffectProcessor(env).poke()
		} catch (e) {
			console.error(`Failed to poke effect processor after resetting outbox row ${id}`, e)
		}
		return json({ ok: true })
	})
	.post('/app/admin/outbox/:id/delete', async (res, env) => {
		const id = Number(res.params.id)
		if (Number.isNaN(id)) {
			throw new StatusError(400, 'id must be numeric')
		}

		const db = createPostgresConnectionPool(env, '/app/admin/outbox/delete')
		let numDeletedRows: bigint
		try {
			const result = await db.deleteFrom('effect_outbox').where('id', '=', id).executeTakeFirst()
			numDeletedRows = result.numDeletedRows
		} finally {
			await db.destroy()
		}
		// The drain (or another operator) may have already deleted the row.
		if (numDeletedRows === 0n) {
			throw new StatusError(404, `Outbox row ${id} not found`)
		}
		return json({ ok: true })
	})
	// Maps a durable object id or room slug to the room's activity signals. The id is a one-way
	// hash of the room name, but the room object stores its own identity, so it is asked directly —
	// a never-initialized id resolves to null. A slug (anything that isn't 64-char hex) is hashed
	// forward via idFromName. The brief wake is storage-read only; no room boot. Persist history
	// comes from the version-cache bucket: one timestamped snapshot per persist, so save cadence
	// separates an actively edited room from a parked tab holding a socket open.
	.get('/app/admin/resolve-do-id/:objectIdOrSlug', async (res, env) => {
		const param = res.params.objectIdOrSlug
		let objectId: string
		if (/^[0-9a-f]{64}$/.test(param)) {
			objectId = param
		} else if (/^[0-9a-fA-F]{16,}$/.test(param)) {
			// hex is a subset of the slug charset — without this, a truncated or uppercase id would
			// hash as a slug and report a confident "never initialized"
			throw new StatusError(
				400,
				'looks like a truncated or uppercase durable object id — paste the full 64-char lowercase hex'
			)
		} else if (/^[a-zA-Z0-9_-]+$/.test(param)) {
			objectId = getRoomDurableObjectId(env, param).toString()
		} else {
			throw new StatusError(400, 'pass a 64-char hex durable object id or a room slug')
		}
		let roomDo: ReturnType<typeof getRoomDurableObjectById>
		try {
			// idFromString rejects hex that fails the namespace checksum (garbage, or an id copied
			// from another durable object class)
			roomDo = getRoomDurableObjectById(env, objectId)
		} catch {
			throw new StatusError(400, 'not a valid durable object id for the file namespace')
		}
		const info = await roomDo.__admin__getDocumentInfo()
		if (!info) return json({ objectId, match: null, history: null })

		// Stream the stats instead of collecting objects, so any number of snapshots fits. Keys are
		// ISO timestamps (oldest first); min/max tracking keeps the newest save correct either way.
		const prefix = `${getR2KeyForRoom({ slug: info.slug, isApp: info.isApp })}/`
		let saves = 0
		let totalBytes = 0
		let firstAt: number | null = null
		let lastAt: number | null = null
		let latestSize: number | null = null
		let cursor: string | undefined
		let pages = 0
		let listTruncated = false
		do {
			const page = await env.ROOMS_HISTORY_EPHEMERAL.list({ prefix, cursor })
			for (const obj of page.objects) {
				saves++
				totalBytes += obj.size
				const t = obj.uploaded.getTime()
				if (firstAt === null || t < firstAt) firstAt = t
				if (lastAt === null || t > lastAt) {
					lastAt = t
					latestSize = obj.size
				}
			}
			cursor = page.truncated ? page.cursor : undefined
			// subrequest backstop: 500 pages = 500k snapshots, far beyond any real room
			if (++pages >= 500 && cursor) {
				listTruncated = true
				break
			}
		} while (cursor)

		return json({
			objectId,
			match: info,
			history: {
				saves,
				firstSaveAt: firstAt !== null ? new Date(firstAt).toISOString() : null,
				lastSaveAt: lastAt !== null ? new Date(lastAt).toISOString() : null,
				avgSecondsBetweenSaves:
					saves > 1 && firstAt !== null && lastAt !== null
						? Math.round((lastAt - firstAt) / 1000 / (saves - 1))
						: null,
				latestSizeBytes: latestSize,
				totalSizeBytes: totalBytes,
				listTruncated,
			},
		})
	})
	// Force-closes every session on a file room with CLIENT_TOO_OLD. Shipped clients treat that
	// as terminal — no reconnect, a "please reload" screen — so a room held awake around the
	// clock by parked background tabs on stale bundles can finally hibernate. Resolve the id
	// first and check the verdict: this closes actively edited sessions just the same.
	.post('/app/admin/close-do-sessions/:objectId', async (res, env) => {
		const objectId = res.params.objectId
		if (!/^[0-9a-f]{64}$/.test(objectId)) {
			throw new StatusError(400, 'objectId must be a 64-char lowercase hex string')
		}
		let roomDo: ReturnType<typeof getRoomDurableObjectById>
		try {
			roomDo = getRoomDurableObjectById(env, objectId)
		} catch {
			throw new StatusError(400, 'not a valid durable object id for the file namespace')
		}
		return json(await roomDo.__admin__closeAllSessions())
	})
	.get('/app/admin/feature-flags', async (_req, env) => {
		return json(await withResolvedAllowlistLabels(env, await getAllFeatureFlagValues(env)))
	})
	.post('/app/admin/feature-flags', async (req, env) => {
		const body: any = await req.json()
		const { flag, enabled, percentage, emails } = body

		if (typeof flag !== 'string') {
			throw new StatusError(400, 'flag (string) is required')
		}
		if (enabled !== undefined && typeof enabled !== 'boolean') {
			throw new StatusError(400, 'enabled must be a boolean')
		}
		if (
			percentage !== undefined &&
			(typeof percentage !== 'number' || percentage < 0 || percentage > 100)
		) {
			throw new StatusError(400, 'percentage must be a number between 0 and 100')
		}

		if (!FEATURE_FLAG_KEYS.includes(flag as FeatureFlagKey)) {
			throw new StatusError(400, `Invalid flag. Must be one of: ${FEATURE_FLAG_KEYS.join(', ')}`)
		}
		const flagKey = flag as FeatureFlagKey

		// A field that means nothing for this flag's type is refused rather than dropped. It used to be
		// dropped silently and still answered `{success: true, users: […]}`, so an admin could send an
		// allowlist to a percentage flag, be told it saved, and have nothing stored anywhere.
		const type = getFeatureFlagType(env, flagKey)
		if (percentage !== undefined && type !== 'percentage') {
			throw new StatusError(400, `"${flagKey}" is a ${type} flag; percentage does not apply to it`)
		}
		if (emails !== undefined && type !== 'allowlist') {
			throw new StatusError(400, `"${flagKey}" is a ${type} flag; emails do not apply to it`)
		}

		let update: FeatureFlagUpdate
		if (type === 'allowlist') {
			let users: AllowlistEntry[] | undefined
			if (emails !== undefined) {
				// An allowlist is edited as emails and stored as user ids. Parsing before resolving means a
				// typo is rejected at the point someone can still fix it, rather than sitting in the list
				// looking like it grants access while matching nothing; resolving at save time means an email
				// with no tldraw account fails the save instead of being stored as an entry that can never
				// match.
				let parsed: string[]
				try {
					parsed = parseAllowlistEmails(emails)
				} catch (e) {
					throw new StatusError(400, e instanceof Error ? e.message : String(e))
				}
				users = await resolveAllowlistUsers(env, parsed)
			}
			update = { type, enabled, users }
		} else if (type === 'percentage') {
			update = { type, enabled, percentage }
		} else {
			update = { type, enabled }
		}

		await setFeatureFlag(env, flagKey, update)
		const { type: _type, ...stored } = update
		return json({ success: true, flag, ...stored })
	})
	.post('/app/admin/create_legacy_file', async (_res, env) => {
		const slug = uniqueId()
		await getRoomDurableObject(env, slug).__admin__createLegacyRoom(slug)
		return json({ slug })
	})
	.post('/app/admin/hard_delete_file/:fileId', async (res, env) => {
		const fileId = res.params.fileId
		assert(typeof fileId === 'string', 'fileId is required')

		const pg = createPostgresConnectionPool(env, '/app/admin/hard_delete_file')
		const file = await pg.selectFrom('file').where('id', '=', fileId).selectAll().executeTakeFirst()
		if (!file) {
			if (await maybeHardDeleteLegacyFile({ id: fileId, env })) {
				return new Response('deleted')
			} else {
				return new Response('File not found', { status: 404 })
			}
		}
		return await hardDeleteAppFile({ pg, file, env })
	})
	.post('/app/admin/undelete_file/:fileId', async (res, env) => {
		const fileId = res.params.fileId
		assert(typeof fileId === 'string', 'fileId is required')

		const pg = createPostgresConnectionPool(env, '/app/admin/undelete_file')
		const outcome = await undeleteFile(pg, fileId)
		if (outcome.result === 'not_found') {
			return new Response('File not found', { status: 404 })
		}
		if (outcome.result === 'not_deleted') {
			return new Response('File is not deleted', { status: 400 })
		}
		if (outcome.result === 'group_deleted') {
			return new Response('Owning workspace is deleted — restore the workspace first', {
				status: 409,
			})
		}
		// Best-effort nudge so the restore's effects land promptly; the sweep backstops it, so a
		// poke failure must not fail the request (the restore already committed; a retry would
		// just 400 with 'File is not deleted').
		await getFileEffectProcessor(env)
			.poke()
			.catch(() => {})
		return json({ success: true })
	})
	// Deleted files the user OWNS: legacy direct owner, their home workspace (group id = user
	// id), or a workspace where they hold the owner role. Mere memberships and guest files are
	// excluded — the per-row Undelete button restores files, so the list must only contain files
	// the user legitimately owns. Queried from Postgres because the synced store never surfaces
	// deleted files: the client filters on file.isDeleted, and the join rows that sync a file
	// (file_state, group_file) are removed on delete.
	.get('/app/admin/user/deleted_files', async (res, env) => {
		const q = res.query['q']
		if (typeof q !== 'string') {
			return new Response('Missing query param', { status: 400 })
		}
		const userRow = await requireUser(env, q)
		const pg = createPostgresConnectionPool(env, '/app/admin/user/deleted_files')
		const files = await pg
			.selectFrom('file')
			.leftJoin('group', 'group.id', 'file.owningGroupId')
			.leftJoin('group_user', (join) =>
				join
					.onRef('group_user.groupId', '=', 'file.owningGroupId')
					.on('group_user.userId', '=', userRow.id)
			)
			.where('file.isDeleted', '=', true)
			// A deleted file whose owning workspace is also deleted can't be restored (undeleteFile
			// blocks it, see undeleteFile.ts) until the workspace is restored first, so hide it here.
			.where((eb) =>
				eb.or([eb('group.isDeleted', '=', false), eb('file.owningGroupId', 'is', null)])
			)
			.where((eb) =>
				eb.or([
					eb('file.owningGroupId', '=', userRow.id),
					eb(
						'file.owningGroupId',
						'in',
						eb
							.selectFrom('group_user')
							.select('group_user.groupId')
							.where('group_user.userId', '=', userRow.id)
							.where('group_user.role', '=', 'owner')
					),
				])
			)
			.selectAll('file')
			.select(['group.name as workspaceName', 'group_user.role as workspaceRole'])
			.orderBy('file.updatedAt', 'desc')
			.execute()
		return json(files)
	})
	.post('/app/admin/delete_user', async (res, env) => {
		const q = res.query['q']
		if (typeof q !== 'string') {
			return new Response('Missing query param', { status: 400 })
		}
		const userRow = await requireUser(env, q)

		await performUserDeletion(userRow, env)

		return new Response('User deleted', { status: 200 })
	})
	.get('/app/admin/delete_user_sse', async (res, env) => {
		const q = res.query['q']
		if (typeof q !== 'string') {
			return new Response('Missing query param', { status: 400 })
		}

		const userRow = await requireUser(env, q)

		return new Response(
			new ReadableStream({
				async start(controller) {
					try {
						// Helper function to send progress events
						const sendProgress = (step: string, message: string, details?: any) => {
							const event = {
								type: 'progress',
								step,
								message,
								timestamp: Date.now(),
								details,
							}
							controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`))
						}

						sendProgress('starting', 'Beginning user deletion process...', { userId: userRow.id })

						await performUserDeletion(userRow, env, sendProgress)

						// Send completion event
						const completionEvent = {
							type: 'complete',
							step: 'finished',
							message: 'User deletion completed successfully',
							timestamp: Date.now(),
							details: { userId: userRow.id },
						}
						controller.enqueue(
							new TextEncoder().encode(`data: ${JSON.stringify(completionEvent)}\n\n`)
						)
					} catch (error) {
						// Send error event
						const errorEvent = {
							type: 'error',
							step: 'error',
							message: error instanceof Error ? error.message : 'Unknown error occurred',
							timestamp: Date.now(),
							details: { error: error instanceof Error ? error.stack : String(error) },
						}
						controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
					} finally {
						controller.close()
					}
				},
			}),
			{
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Headers': 'Cache-Control',
				},
			}
		)
	})
	// Read-only asset health report for a file: is each asset's object still in the uploads
	// bucket, and is it associated with the file? Explains files stuck in a zero-progress
	// association loop.
	.get('/app/admin/file-assets/:slug', async (res, env) => {
		const slug = res.params.slug
		assert(typeof slug === 'string', 'slug is required')

		const pg = createPostgresConnectionPool(env, '/app/admin/file-assets')
		const file = await pg
			.selectFrom('file')
			.where('id', '=', slug)
			.select(['id', 'name', 'owningGroupId', 'isDeleted', 'createSource'])
			.executeTakeFirst()

		const snapshot = await getFileSnapshot(env, slug, true)
		if (!snapshot) {
			throw new StatusError(404, `No persisted snapshot for ${slug}`)
		}

		// Mirrors how the association pass parses asset records (see associatePendingAssets)
		const userContentUrl = env.USER_CONTENT_URL
		const assets: Array<{
			assetId: string
			objectName: string
			src: string
			fileIdMeta: string | null
			associated: boolean
			oldFormatUrl: boolean
			inBucket: boolean | null
			sizeBytes: number | null
		}> = []
		let totalShapes = 0
		const shapesByType: Record<string, number> = {}
		// Assets the association pass can never act on (bookmarks, non-http srcs, R2-invalid
		// object names). Counted instead of reported as missing uploads.
		let external = 0
		for (const { state } of snapshot.documents) {
			const record = state as any
			if (record.typeName === 'shape') {
				totalShapes++
				shapesByType[record.type] = (shapesByType[record.type] ?? 0) + 1
				continue
			}
			if (record.typeName !== 'asset') continue
			const src = record.props?.src
			if (!src) continue
			const objectName = getUploadObjectName(record)
			if (!objectName) {
				external++
				continue
			}
			const fileIdMeta = record.meta?.fileId ?? null
			const associated = fileIdMeta === slug
			assets.push({
				assetId: record.id,
				objectName,
				src,
				fileIdMeta,
				associated,
				oldFormatUrl:
					associated &&
					src.startsWith('http') &&
					!!userContentUrl &&
					!src.startsWith(userContentUrl),
				// null until the head check settles; a failed check stays null so R2 flakiness
				// doesn't read as a confirmed-missing object
				inBucket: null,
				sizeBytes: null,
			})
		}

		// Bounded concurrency keeps us inside the worker's connection budget; persistent head
		// failures become warnings rather than failing the report
		const warnings: string[] = []
		const headQueue = new PQueue({ concurrency: 5 })
		await headQueue.addAll(
			assets.map((asset) => async () => {
				try {
					const head = await retry(() => env.UPLOADS.head(asset.objectName), {
						attempts: 2,
						waitDuration: 500,
					})
					asset.inBucket = !!head
					asset.sizeBytes = head?.size ?? null
				} catch (e) {
					warnings.push(`head failed for ${asset.objectName}: ${e}`)
				}
			})
		)

		// Cross-check the asset table both ways: which fileId the DB thinks owns each referenced
		// object, and rows claimed by this file whose objects the snapshot no longer references
		const referencedSet = new Set(assets.map((a) => a.objectName))
		const [dbRowsForReferenced, rowsForThisFile] = await Promise.all([
			referencedSet.size > 0
				? pg
						.selectFrom('asset')
						.where('objectName', 'in', [...referencedSet])
						.select(['objectName', 'fileId'])
						.execute()
				: [],
			pg.selectFrom('asset').where('fileId', '=', slug).select(['objectName']).execute(),
		])
		const dbFileIdByObjectName = new Map(dbRowsForReferenced.map((r) => [r.objectName, r.fileId]))
		const orphaned = rowsForThisFile.filter((row) => !referencedSet.has(row.objectName)).length

		// Mirrors loadCreateSourceData: exists means seeding from this source would find content.
		// Readonly and snapshot prefixes need slug translation to check, so they report null (not
		// checked), as does a failed check.
		let source: { raw: string; exists: boolean | null } | null = null
		if (file?.createSource) {
			const raw = file.createSource
			const [prefix, id] = raw.split('/')
			let exists: boolean | null = null
			try {
				if (raw === WELCOME_CREATE_SOURCE || prefix === LOCAL_FILE_PREFIX) {
					exists = true
				} else if (prefix === FILE_PREFIX && id) {
					exists = !!(await env.ROOMS.head(getR2KeyForRoom({ slug: id, isApp: true })))
				} else if (prefix === PUBLISH_PREFIX && id) {
					exists = !!(await pg
						.selectFrom('file')
						.where('publishedSlug', '=', id)
						.where('published', '=', true)
						.select('id')
						.executeTakeFirst())
				} else if (prefix === ROOM_PREFIX && id) {
					exists = !!(await env.ROOMS.head(getR2KeyForRoom({ slug: id, isApp: false })))
				}
			} catch (e) {
				warnings.push(`createSource check failed for ${raw}: ${e}`)
				exists = null
			}
			source = { raw, exists }
		}

		let associated = 0
		let oldFormatUrls = 0
		let missingInBucket = 0
		let headFailures = 0
		let totalSizeBytes = 0
		let largestSizeBytes = 0
		for (const a of assets) {
			if (a.associated) associated++
			if (a.oldFormatUrl) oldFormatUrls++
			if (a.inBucket === false) missingInBucket++
			if (a.inBucket === null) headFailures++
			if (a.sizeBytes !== null) {
				totalSizeBytes += a.sizeBytes
				largestSizeBytes = Math.max(largestSizeBytes, a.sizeBytes)
			}
		}

		const report: AdminFileAssetsResponseBody = {
			file: file ?? null,
			source,
			shapes: { total: totalShapes, byType: shapesByType },
			assets: {
				// Every asset record in the snapshot; the upload-oriented counts below exclude
				// the `external` ones
				total: assets.length + external,
				associated,
				pending: assets.length - associated,
				external,
				oldFormatUrls,
				missingInBucket,
				headFailures,
				totalSizeBytes,
				largestSizeBytes,
				problems: assets
					.filter((a) => !a.associated || a.inBucket !== true)
					.map((a) => ({
						assetId: a.assetId,
						objectName: a.objectName,
						src: a.src,
						fileIdMeta: a.fileIdMeta,
						inBucket: a.inBucket,
						dbRow: dbFileIdByObjectName.has(a.objectName)
							? { fileId: dbFileIdByObjectName.get(a.objectName)! }
							: null,
					})),
			},
			dbRows: { forThisFile: rowsForThisFile.length, orphaned },
			warnings,
		}
		return json(report)
	})
	// A board's shape without its contents. Answers "how big and how unusual is this board" for
	// perf reports, migration bugs, and support threads without anyone having to open it — and
	// without putting anything a user typed into the report. Read AdminFileStatsResponseBody
	// before adding a field: staying content-free is the point of this endpoint.
	.get('/app/admin/file-stats/:slug', async (res, env) => {
		const slug = res.params.slug
		assert(typeof slug === 'string', 'slug is required')

		const warnings: string[] = []
		const pg = createPostgresConnectionPool(env, '/app/admin/file-stats')
		const [fileRow, snapshot, head] = await Promise.all([
			pg
				.selectFrom('file')
				.where('id', '=', slug)
				.select([
					'owningGroupId',
					'createdAt',
					'updatedAt',
					'isDeleted',
					'isEmpty',
					'published',
					'shared',
					'sharedLinkType',
					'createSource',
				])
				.executeTakeFirst(),
			getFileSnapshot(env, slug, true),
			env.ROOMS.head(getR2KeyForRoom({ slug, isApp: true })).catch((e) => {
				// Label only: an R2 error stringifies to the object key, which names the board
				console.error('file-stats snapshot head failed', e)
				warnings.push('snapshot head failed')
				return null
			}),
		])
		if (!snapshot) {
			throw new StatusError(404, `No persisted snapshot for ${slug}`)
		}

		const summary = summarizeSnapshotDocuments(snapshot.documents)

		// file_visitor, comment_thread, and comment all have a fileId index. file_state is
		// deliberately not counted here: its primary key is (userId, fileId), so counting by fileId
		// would sequentially scan the whole table.
		const countRows = async (
			label: string,
			query: Promise<{ count: number | string | bigint } | undefined>
		) => {
			try {
				return Number((await query)?.count ?? 0)
			} catch (e) {
				// Label only: a query error can carry table, column, and parameter detail
				console.error(`file-stats ${label} count failed`, e)
				warnings.push(`${label} count failed`)
				return 0
			}
		}
		const [visitors, commentThreads, comments] = await Promise.all([
			countRows(
				'file_visitor',
				pg
					.selectFrom('file_visitor')
					.where('fileId', '=', slug)
					.select((eb) => eb.fn.countAll<number>().as('count'))
					.executeTakeFirst()
			),
			countRows(
				'comment_thread',
				pg
					.selectFrom('comment_thread')
					.where('fileId', '=', slug)
					.where('isDeleted', '=', false)
					.select((eb) => eb.fn.countAll<number>().as('count'))
					.executeTakeFirst()
			),
			countRows(
				'comment',
				pg
					.selectFrom('comment')
					.where('fileId', '=', slug)
					.where('isDeleted', '=', false)
					.select((eb) => eb.fn.countAll<number>().as('count'))
					.executeTakeFirst()
			),
		])

		const schema = snapshot.schema as
			| { schemaVersion?: number; sequences?: Record<string, number> }
			| undefined
		const createSourceKind = fileRow?.createSource?.split('/')[0] ?? null

		const { recordsByTypeName, ...snapshotStats } = summary
		const stats: AdminFileStatsResponseBody = {
			file: fileRow
				? {
						ownerType: fileRow.owningGroupId ? 'group' : 'none',
						createdAt: fileRow.createdAt,
						updatedAt: fileRow.updatedAt,
						isDeleted: fileRow.isDeleted,
						isEmpty: fileRow.isEmpty,
						published: fileRow.published,
						shared: fileRow.shared,
						sharedLinkType: fileRow.sharedLinkType,
						createSourceKind,
					}
				: null,
			snapshot: {
				sizeBytes: head?.size ?? null,
				clock: snapshot.clock ?? null,
				documentClock: snapshot.documentClock ?? null,
				tombstones: Object.keys(snapshot.tombstones ?? {}).length,
				records: snapshot.documents.length,
				recordsByTypeName,
				schemaVersion: schema?.schemaVersion ?? null,
				sequences: schema?.sequences ?? null,
			},
			...snapshotStats,
			collaboration: { visitors, commentThreads, comments },
			warnings,
		}
		return json(stats)
	})
	.get('/app/admin/download-tldr/:fileSlug', async (res, env) => {
		const fileSlug = res.params.fileSlug
		assert(typeof fileSlug === 'string', 'fileSlug is required')
		return await returnFileSnapshot(env, fileSlug, true)
	})
	.get('/app/admin/download-legacy-tldr/:fileSlug', async (res, env) => {
		const fileSlug = res.params.fileSlug
		assert(typeof fileSlug === 'string', 'fileSlug is required')
		return await returnFileSnapshot(env, fileSlug, false)
	})
	// The current welcome template (the file new workspaces fork their first file from), or
	// null when none is set and the committed default is used. Also reports whether the marked
	// file is still live and published: the resolver silently falls back to the default if it
	// isn't, so the admin needs to see a stale pointer rather than assume it's working. See
	// resolveWelcomeSnapshot.
	.get('/app/admin/welcome-template', async (_res, env) => {
		const pg = createPostgresConnectionPool(env, '/app/admin/welcome-template')
		const row = await pg.selectFrom('welcome_template').selectAll().executeTakeFirst()
		if (!row) return json(null)
		const file = await pg
			.selectFrom('file')
			.where('id', '=', row.fileId)
			.select(['published', 'isDeleted'])
			.executeTakeFirst()
		const live = !!file && !file.isDeleted && file.published
		return json({ ...row, live })
	})
	// Mark a published file as the welcome template. We store its publishedSlug, so the file
	// must be published first; new workspaces then fork its published snapshot.
	.post('/app/admin/welcome-template', async (req, env) => {
		const { fileId } = (await req.json()) as { fileId?: unknown }
		assert(typeof fileId === 'string' && fileId.length > 0, 'fileId (string) is required')

		const pg = createPostgresConnectionPool(env, '/app/admin/welcome-template')
		const file = await pg
			.selectFrom('file')
			.where('id', '=', fileId)
			.select(['id', 'published', 'publishedSlug', 'isDeleted'])
			.executeTakeFirst()
		if (!file) throw new StatusError(404, `File not found: ${fileId}`)
		if (!file.published) {
			throw new StatusError(400, 'File must be published before it can be the welcome template')
		}

		const updatedAt = Date.now()
		await pg
			.insertInto('welcome_template')
			.values({ id: true, fileId: file.id, publishedSlug: file.publishedSlug, updatedAt })
			.onConflict((oc) =>
				oc
					.column('id')
					.doUpdateSet({ fileId: file.id, publishedSlug: file.publishedSlug, updatedAt })
			)
			.execute()
		// Return the same shape as GET, including `live`, so the admin UI doesn't flash the
		// "not published" warning right after a successful set.
		const live = !file.isDeleted && file.published
		return json({ fileId: file.id, publishedSlug: file.publishedSlug, updatedAt, live })
	})
	// Clear the welcome template, reverting new workspaces to the committed default snapshot.
	.post('/app/admin/welcome-template/clear', async (_res, env) => {
		const pg = createPostgresConnectionPool(env, '/app/admin/welcome-template')
		await pg.deleteFrom('welcome_template').execute()
		return json({ cleared: true })
	})

async function maybeHardDeleteLegacyFile({ id, env }: { id: string; env: Environment }) {
	return await getRoomDurableObject(env, id).__admin__hardDeleteIfLegacy()
}

async function hardDeleteAppFile({
	pg,
	file,
	env,
}: {
	env: Environment
	pg: ReturnType<typeof createPostgresConnectionPool>
	file: TlaFile
}) {
	if (!file.isDeleted) {
		// do soft delete first if not done already; the outbox trigger records it
		await pg.updateTable('file').set('isDeleted', true).where('id', '=', file.id).execute()
	}
	// Session kicks and R2/room cleanup ride the terminal delete-row effect written by the
	// DELETE FROM file below, delivered via the post-delete poke() (sweep backstop ~30s); the
	// soft-delete row's effect is staleness-guarded, so it skips harmlessly if it runs after
	// the row is gone.
	// clean up assets eagerly
	const assets = await pg.selectFrom('asset').where('fileId', '=', file.id).selectAll().execute()
	for (const asset of assets) {
		await env.UPLOADS.delete(asset.objectName)
		// TODO: bust caches
		// it's tricky though. calling caches.default.delete() will only delete the cache entry
		// in the local datacenter so we'd need to do a global cache bust with the REST API
		// either that or maintain a KV store of deleted assets and check that before serving
		// could maybe use a bloom filter if that hurts perf too much.
		// although how would the bloom filter sync across workers 🤔
		// since cache entries last a year we could store a timestamp in the KV and clean it periodically
		// or just let it grow forever, it's not that big.

		// const cacheUrl = new URL(`${appOrigin}/app/uploads/${asset.objectName}`)
		// console.log('Busting our cache entry', asset.objectName)
		// await caches.default.delete(cacheUrl)
		// console.log('Busting resize worker cache entry')
		// await env.IMAGE_RESIZE_WORKER.bustCache(cacheUrl.toString())
	}
	// hard delete file (this will trigger a cascade delete of all remaining related records & R2 objects)
	await pg.deleteFrom('file').where('id', '=', file.id).execute()
	// Nudge the outbox so the delete's effects land promptly instead of waiting for the 30s
	// alarm sweep. poke() is cheap: it just schedules an alarm. Best-effort nudge: the sweep
	// backstops it, so a poke failure must not fail the request after the delete committed.
	await getFileEffectProcessor(env)
		.poke()
		.catch(() => {})
	return new Response('Deleted', { status: 200 })
}

async function deleteUserFromAnalytics(
	userId: string,
	env: Environment,
	sendProgress?: (step: string, message: string, details?: any) => void
) {
	if (!env.ANALYTICS_API_URL || !env.ANALYTICS_API_TOKEN) {
		sendProgress?.(
			'analytics',
			'Skipping analytics deletion - missing configuration (ANALYTICS_API_URL or ANALYTICS_API_TOKEN)'
		)
		return
	}

	try {
		const response = await fetch(`${env.ANALYTICS_API_URL}/api/user-deletion`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${env.ANALYTICS_API_TOKEN}`,
			},
			body: JSON.stringify({
				clerk_id: userId,
			}),
			signal: AbortSignal.timeout(30000),
		})

		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Unknown error')
			throw new Error(`Analytics API returned ${response.status}: ${errorText}`)
		}

		const result = (await response.json()) as { success: boolean }
		sendProgress?.('analytics', 'Successfully deleted user data from analytics', {
			success: result.success,
		})
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		console.error('Failed to delete user from analytics:', errorMessage)
		sendProgress?.('analytics', `Warning: Analytics deletion failed - ${errorMessage}`)
	}
}

async function performUserDeletion(
	userRow: any,
	env: any,
	sendProgress?: (step: string, message: string, details?: any) => void
) {
	const pg = createPostgresConnectionPool(env, '/app/admin/delete_user')

	// Step 1: Find all groups the user is the only owner of
	// This includes their home group (group.id = user.id) and any other groups they solely own
	sendProgress?.('groups', 'Finding groups to delete...')

	// Get all groups where this user is an owner
	const userOwnedGroupMemberships = await pg
		.selectFrom('group_user')
		.where('userId', '=', userRow.id)
		.where('role', '=', 'owner')
		.select('groupId')
		.execute()

	const groupsToDelete: string[] = []

	for (const membership of userOwnedGroupMemberships) {
		// Check if this user is the only owner of this group
		const ownerCount = await pg
			.selectFrom('group_user')
			.where('groupId', '=', membership.groupId)
			.where('role', '=', 'owner')
			.select((eb) => eb.fn.countAll().as('count'))
			.executeTakeFirst()

		if (ownerCount && Number(ownerCount.count) === 1) {
			groupsToDelete.push(membership.groupId)
		}
	}

	sendProgress?.('groups', `Found ${groupsToDelete.length} groups to delete`, {
		groupCount: groupsToDelete.length,
		groupIds: groupsToDelete,
	})

	// Step 2: Soft delete groups (the cleanup_deleted_group_trigger will soft delete their files)
	if (groupsToDelete.length > 0) {
		sendProgress?.('groups', 'Soft deleting groups...')
		await pg.updateTable('group').set('isDeleted', true).where('id', 'in', groupsToDelete).execute()
	}

	// Step 3: Get all files to hard delete
	const filesToDelete = new Map<string, TlaFile>()

	if (groupsToDelete.length > 0) {
		const groupFiles = await pg
			.selectFrom('file')
			.where('owningGroupId', 'in', groupsToDelete)
			.selectAll()
			.execute()
		for (const file of groupFiles) {
			filesToDelete.set(file.id, file)
		}
	}

	sendProgress?.('files', `Found ${filesToDelete.size} files to delete`, {
		fileCount: filesToDelete.size,
	})

	// Allow time for soft deletes to propagate
	if (groupsToDelete.length > 0 || filesToDelete.size > 0) {
		await sleep(3000)
	}

	// Now hard delete all files
	for (const file of filesToDelete.values()) {
		sendProgress?.('files', `Hard deleting file '${file.name}' (${file.id})`)
		await hardDeleteAppFile({ pg, file, env })
	}

	sendProgress?.('database', 'Cleaning up database records...')

	// Step 5: Hard delete groups and user in a transaction
	await pg.transaction().execute(async (tx) => {
		// Clean up assets that reference this user (nullable foreign key)
		await tx.deleteFrom('asset').where('userId', '=', userRow.id).execute()

		// Remove user from all groups they're a member of (including ones they don't solely own)
		await tx.deleteFrom('group_user').where('userId', '=', userRow.id).execute()

		// Hard delete the groups (this will cascade delete group_user and group_file entries)
		if (groupsToDelete.length > 0) {
			await tx.deleteFrom('group').where('id', 'in', groupsToDelete).execute()
		}

		// Delete the user row (this will cascade delete any remaining related records)
		await tx.deleteFrom('user').where('id', '=', userRow.id).execute()
	})

	sendProgress?.('clerk', 'Deleting user from Clerk...')

	// Delete user from Clerk
	const clerk = getClerkClient(env)
	await clerk.users.deleteUser(userRow.id)

	// Delete user from analytics service
	sendProgress?.('analytics', 'Deleting user from analytics...')
	await deleteUserFromAnalytics(userRow.id, env, sendProgress)
}
