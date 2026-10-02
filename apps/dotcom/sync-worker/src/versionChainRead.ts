import { RoomSnapshot } from '@tldraw/sync-core'
import {
	deleteAllObjectsWithPrefix,
	listAllObjectKeys,
	listAllObjects,
	listObjectsInRange,
	R2ReadScheduler,
	runInline,
} from './r2'
import { parseVersionKey, PendingDelta, readSegmentRef, SegmentBody } from './versionChain'
import { decodeVersionBody, isGzippedVersionBody } from './versionChainCodec'
import { applySnapshotDelta, versionEnvelopeHash } from './versionDelta'

/** A keyframe object: one whole snapshot, and the single version it is. */
export interface KeyframeIndexEntry {
	kind: 'keyframe'
	key: string
	timestamps: string[]
}

/** A segment object: the deltas following `keyframeKey`, starting at sequence `firstSeq`. */
export interface SegmentIndexEntry {
	kind: 'segment'
	key: string
	timestamps: string[]
	keyframeKey: string
	firstSeq: number
}

/**
 * One chain object and the versions it can produce. A union rather than one shape with nullable
 * fields: only a segment has a keyframe to point back at, and the reader should not have to assert
 * that away.
 */
export type ChainIndexEntry = KeyframeIndexEntry | SegmentIndexEntry

/**
 * A segment object R2 holds that carries no readable chain reference, so nothing can place it. The
 * timestamp comes from its key, which names its first delta.
 */
export interface RejectedChainObject {
	key: string
	timestamp: string
}

export interface VersionReconstruction {
	snapshot: RoomSnapshot
	/** Every R2 operation this reconstruction cost, listings included. */
	ops: number
	deltaCount: number
	/**
	 * Which bucket answered. A caller proving that a chain reads back must not accept a legacy
	 * full copy as that proof.
	 */
	source: 'chain' | 'legacy'
}

/**
 * Every chain object for a room, in key order, with the versions each one holds, plus the segments
 * that could not be placed at all — the verifier reports those, since nothing downstream can.
 *
 * A segment is keyed by its first delta only, so a version's timestamp does not say which object
 * holds it. Listing with `customMetadata` answers that for the whole room in one operation, without
 * downloading a single body.
 */
export async function loadChainIndex(
	bucket: R2Bucket,
	roomKey: string,
	schedule: R2ReadScheduler = runInline
): Promise<{ entries: ChainIndexEntry[]; ops: number; rejected: RejectedChainObject[] }> {
	const { objects, ops } = await listAllObjects(bucket, `${roomKey}/`, schedule)
	return { ...indexChainObjects(objects), ops }
}

function indexChainObjects(objects: R2Object[]): {
	entries: ChainIndexEntry[]
	rejected: RejectedChainObject[]
} {
	const entries: ChainIndexEntry[] = []
	const rejected: RejectedChainObject[] = []
	for (const object of objects) {
		const parsed = parseVersionKey(object.key)
		if (!parsed) continue
		if (parsed.kind === 'keyframe') {
			entries.push({ kind: 'keyframe', key: object.key, timestamps: [parsed.timestamp] })
			continue
		}
		const ref = readSegmentRef(object.customMetadata)
		// A segment with no readable reference cannot be placed in a chain. Dropping it only shows
		// up as a sequence gap when it sits mid-chain; a trailing one leaves the replay ending early
		// and the verifier passing a chain whose tail is unreadable. Collected so it is reported
		// outright instead.
		if (!ref) {
			rejected.push({ key: object.key, timestamp: parsed.timestamp })
			continue
		}
		entries.push({
			kind: 'segment',
			key: object.key,
			timestamps: ref.timestamps,
			keyframeKey: ref.keyframeKey,
			firstSeq: ref.firstSeq,
		})
	}

	entries.sort((a, b) => a.key.localeCompare(b.key))
	return { entries, rejected }
}

// How far a chain key may sit out of wall-clock order: a durable object re-created on a host whose
// clock runs behind can key a later object earlier (see reconstructVersion).
const CHAIN_KEY_CLOCK_SKEW_MS = 10 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
// Before tldraw.com existed, so no version can be older.
const CHAIN_EPOCH_MS = Date.UTC(2020, 0, 1)
// Widening look-back windows, then the rest of the prefix. Most versions sit in a chain opened
// within the hour; the tail only runs for a room whose chain is sparse around `timestamp`.
const INDEX_WINDOWS_MS = [HOUR_MS, 24 * HOUR_MS, 30 * 24 * HOUR_MS, 365 * 24 * HOUR_MS, Infinity]

/**
 * The part of a room's chain index that one version's read needs: the object holding `timestamp`
 * and, for a segment, every earlier segment of its chain. Listing the whole prefix instead is
 * unbounded in the room's history, and on rooms with tens of thousands of chain objects it
 * throttles with R2 10058 (#10879).
 *
 * Relies on a room's chain objects being written one after another by a single durable object:
 * an object's key is when it was opened, the object holding `timestamp` was opened at or before
 * it, and its chain's segments all sit between that chain's keyframe and it. So the walk goes back
 * in widening windows until it finds the version — or an object older than it, past which the
 * chain cannot hold it.
 */
export async function loadChainIndexForVersion(
	bucket: R2Bucket,
	roomKey: string,
	timestamp: string,
	schedule: R2ReadScheduler = runInline
): Promise<{ entries: ChainIndexEntry[]; ops: number }> {
	const time = Date.parse(timestamp)
	// Not a timestamp any chain key could carry; the legacy lookup still gets its say. A future one
	// matters beyond the wasted lookup: no window would find an object before it, so the walk would
	// fall through to listing the whole prefix. Bounding the past keeps every window a valid Date.
	if (Number.isNaN(time) || time < CHAIN_EPOCH_MS || time > Date.now() + CHAIN_KEY_CLOCK_SKEW_MS) {
		return { entries: [], ops: 0 }
	}

	const prefix = `${roomKey}/`
	const keyAt = (ms: number) => `${prefix}${new Date(ms).toISOString()}`
	const objects: R2Object[] = []
	let ops = 0
	// The lower bound listed so far; undefined once the walk has reached the start of the prefix.
	let listedFrom: string | undefined = keyAt(time + CHAIN_KEY_CLOCK_SKEW_MS)

	const listBack = async (after: string | undefined) => {
		const page = await listObjectsInRange(bucket, prefix, { after, through: listedFrom! }, schedule)
		// Newest window last in `objects` is fine: indexChainObjects sorts by key.
		objects.push(...page.objects)
		ops += page.ops
		listedFrom = after
	}

	const settledBefore = keyAt(time - CHAIN_KEY_CLOCK_SKEW_MS)
	for (const window of INDEX_WINDOWS_MS) {
		await listBack(Number.isFinite(window) ? keyAt(time - window) : undefined)
		const { entries } = indexChainObjects(objects)
		const target = entries.find((entry) => entry.timestamps.includes(timestamp))
		if (target) {
			if (target.kind === 'segment') {
				const keyframeTime = Date.parse(parseVersionKey(target.keyframeKey)?.timestamp ?? '')
				// An unreadable keyframe key cannot bound the chain, so list to the start of the prefix.
				const chainFrom = Number.isNaN(keyframeTime)
					? undefined
					: keyAt(keyframeTime - CHAIN_KEY_CLOCK_SKEW_MS)
				if (listedFrom !== undefined && (chainFrom === undefined || chainFrom < listedFrom)) {
					await listBack(chainFrom)
				}
			}
			return { entries: indexChainObjects(objects).entries, ops }
		}
		// An object opened before the version, with the version still unfound: the chain never held it.
		if (listedFrom === undefined || objects.some((object) => object.key <= settledBefore)) break
	}
	return { entries: indexChainObjects(objects).entries, ops }
}

/**
 * The board as it stood at `timestamp`, or null if no bucket holds that version.
 *
 * Throws rather than returning a partial reconstruction: a version that silently comes back missing
 * half its shapes is worse than one that comes back as an error.
 */
export async function reconstructVersion({
	chainBucket,
	legacyBucket,
	roomKey,
	timestamp,
	index,
	schedule = runInline,
}: {
	chainBucket: R2Bucket
	legacyBucket: R2Bucket
	roomKey: string
	timestamp: string
	/** A chain index the caller already loaded (whole room or loadChainIndexForVersion's), so one request does not list twice. */
	index?: ChainIndexEntry[]
	schedule?: R2ReadScheduler
}): Promise<VersionReconstruction | null> {
	const { entries, ops: listOps } = index
		? { entries: index, ops: 0 }
		: await loadChainIndexForVersion(chainBucket, roomKey, timestamp, schedule)
	const target = entries.find((entry) => entry.timestamps.includes(timestamp))

	if (!target) {
		// Everything written before cut-over lives only in the legacy bucket.
		const legacy = await schedule(() => legacyBucket.get(`${roomKey}/${timestamp}`))
		if (!legacy) return null
		return {
			snapshot: (await decodeVersionBody(legacy)) as RoomSnapshot,
			ops: listOps + 1,
			deltaCount: 0,
			source: 'legacy',
		}
	}

	if (target.kind === 'keyframe') {
		const object = await schedule(() => chainBucket.get(target.key))
		if (!object) throw new Error(`version chain keyframe ${target.key} is missing`)
		return {
			snapshot: (await decodeVersionBody(object)) as RoomSnapshot,
			ops: listOps + 1,
			deltaCount: 0,
			source: 'chain',
		}
	}

	const keyframeKey = target.keyframeKey
	// By sequence, not by key: keys are wall-clock timestamps, and a DO re-created on a host whose
	// clock runs behind can open a later segment under an earlier key.
	const segments = entries
		.filter(
			(entry): entry is SegmentIndexEntry =>
				entry.kind === 'segment' &&
				entry.keyframeKey === keyframeKey &&
				entry.firstSeq <= target.firstSeq
		)
		.sort((a, b) => a.firstSeq - b.firstSeq)
	assertContiguous(segments, target.key)

	const [keyframeObject, segmentBodies] = await Promise.all([
		schedule(() => chainBucket.get(keyframeKey)),
		Promise.all(segments.map((entry) => schedule(() => readSegmentDeltas(chainBucket, entry)))),
	])
	if (!keyframeObject) throw new Error(`version chain keyframe ${keyframeKey} is missing`)

	let snapshot = (await decodeVersionBody(keyframeObject)) as RoomSnapshot
	let deltaCount = 0
	for (const deltas of segmentBodies) {
		for (const { t, delta } of deltas) {
			snapshot = applySnapshotDelta(snapshot, delta)
			deltaCount++
			if (t === timestamp) {
				// See versionEnvelopeHash for why the recorded hash is checked here.
				if (delta.hash !== versionEnvelopeHash(snapshot)) {
					throw new Error(`version ${timestamp} reconstructed with a different envelope hash`)
				}
				return { snapshot, ops: listOps + 1 + segments.length, deltaCount, source: 'chain' }
			}
		}
	}

	throw new Error(`version ${timestamp} was indexed in ${target.key} but not found in its body`)
}

/**
 * The deltas a listed segment holds, exactly as the listing described them. Shared by
 * reconstruction and the verifier so that the verifier cannot pass a segment reads would reject.
 */
export async function readSegmentDeltas(
	chainBucket: R2Bucket,
	entry: SegmentIndexEntry
): Promise<PendingDelta[]> {
	const object = await chainBucket.get(entry.key)
	if (!object) throw new Error(`version chain sequence broke: ${entry.key} disappeared`)
	const body = (await decodeVersionBody(object)) as SegmentBody
	// Same reason applySnapshotDelta guards its own version: replaying a future segment format
	// under today's rules would reconstruct quietly wrong rather than fail.
	if (body.v !== 1) {
		throw new Error(`unknown version segment format ${body.v} in ${entry.key}`)
	}
	const bodyTimestamps = body.deltas.map((d) => d.t)
	// This GET can observe a NEWER copy of the open segment than the listing did — the durable
	// object may have appended between the two reads — so extra trailing deltas are tolerated. The
	// body must still begin with exactly what the listing promised; anything else is a torn or
	// foreign write.
	if (bodyTimestamps.slice(0, entry.timestamps.length).join(',') !== entry.timestamps.join(',')) {
		throw new Error(`version segment ${entry.key} body does not match its metadata`)
	}
	return body.deltas.slice(0, entry.timestamps.length)
}

/** The chain must run unbroken from sequence 1, or the replay would silently skip versions. */
function assertContiguous(segments: SegmentIndexEntry[], targetKey: string) {
	let expected = 1
	for (const segment of segments) {
		if (segment.firstSeq !== expected) {
			throw new Error(
				`version chain sequence for ${targetKey} expected segment at ${expected}, found ${segment.firstSeq}`
			)
		}
		expected += segment.timestamps.length
	}
	if (segments.length === 0) {
		throw new Error(`version chain sequence for ${targetKey} has no segments`)
	}
}

/** Version timestamps for a room across both buckets, newest first. */
export async function listVersionTimestamps({
	chainBucket,
	legacyBucket,
	roomKey,
	prefix,
	index,
	limit,
}: {
	chainBucket: R2Bucket
	legacyBucket: R2Bucket
	roomKey: string
	prefix: string
	/** A chain index the caller already loaded; getRoomHistory probes many prefixes per request. */
	index?: ChainIndexEntry[]
	/**
	 * Caps the legacy listing at the R2 level. Legacy histories are never pruned, so an uncapped
	 * walk of a big room is hundreds of pages.
	 *
	 * Not "the newest `limit` versions": R2 lists forward, so once the cap binds it is the *oldest*
	 * legacy page that comes back, and newest-first holds only within that sample. A capped result
	 * may therefore only answer whether anything exists, or — as `getRoomHistory` does — whether the
	 * room holds fewer than `limit` versions, which is answerable because a short result means the
	 * cap never bound.
	 */
	limit?: number
}): Promise<string[]> {
	const [entries, legacyKeys] = await Promise.all([
		index ?? loadChainIndex(chainBucket, roomKey).then((r) => r.entries),
		listAllObjectKeys(legacyBucket, `${roomKey}/${prefix}`, limit),
	])

	const timestamps = new Set<string>()
	for (const entry of entries) {
		for (const timestamp of entry.timestamps) {
			// A segment's key can precede the prefix while the versions inside it do not, so the
			// filter has to be applied per timestamp rather than per key.
			if (timestamp.startsWith(prefix)) timestamps.add(timestamp)
		}
	}
	for (const key of legacyKeys) {
		timestamps.add(key.slice(key.lastIndexOf('/') + 1))
	}

	const sorted = [...timestamps].sort((a, b) => b.localeCompare(a))
	return limit === undefined ? sorted : sorted.slice(0, limit)
}

/**
 * The raw body of a version that exists as a whole object — a keyframe, or a legacy full copy —
 * as a stream of JSON bytes, or null when the version lives inside a segment and needs a replay.
 *
 * The read routes hand this straight through: parsing a 25MB board into objects and serializing
 * it again costs ~3x the body on a 128MB isolate, where streaming costs nothing. Only a real delta
 * replay has to materialize a snapshot.
 */
export async function openWholeVersionStream({
	chainBucket,
	legacyBucket,
	roomKey,
	timestamp,
	index,
	schedule = runInline,
}: {
	chainBucket: R2Bucket
	legacyBucket: R2Bucket
	roomKey: string
	timestamp: string
	index: ChainIndexEntry[]
	schedule?: R2ReadScheduler
}): Promise<ReadableStream<Uint8Array> | null> {
	const target = index.find((entry) => entry.timestamps.includes(timestamp))
	if (target && target.kind !== 'keyframe') return null

	const object = target
		? await schedule(() => chainBucket.get(target.key))
		: await schedule(() => legacyBucket.get(`${roomKey}/${timestamp}`))
	if (!object) {
		if (target) throw new Error(`version chain keyframe ${target.key} is missing`)
		return null
	}
	return isGzippedVersionBody(object)
		? object.body.pipeThrough(new DecompressionStream('gzip'))
		: object.body
}

/**
 * Removes a room's history from both buckets. Sweeping only one would leave a deleted board's
 * content behind in the other.
 */
export async function deleteAllVersions({
	chainBucket,
	legacyBucket,
	roomKey,
	schedule = runInline,
}: {
	chainBucket: R2Bucket
	legacyBucket: R2Bucket
	roomKey: string
	schedule?: R2ReadScheduler
}): Promise<void> {
	// Trailing slash: a bare roomKey prefix also matches sibling rooms whose slug is a prefix of
	// this one (deleting "abc" must not sweep "abcd").
	await Promise.all(
		[chainBucket, legacyBucket].map((bucket) =>
			deleteAllObjectsWithPrefix(bucket, `${roomKey}/`, schedule)
		)
	)
}
