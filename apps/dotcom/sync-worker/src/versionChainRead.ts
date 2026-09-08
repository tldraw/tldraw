import { RoomSnapshot } from '@tldraw/sync-core'
import { deleteAllObjectsWithPrefix, listAllObjectKeys } from './r2'
import { parseVersionKey, PendingDelta, readSegmentRef, SegmentBody } from './versionChain'
import { decodeVersionBody, isGzippedVersionBody } from './versionChainCodec'
import { applySnapshotDelta, versionEnvelopeHash } from './versionDelta'

// R2 has honored `include` on list() since compat date 2022-08-04 (this worker's is far past it),
// but the repo's ambient workers-types entrypoint predates the option — declared locally, same
// pattern as types.ts.
type R2ListOptionsWithInclude = R2ListOptions & {
	include?: Array<'httpMetadata' | 'customMetadata'>
}

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
 * Runs one R2 read. Reads default to running inline; a caller inside a shared connection budget
 * (the durable object's R2 queue) passes its queue, so each read is one budgeted operation and the
 * fan-out never holds more connections than the budget allows.
 */
export type R2ReadScheduler = <T>(read: () => Promise<T>) => Promise<T>

const runInline: R2ReadScheduler = (read) => read()

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
 * Every chain object for a room, in key order, with the versions each one holds.
 *
 * A segment is keyed by its first delta only, so a version's timestamp does not say which object
 * holds it. Listing with `customMetadata` answers that for the whole room in one operation, without
 * downloading a single body.
 */
export async function loadChainIndex(
	bucket: R2Bucket,
	roomKey: string,
	schedule: R2ReadScheduler = runInline
): Promise<{ entries: ChainIndexEntry[]; ops: number }> {
	const entries: ChainIndexEntry[] = []
	let cursor: string | undefined
	let ops = 0

	do {
		// Including metadata makes R2 return shorter pages, so a short page does not mean the
		// listing is done — `truncated` is the only safe stop condition.
		const options: R2ListOptionsWithInclude = {
			prefix: `${roomKey}/`,
			cursor,
			include: ['customMetadata'],
		}
		const page: R2Objects = await schedule(() => bucket.list(options as R2ListOptions))
		ops++
		for (const object of page.objects) {
			const parsed = parseVersionKey(object.key)
			if (!parsed) continue
			if (parsed.kind === 'keyframe') {
				entries.push({ kind: 'keyframe', key: object.key, timestamps: [parsed.timestamp] })
				continue
			}
			const ref = readSegmentRef(object.customMetadata)
			// A segment with no readable reference cannot be placed in a chain. Skipping it here
			// surfaces as a sequence gap rather than as a silently short replay.
			if (!ref) continue
			entries.push({
				kind: 'segment',
				key: object.key,
				timestamps: ref.timestamps,
				keyframeKey: ref.keyframeKey,
				firstSeq: ref.firstSeq,
			})
		}
		cursor = page.truncated ? page.cursor : undefined
	} while (cursor)

	entries.sort((a, b) => a.key.localeCompare(b.key))
	return { entries, ops }
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
	/** A chain index the caller already loaded, so one request does not list the room twice. */
	index?: ChainIndexEntry[]
	schedule?: R2ReadScheduler
}): Promise<VersionReconstruction | null> {
	const { entries, ops: listOps } = index
		? { entries: index, ops: 0 }
		: await loadChainIndex(chainBucket, roomKey, schedule)
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
}: {
	chainBucket: R2Bucket
	legacyBucket: R2Bucket
	roomKey: string
	timestamp: string
	index: ChainIndexEntry[]
}): Promise<ReadableStream<Uint8Array> | null> {
	const target = index.find((entry) => entry.timestamps.includes(timestamp))
	if (target && target.kind !== 'keyframe') return null

	const object = target
		? await chainBucket.get(target.key)
		: await legacyBucket.get(`${roomKey}/${timestamp}`)
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
}: {
	chainBucket: R2Bucket
	legacyBucket: R2Bucket
	roomKey: string
}): Promise<void> {
	// Trailing slash: a bare roomKey prefix also matches sibling rooms whose slug is a prefix of
	// this one (deleting "abc" must not sweep "abcd").
	await Promise.all(
		[chainBucket, legacyBucket].map((bucket) => deleteAllObjectsWithPrefix(bucket, `${roomKey}/`))
	)
}
