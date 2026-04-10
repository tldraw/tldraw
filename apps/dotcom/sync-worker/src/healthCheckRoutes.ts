import { createRouter, notFound } from '@tldraw/worker-shared'
import { sql } from 'kysely'
import { createPostgresConnectionPool } from './postgres'
import { isDebugLogging, type Environment } from './types'
import { getStatsDurableObjct } from './utils/durableObjects'
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
	.get('/health-check/replicator', async (_, env) => {
		const stats = getStatsDurableObjct(env)
		const unusualRetries = await stats.unusualNumberOfReplicatorBootRetries()
		if (unusualRetries) {
			return new Response('High ammount of replicator boot retries', { status: 500 })
		}
		const isGettingUpdates = await stats.isReplicatorGettingUpdates()
		if (!isGettingUpdates) {
			return new Response('Replicator is not getting postgres updates', { status: 500 })
		}
		return new Response('ok', { status: 200 })
	})
	.get('/health-check/user-durable-objects', async (_, env) => {
		const stats = getStatsDurableObjct(env)
		const abortsOverThreshold = await stats.unusualNumberOfUserDOAborts()
		if (abortsOverThreshold) {
			return new Response('High ammount of user durable object aborts', { status: 500 })
		}
		return new Response('ok', { status: 200 })
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
	// Combined postgres health check: db size, changelog size, WAL retention, replication slots, and
	// tlpr replicator status. Grouped into a single endpoint because updown.io charges per check
	// invocation. Failures include the sub-check name so alerts remain distinguishable.
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
					WHERE slot_name LIKE 'zero_%' OR slot_name LIKE 'tlpr_%'
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

			// tlpr-replicator
			try {
				const result = await sql<{
					slot_name: string
					active: boolean
					wal_status: string | null
				}>`
					SELECT slot_name, active, wal_status
					FROM pg_replication_slots
					WHERE slot_name LIKE 'tlpr_%'
				`.execute(db)
				if (result.rows.length === 0) {
					failures.push('tlpr-replicator: no slot found')
				} else {
					const slot = result.rows[0]
					if (!slot.active) {
						failures.push(`tlpr-replicator: ${slot.slot_name} not active`)
					} else if (slot.wal_status === 'lost' || slot.wal_status === 'unreserved') {
						failures.push(`tlpr-replicator: ${slot.slot_name} wal_status=${slot.wal_status}`)
					} else {
						okDetails.push('tlpr: active')
					}
				}
			} catch (_e) {
				failures.push('tlpr-replicator: query failed')
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
