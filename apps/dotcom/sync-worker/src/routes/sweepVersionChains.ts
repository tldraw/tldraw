import { IRequest, json } from 'itty-router'
import { createPostgresConnectionPool } from '../postgres'
import { getR2KeyForRoom } from '../r2'
import { Environment } from '../types'
import { writeDataPoint } from '../utils/analytics'
import { isTestFile } from '../utils/tla/isTestFile'
import { verifyRoomVersions } from './verifyVersionChain'

/** One room the sweep could not verify clean. `detail` is the first mismatch or error message. */
export interface SweepFailure {
	fileId: string
	reason: 'mismatch' | 'chain-error'
	detail: string
}

export interface SweepResult {
	/** Rooms examined this batch. */
	swept: number
	/**
	 * Rooms that actually had a chain to replay. Counted apart from `swept` because during a
	 * partial rollout most files have no chain at all, and a batch of those would otherwise report
	 * as a clean sweep having verified nothing — the fleet-wide version of `VerifyResult.complete`.
	 */
	verified: number
	/** Rooms whose per-room read budget ran out with entries unvisited. */
	incomplete: number
	failed: number
	reads: number
	/** Pass back as `cursor` to continue; null when the batch reached the end of the table. */
	nextCursor: string | null
	failures: SweepFailure[]
}

// Deliberately small. A sweep runs in a single worker invocation against the ~1000 subrequest cap,
// and every R2 read a room spends counts against it, so the ceiling that matters is
// rooms x reads-per-room. Replaying deltas is also CPU-bound (a hash per version over the whole
// board), which is what keeps the room count low rather than the read budget alone.
const DEFAULT_ROOMS_PER_SWEEP = 10
const MAX_ROOMS_PER_SWEEP = 50
const DEFAULT_READS_PER_ROOM = 30
const MAX_READS_PER_ROOM = 200
// Leaves headroom under the subrequest cap for the Postgres connection and the response.
const SWEEP_READ_BUDGET = 800

function clampNumber(raw: unknown, fallback: number, max: number): number {
	const value = Number(raw)
	if (!Number.isFinite(value) || value <= 0) return fallback
	return Math.min(Math.floor(value), max)
}

/**
 * Keyset cursor over (updatedAt, id). Both halves are needed: files sharing an `updatedAt` would
 * otherwise be skipped or repeated across batches depending on which side of the page they fell.
 */
function encodeCursor(updatedAt: number, id: string): string {
	return `${updatedAt}_${id}`
}

function decodeCursor(raw: string | undefined): { updatedAt: number; id: string } | null {
	if (!raw) return null
	const separator = raw.indexOf('_')
	if (separator <= 0) return null
	const updatedAt = Number(raw.slice(0, separator))
	const id = raw.slice(separator + 1)
	if (!Number.isFinite(updatedAt) || !id) return null
	return { updatedAt, id }
}

/**
 * Verifies the version chains of a batch of files, newest-touched first.
 *
 * Exists because `verifyVersionChainRoute` answers for one room an operator already suspects, and
 * nothing else looks: a delta bug that writes cleanly and only fails on read is invisible until a
 * user opens history. Ordering by `updatedAt` puts the rooms the current write path just touched
 * at the front, so a bug reaching production is caught in the first batch rather than after a walk
 * through dormant history.
 *
 * Reads R2 directly and never wakes the file's durable object — the chain lives in the bucket, so
 * sweeping cannot evict live rooms or contend with their persists.
 */
export async function sweepVersionChains({
	env,
	cursor,
	rooms,
	readsPerRoom,
}: {
	env: Environment
	cursor?: string
	rooms: number
	readsPerRoom: number
}): Promise<SweepResult> {
	const db = createPostgresConnectionPool(env, '/app/admin/version-chain/sweep')
	let candidates: Array<{ id: string; updatedAt: number }>
	try {
		const start = decodeCursor(cursor)
		let query = db
			.selectFrom('file')
			.select(['id', 'updatedAt'])
			.where('isDeleted', '=', false)
			.orderBy('updatedAt', 'desc')
			.orderBy('id', 'desc')
			.limit(rooms)
		if (start) {
			query = query.where((eb) =>
				eb.or([
					eb('updatedAt', '<', start.updatedAt),
					eb.and([eb('updatedAt', '=', start.updatedAt), eb('id', '<', start.id)]),
				])
			)
		}
		candidates = await query.execute()
	} finally {
		await db.destroy()
	}

	const result: SweepResult = {
		swept: 0,
		verified: 0,
		incomplete: 0,
		failed: 0,
		reads: 0,
		nextCursor: null,
		failures: [],
	}

	let stoppedOnBudget = false
	for (const file of candidates) {
		if (isTestFile(file.id)) {
			// A declined room still advances the cursor, or a page of test files parks the walk on the
			// same offset forever.
			result.nextCursor = encodeCursor(file.updatedAt, file.id)
			continue
		}
		if (result.reads >= SWEEP_READ_BUDGET) {
			stoppedOnBudget = true
			break
		}

		const verify = await verifyRoomVersions({
			chainBucket: env.ROOMS_HISTORY,
			legacyBucket: env.ROOMS_HISTORY_EPHEMERAL,
			roomKey: getR2KeyForRoom({ slug: file.id, isApp: true }),
			limit: Math.min(readsPerRoom, SWEEP_READ_BUDGET - result.reads),
		})

		result.swept++
		result.reads += verify.reads
		if (verify.replayed > 0) result.verified++
		if (!verify.complete) result.incomplete++

		const reason =
			verify.errors.length > 0 ? 'chain-error' : verify.mismatches.length > 0 ? 'mismatch' : null
		if (reason) {
			result.failed++
			const detail =
				reason === 'chain-error'
					? `${verify.errors[0].timestamp}: ${verify.errors[0].message}`
					: `mismatch at ${verify.mismatches[0]}`
			result.failures.push({ fileId: file.id, reason, detail })
			// Same event and blob shape the durable object's own verify writes, so one alert covers
			// both sources. The file id goes to the log rather than the metric, matching the
			// convention that analytics blobs carry no room identifiers.
			writeDataPoint(undefined, env.MEASURE, env, 'version_chain_verify', {
				blobs: ['fail', reason],
			})
			console.error(`Version chain sweep failed. file=${file.id} reason=${reason} ${detail}`)
		}

		// Only once the room has been verified. Continuation excludes the cursor, so advancing past
		// the room the budget stopped on would drop it from the sweep for good — never looked at,
		// while the run still reports clean.
		result.nextCursor = encodeCursor(file.updatedAt, file.id)
	}

	// The run itself is a datapoint: without it a sweep that stopped running, or one that only ever
	// reaches rooms with no chain, is indistinguishable from a fleet that is healthy.
	writeDataPoint(undefined, env.MEASURE, env, 'version_chain_sweep', {
		doubles: [result.swept, result.verified, result.failed, result.incomplete, result.reads],
	})

	// A short batch means the table ended, but only a batch that ran to completion is done: a budget
	// break leaves rooms behind the cursor even on the last page.
	if (candidates.length < rooms && !stoppedOnBudget) result.nextCursor = null
	return result
}

export async function sweepVersionChainsRoute(
	request: IRequest,
	env: Environment
): Promise<Response> {
	const rooms = clampNumber(request.query?.rooms, DEFAULT_ROOMS_PER_SWEEP, MAX_ROOMS_PER_SWEEP)
	const readsPerRoom = clampNumber(
		request.query?.readsPerRoom,
		DEFAULT_READS_PER_ROOM,
		MAX_READS_PER_ROOM
	)
	const cursor = typeof request.query?.cursor === 'string' ? request.query.cursor : undefined

	return json(await sweepVersionChains({ env, cursor, rooms, readsPerRoom }))
}
