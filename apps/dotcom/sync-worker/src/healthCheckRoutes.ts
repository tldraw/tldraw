import { createRouter, notFound } from '@tldraw/worker-shared'
import { sql } from 'kysely'
import { MAX_ATTEMPTS } from './outboxDrain'
import { createPostgresConnectionPool } from './postgres'
import { isDebugLogging, type Environment } from './types'
import { getClerkClient } from './utils/tla/getAuth'

function isAuthorized(req: Request, env: Environment) {
	const auth = req.headers.get('Authorization')
	const bearer = auth?.split('Bearer ')[1]
	return bearer && bearer === env.HEALTH_CHECK_BEARER_TOKEN
}

export const healthCheckRoutes = createRouter<Environment>()
	.all('/health-check/*', (req, env) => {
		if (isDebugLogging(env) || isAuthorized(req, env)) return undefined
		return new Response('Unauthorized', { status: 401 })
	})
	.get('/health-check/clerk', async (_, env) => {
		const clerk = getClerkClient(env)
		try {
			const result = await clerk.users.getCount()
			if (!result || typeof result !== 'number') {
				return new Response('Could not reach clerk', { status: 500 })
			}
			return new Response('ok', { status: 200 })
		} catch (_e) {
			return new Response('Could not reach clerk', { status: 500 })
		}
	})
	.get('/health-check/db', async (_, env) => {
		const db = createPostgresConnectionPool(env, '/health-check/db')
		try {
			await db
				.selectFrom('user')
				.select('name')
				.where('email', '=', 'mitja@tldraw.com')
				.executeTakeFirstOrThrow()

			return new Response('ok', { status: 200 })
		} catch (_e) {
			return new Response('Could not reach the database', { status: 500 })
		} finally {
			await db.destroy()
		}
	})
	.get('/health-check/zero-replicator', async (_, env) => {
		const db = createPostgresConnectionPool(env, '/health-check/zero-replicator')
		try {
			const result = await sql<{ status: string }>`
				SELECT
					CASE
						WHEN write_lsn IS NULL THEN 'STALLED'
						WHEN write_lag > interval '1 minute' THEN 'LAGGING'
						ELSE 'HEALTHY'
					END AS status
				FROM pg_stat_replication
				WHERE application_name = 'zero-replicator'
			`.execute(db)
			if (result.rows.length === 0) {
				return new Response('zero-replicator not connected', { status: 500 })
			}
			const status = result.rows[0].status
			if (status !== 'HEALTHY') {
				return new Response(`zero-replicator: ${status}`, { status: 500 })
			}
			return new Response('ok', { status: 200 })
		} catch (_e) {
			return new Response('Could not check zero-replicator status', { status: 500 })
		} finally {
			await db.destroy()
		}
	})
	// Combined postgres health check: db size, changelog size, WAL retention, and replication slots.
	// Grouped into a single endpoint because updown.io charges per check invocation.
	// Failures include the sub-check name so alerts remain distinguishable.
	.get('/health-check/postgres', async (_, env) => {
		const db = createPostgresConnectionPool(env, '/health-check/postgres')
		const failures: string[] = []
		const okDetails: string[] = []
		try {
			// db-size
			try {
				const thresholdGb = parseFloat(env.HEALTH_CHECK_DB_SIZE_THRESHOLD_GB ?? '4')
				const result = await sql<{ size_bytes: string }>`
					SELECT pg_database_size(current_database()) AS size_bytes
				`.execute(db)
				const sizeGb = parseInt(result.rows[0].size_bytes, 10) / (1024 * 1024 * 1024)
				if (sizeGb > thresholdGb) {
					failures.push(`db-size: ${sizeGb.toFixed(2)} GB > ${thresholdGb} GB threshold`)
				} else {
					okDetails.push(`db: ${sizeGb.toFixed(2)} GB`)
				}
			} catch (_e) {
				failures.push('db-size: query failed')
			}

			// changelog-size
			try {
				const thresholdMb = parseFloat(env.HEALTH_CHECK_CHANGELOG_SIZE_THRESHOLD_MB ?? '1024')
				const result = await sql<{ size_bytes: string }>`
					SELECT pg_total_relation_size('"zero_0/cdc"."changeLog"') AS size_bytes
				`.execute(db)
				const sizeMb = parseInt(result.rows[0].size_bytes, 10) / (1024 * 1024)
				if (sizeMb > thresholdMb) {
					failures.push(`changelog-size: ${sizeMb.toFixed(0)} MB > ${thresholdMb} MB threshold`)
				} else {
					okDetails.push(`changelog: ${sizeMb.toFixed(0)} MB`)
				}
			} catch (_e) {
				failures.push('changelog-size: query failed')
			}

			// wal-size
			try {
				const thresholdMb = parseFloat(env.HEALTH_CHECK_WAL_SIZE_THRESHOLD_MB ?? '1024')
				const result = await sql<{
					slot_name: string
					retained_bytes: string
				}>`
					SELECT slot_name, pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS retained_bytes
					FROM pg_replication_slots
				`.execute(db)
				const overThreshold = result.rows.filter(
					(row) => parseInt(row.retained_bytes, 10) / (1024 * 1024) > thresholdMb
				)
				if (overThreshold.length > 0) {
					const details = overThreshold
						.map((r) => {
							const mb = (parseInt(r.retained_bytes, 10) / (1024 * 1024)).toFixed(0)
							return `${r.slot_name}: ${mb} MB`
						})
						.join(', ')
					failures.push(`wal-size: ${details} > ${thresholdMb} MB threshold`)
				} else {
					const maxMb = result.rows.reduce(
						(max, r) => Math.max(max, parseInt(r.retained_bytes, 10) / (1024 * 1024)),
						0
					)
					okDetails.push(`wal: ${maxMb.toFixed(0)} MB`)
				}
			} catch (_e) {
				failures.push('wal-size: query failed')
			}

			// replication-slots
			try {
				const result = await sql<{
					slot_name: string
					active: boolean
					wal_status: string | null
				}>`
					SELECT slot_name, active, wal_status
					FROM pg_replication_slots
					WHERE slot_name LIKE 'zero_%'
				`.execute(db)
				const unhealthy = result.rows.filter(
					(row) => row.wal_status === 'lost' || row.wal_status === 'unreserved'
				)
				if (unhealthy.length > 0) {
					const details = unhealthy
						.map((r) => `${r.slot_name}: wal_status=${r.wal_status}`)
						.join(', ')
					failures.push(`replication-slots: ${details}`)
				} else {
					okDetails.push(`slots: ${result.rows.length} ok`)
				}
			} catch (_e) {
				failures.push('replication-slots: query failed')
			}

			if (failures.length > 0) {
				return new Response(`FAIL ${failures.join('; ')}`, { status: 500 })
			}
			return new Response(`ok (${okDetails.join(', ')})`, { status: 200 })
		} finally {
			await db.destroy()
		}
	})
	// Split from /health-check/postgres so the monitor name identifies the outbox subsystem
	// directly instead of burying it in a combined postgres failure string. There's no lag
	// alert here: backoff rows are expected to sit with a future nextRetryAt, so alerting on
	// lag alone would trip on healthy backoff; Sentry already covers individual sub-parking
	// failures. Parked and stalled below cover the two failure modes that actually matter.
	.get('/health-check/outbox', async (_, env) => {
		const db = createPostgresConnectionPool(env, '/health-check/outbox')
		const failures: string[] = []
		const okDetails: string[] = []
		try {
			// outbox-parked
			try {
				const result = await sql<{ parked: string }>`
					SELECT count(*) FILTER (WHERE attempts >= ${sql.raw(String(MAX_ATTEMPTS))}) AS parked
					FROM effect_outbox
				`.execute(db)
				const row = result.rows[0]
				const parked = row?.parked ? parseInt(row.parked, 10) : 0
				if (parked > 0) {
					failures.push(`outbox-parked: ${parked} rows parked`)
				} else {
					okDetails.push('outbox: 0 parked')
				}
			} catch (e) {
				console.error('health-check outbox:', e)
				failures.push('outbox: query failed')
			}

			// outbox-stalled: parked-only detection needs the drain to run at all. If the alarm
			// chain died, unparked rows sit untouched forever and never reach the parked
			// threshold, so the check above stays green. A row is stalled when it has been
			// ELIGIBLE to process (created, or past its backoff) for 15+ minutes: a live drain
			// sweeps every 30s and backoff caps at 5 minutes, so it would have deleted, bumped,
			// or re-deferred any eligible row long before that.
			try {
				const result = await sql<{ stalled: string }>`
					SELECT count(*) AS stalled
					FROM effect_outbox
					WHERE attempts < ${sql.raw(String(MAX_ATTEMPTS))}
						AND GREATEST("createdAt", coalesce("nextRetryAt", "createdAt")) < now() - interval '15 minutes'
				`.execute(db)
				const row = result.rows[0]
				const stalled = row?.stalled ? parseInt(row.stalled, 10) : 0
				if (stalled > 0) {
					failures.push(`outbox-stalled: ${stalled} rows untouched > 15m`)
				} else {
					okDetails.push('outbox: 0 stalled')
				}
			} catch (e) {
				console.error('health-check outbox:', e)
				failures.push('outbox-stalled: query failed')
			}

			if (failures.length > 0) {
				return new Response(`FAIL ${failures.join('; ')}`, { status: 500 })
			}
			return new Response(`ok (${okDetails.join(', ')})`, { status: 200 })
		} finally {
			await db.destroy()
		}
	})
	.all('*', notFound)
