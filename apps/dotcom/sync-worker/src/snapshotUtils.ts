import { RoomSnapshot } from '@tldraw/sync-core'

// R2 custom metadata keys describing the snapshot in the object body. Let a `head()` answer
// "what is persisted?" without downloading the object.
const LAST_DOCUMENT_CHANGE_CLOCK_METADATA_KEY = 'lastDocumentChangeClock'
const SCHEMA_HASH_METADATA_KEY = 'schemaHash'
// Diagnostic only — deliberately absent from SnapshotFingerprint, see getSnapshotMetadata.
const DOCUMENT_CLOCK_METADATA_KEY = 'documentClock'

/**
 * Identifies the content of a snapshot. Two snapshots with equal fingerprints serialize to the
 * same document bytes, so re-uploading one over the other is pure waste.
 *
 * Not called a version: in this worker a "version" is an entry in the version cache — a
 * point-in-time snapshot the history UI lists and offers to restore. A fingerprint identifies
 * content, and many versions of a board can share one.
 */
export interface SnapshotFingerprint {
	lastDocumentChangeClock: number
	schemaHash: string
}

/**
 * The highest clock at which a document was changed, deleted (tombstones), or pruned
 * (tombstoneHistoryStartsAtClock) — i.e. the maximum `lastChangedClock` across the document lane.
 *
 * This is deliberately NOT `snapshot.documentClock`: that counter is shared with the object lane,
 * so a comment or reaction write bumps it without changing anything `getSnapshot()` returns.
 */
export function getLastDocumentChangeClock(snapshot: RoomSnapshot): number {
	let clock = snapshot.tombstoneHistoryStartsAtClock ?? 0
	for (const { lastChangedClock } of snapshot.documents) {
		if (lastChangedClock > clock) clock = lastChangedClock
	}
	if (snapshot.tombstones) {
		for (const tombstoneClock of Object.values(snapshot.tombstones)) {
			if (tombstoneClock > clock) clock = tombstoneClock
		}
	}
	return clock
}

/**
 * A hash of the snapshot's serialized schema, tracked alongside the document clock because
 * `migrateStorage` writes a migrated schema but only calls `set` for records whose content
 * actually changed. A migration that applies to no record on this board therefore leaves every
 * clock untouched, and the clock alone would read that as nothing to persist — stranding the
 * migrated schema in the DO's SQLite while R2 keeps the old one forever.
 */
function getSchemaHash(snapshot: RoomSnapshot): string {
	return fnv1a64(canonicalJson(snapshot.schema))
}

export function getSnapshotFingerprint(snapshot: RoomSnapshot): SnapshotFingerprint {
	return {
		lastDocumentChangeClock: getLastDocumentChangeClock(snapshot),
		schemaHash: getSchemaHash(snapshot),
	}
}

/**
 * The R2 metadata stamped on a persisted snapshot: the {@link SnapshotFingerprint} the next
 * persist compares against, plus `documentClock` recording the clock the object was written at.
 *
 * `documentClock` is deliberately not part of the fingerprint and no read path compares it. It is
 * the counter shared with the object lane, so a comment write moves it without changing a byte of
 * the document — comparing on it would force an upload per comment and defeat the dedupe. It is
 * stamped so a history entry records when it was taken; on the rooms object it therefore reads as
 * the clock at the last document write, not the room's current clock.
 */
export function getSnapshotMetadata(snapshot: RoomSnapshot): Record<string, string> {
	const fingerprint = getSnapshotFingerprint(snapshot)
	const metadata: Record<string, string> = {
		[LAST_DOCUMENT_CHANGE_CLOCK_METADATA_KEY]: String(fingerprint.lastDocumentChangeClock),
		[SCHEMA_HASH_METADATA_KEY]: fingerprint.schemaHash,
	}
	const documentClock = snapshot.documentClock ?? snapshot.clock
	if (documentClock !== undefined) {
		metadata[DOCUMENT_CLOCK_METADATA_KEY] = String(documentClock)
	}
	return metadata
}

/**
 * Reads the fingerprint stamped on an R2 object, or null if the object is missing or predates
 * stamping. Null means "unknown" — callers must treat it as "not persisted" and write, never as
 * "up to date".
 */
export async function readPersistedFingerprint(
	bucket: R2Bucket,
	key: string
): Promise<SnapshotFingerprint | null> {
	const head = await bucket.head(key)
	const rawClock = head?.customMetadata?.[LAST_DOCUMENT_CHANGE_CLOCK_METADATA_KEY]
	const schemaHash = head?.customMetadata?.[SCHEMA_HASH_METADATA_KEY]
	// A half-stamped object tells us nothing about the half that's missing.
	if (rawClock === undefined || !schemaHash) return null
	const lastDocumentChangeClock = Number(rawClock)
	if (!Number.isFinite(lastDocumentChangeClock)) return null
	return { lastDocumentChangeClock, schemaHash }
}

/**
 * Resolves the fingerprint stamped on an R2 object at most once, returning `known` untouched after
 * that. `undefined` means "not looked up yet"; `null` means "looked up, no usable stamp", and the
 * two must stay distinct.
 *
 * Looking it up a second time would let a persist observe its own partial write. A persist that
 * stamps the rooms object and then fails before writing the history entry retries with the
 * fingerprint it resolved beforehand; re-reading would hand it back its own fresh stamp, so it
 * would conclude everything was persisted and drop the history entry it still owes.
 */
export async function resolvePersistedFingerprint(
	known: SnapshotFingerprint | null | undefined,
	bucket: R2Bucket,
	key: string
): Promise<SnapshotFingerprint | null> {
	if (known !== undefined) return known
	return await readPersistedFingerprint(bucket, key)
}

/** Unknown (null) never matches, so an unstamped object is always re-uploaded. */
export function isSameFingerprint(
	a: SnapshotFingerprint | null,
	b: SnapshotFingerprint | null
): boolean {
	if (!a || !b) return false
	return a.lastDocumentChangeClock === b.lastDocumentChangeClock && a.schemaHash === b.schemaHash
}

// Object keys are sorted so that a serializer emitting the same schema in a different order can't
// read as a change and re-upload every board. This is why `getHashForObject` from @tldraw/utils
// isn't used here: it hashes `JSON.stringify` output directly, so key order changes the result.
function canonicalJson(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined'
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
	return `{${Object.keys(value)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonicalJson((value as any)[key])}`)
		.join(',')}}`
}

// FNV-1a run with two offsets. Wider than @tldraw/utils' 32-bit getHashForString because a
// collision here silently skips an upload that was owed; 64 bits makes that implausible. Staying
// non-cryptographic is fine — this only answers "did the schema change?", and a false mismatch
// costs one redundant upload rather than losing a migration.
function fnv1a64(value: string): string {
	let h1 = 0x811c9dc5
	let h2 = 0xc59d1c81
	for (let i = 0; i < value.length; i++) {
		const char = value.charCodeAt(i)
		h1 = Math.imul(h1 ^ char, 0x01000193)
		h2 = Math.imul(h2 ^ char, 0x85ebca6b)
	}
	return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')
}

function toJsonString(value: unknown): string {
	if (value === undefined) {
		return 'null'
	}
	return JSON.stringify(value)
}

export function* generateSnapshotChunks(snapshot: RoomSnapshot): Generator<Uint8Array> {
	const encoder = new TextEncoder()

	yield encoder.encode('{')

	const keys = Object.keys(snapshot) as Array<keyof RoomSnapshot>
	let isFirstKey = true

	for (const key of keys) {
		if (isFirstKey) {
			isFirstKey = false
		} else {
			yield encoder.encode(',')
		}

		yield encoder.encode(`"${key}":`)

		const value = snapshot[key]
		if (Array.isArray(value)) {
			yield encoder.encode('[')
			for (let i = 0; i < value.length; i++) {
				if (i > 0) {
					yield encoder.encode(',')
				}
				yield encoder.encode(toJsonString(value[i]))
			}
			yield encoder.encode(']')
		} else {
			yield encoder.encode(toJsonString(value))
		}
	}

	yield encoder.encode('}')
}
