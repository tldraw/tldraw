import { RoomSnapshot } from '@tldraw/sync-core'

// R2 has honored `include` on list() since compat date 2022-08-04 (this worker's is far past it),
// but the repo's ambient workers-types entrypoint predates the option — declared locally, same
// pattern as types.ts.
type R2ListOptionsWithInclude = R2ListOptions & {
	include?: Array<'httpMetadata' | 'customMetadata'>
}
import { listAllObjectKeys } from './r2'
import { parseVersionKey, readSegmentRef, SegmentBody } from './versionChain'
import { decodeVersionBody, isGzippedVersionBody } from './versionChainCodec'
import { applySnapshotDelta, snapshotContentHash } from './versionDelta'

/** One chain object and the versions it can produce. */
export interface ChainIndexEntry {
	key: string
	kind: 'keyframe' | 'segment'
	timestamps: string[]
	keyframeKey: string | null
	firstSeq: number | null
}

export interface VersionReconstruction {
	snapshot: RoomSnapshot
	/** Every R2 operation this reconstruction cost, listings included. */
	ops: number
	deltaCount: number
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
	roomKey: string
): Promise<{ entries: ChainIndexEntry[]; ops: number }> {
	const entries: ChainIndexEntry[] = []
	let cursor: string | undefined
	let ops = 0

	do {
		// Metadata makes pages shorter than `limit`, so `truncated` is the only safe stop condition.
		const options: R2ListOptionsWithInclude = {
			prefix: `${roomKey}/`,
			cursor,
			include: ['customMetadata'],
		}
		const page: R2Objects = await bucket.list(options as R2ListOptions)
		ops++
		for (const object of page.objects) {
			const parsed = parseVersionKey(object.key)
			if (!parsed) continue
			if (parsed.kind === 'keyframe') {
				entries.push({
					key: object.key,
					kind: 'keyframe',
					timestamps: [parsed.timestamp],
					keyframeKey: null,
					firstSeq: null,
				})
				continue
			}
			const ref = readSegmentRef(object.customMetadata)
			// A segment with no readable reference cannot be placed in a chain. Skipping it here
			// surfaces as a sequence gap rather than as a silently short replay.
			if (!ref) continue
			entries.push({
				key: object.key,
				kind: 'segment',
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
}: {
	chainBucket: R2Bucket
	legacyBucket: R2Bucket
	roomKey: string
	timestamp: string
	/** A chain index the caller already loaded, so one request does not list the room twice. */
	index?: ChainIndexEntry[]
}): Promise<VersionReconstruction | null> {
	const { entries, ops: listOps } = index
		? { entries: index, ops: 0 }
		: await loadChainIndex(chainBucket, roomKey)
	const target = entries.find((entry) => entry.timestamps.includes(timestamp))

	if (!target) {
		// Everything written before cut-over lives only in the legacy bucket.
		const legacy = await legacyBucket.get(`${roomKey}/${timestamp}`)
		if (!legacy) return null
		return {
			snapshot: (await decodeVersionBody(legacy)) as RoomSnapshot,
			ops: listOps + 1,
			deltaCount: 0,
		}
	}

	if (target.kind === 'keyframe') {
		const object = await chainBucket.get(target.key)
		if (!object) throw new Error(`version chain keyframe ${target.key} is missing`)
		return {
			snapshot: (await decodeVersionBody(object)) as RoomSnapshot,
			ops: listOps + 1,
			deltaCount: 0,
		}
	}

	const keyframeKey = target.keyframeKey!
	// By sequence, not by key: keys are wall-clock timestamps, and a DO re-created on a host whose
	// clock runs behind can open a later segment under an earlier key.
	const segments = entries
		.filter(
			(entry) =>
				entry.kind === 'segment' &&
				entry.keyframeKey === keyframeKey &&
				entry.firstSeq! <= target.firstSeq!
		)
		.sort((a, b) => a.firstSeq! - b.firstSeq!)
	assertContiguous(segments, target.key)

	const [keyframeObject, segmentBodies] = await Promise.all([
		chainBucket.get(keyframeKey),
		Promise.all(
			segments.map(async (entry) => {
				const object = await chainBucket.get(entry.key)
				if (!object) throw new Error(`version chain sequence broke: ${entry.key} disappeared`)
				const body = (await decodeVersionBody(object)) as SegmentBody
				const bodyTimestamps = body.deltas.map((d) => d.t)
				// This GET can observe a NEWER copy of the open segment than the listing did — the
				// durable object may have appended between the two reads — so extra trailing deltas
				// are tolerated. The body must still begin with exactly what the listing promised;
				// anything else is a torn or foreign write.
				if (
					bodyTimestamps.slice(0, entry.timestamps.length).join(',') !== entry.timestamps.join(',')
				) {
					throw new Error(`version segment ${entry.key} body does not match its metadata`)
				}
				return { v: body.v, deltas: body.deltas.slice(0, entry.timestamps.length) }
			})
		),
	])
	if (!keyframeObject) throw new Error(`version chain keyframe ${keyframeKey} is missing`)

	let snapshot = (await decodeVersionBody(keyframeObject)) as RoomSnapshot
	let deltaCount = 0
	for (const body of segmentBodies) {
		for (const { t, delta } of body.deltas) {
			snapshot = applySnapshotDelta(snapshot, delta)
			deltaCount++
			if (t === timestamp) {
				// See snapshotContentHash for why the recorded hash is checked here.
				if (delta.hash !== snapshotContentHash(snapshot)) {
					throw new Error(`version ${timestamp} reconstructed with a different content hash`)
				}
				return { snapshot, ops: listOps + 1 + segments.length, deltaCount }
			}
		}
	}

	throw new Error(`version ${timestamp} was indexed in ${target.key} but not found in its body`)
}

/** The chain must run unbroken from sequence 1, or the replay would silently skip versions. */
function assertContiguous(segments: ChainIndexEntry[], targetKey: string) {
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
	 * walk of a big room is hundreds of pages — and the callers that pass a limit only want to
	 * know whether anything exists.
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
	await Promise.all(
		[chainBucket, legacyBucket].map(async (bucket) => {
			// Trailing slash: a bare roomKey prefix also matches sibling rooms whose slug is a
			// prefix of this one (deleting "abc" must not sweep "abcd").
			const keys = await listAllObjectKeys(bucket, `${roomKey}/`)
			// Batched: one delete per key is an unbounded subrequest loop, and a room with a long
			// pre-chain history would hit the per-request subrequest cap mid-sweep and leave
			// objects behind. R2 accepts at most 1000 keys per delete call.
			for (let i = 0; i < keys.length; i += 1000) {
				await bucket.delete(keys.slice(i, i + 1000))
			}
		})
	)
}
