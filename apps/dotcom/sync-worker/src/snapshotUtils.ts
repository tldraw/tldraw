import { RoomSnapshot } from '@tldraw/sync-core'

// R2 custom metadata keys describing the snapshot in the object body. Let a `head()` answer
// "which version is persisted?" without downloading the object.
const DOCUMENT_VERSION_METADATA_KEY = 'documentVersion'
const SCHEMA_VERSION_METADATA_KEY = 'schemaVersion'
// Diagnostic only — deliberately absent from SnapshotVersion, see getSnapshotMetadata.
const DOCUMENT_CLOCK_METADATA_KEY = 'documentClock'

/**
 * Identifies the persisted content of a snapshot. Two snapshots with equal versions serialize to
 * the same document bytes, so re-uploading one over the other is pure waste.
 */
export interface SnapshotVersion {
	documentVersion: number
	schemaVersion: string
}

/**
 * The version of the document lane of a snapshot: the highest clock at which a document was
 * changed, deleted (tombstones), or pruned (tombstoneHistoryStartsAtClock).
 *
 * This is deliberately NOT `snapshot.documentClock`: that counter is shared with the
 * object lane, so a comment or reaction write bumps it without changing anything
 * `getSnapshot()` returns. Two snapshots with equal document versions serialize to the same
 * document content, whatever the shared counter says.
 */
export function getDocumentVersion(snapshot: RoomSnapshot): number {
	let version = snapshot.tombstoneHistoryStartsAtClock ?? 0
	for (const { lastChangedClock } of snapshot.documents) {
		if (lastChangedClock > version) version = lastChangedClock
	}
	if (snapshot.tombstones) {
		for (const clock of Object.values(snapshot.tombstones)) {
			if (clock > version) version = clock
		}
	}
	return version
}

/**
 * A hash of the snapshot's serialized schema, tracked alongside the document version because
 * `migrateStorage` writes a migrated schema but only calls `set` for records whose content
 * actually changed. A migration that applies to no record on this board therefore leaves every
 * clock untouched, and the document version alone would read that as nothing to persist —
 * stranding the migrated schema in the DO's SQLite while R2 keeps the old one forever.
 */
function getSchemaVersion(snapshot: RoomSnapshot): string {
	return hashString(canonicalJson(snapshot.schema))
}

export function getSnapshotVersion(snapshot: RoomSnapshot): SnapshotVersion {
	return {
		documentVersion: getDocumentVersion(snapshot),
		schemaVersion: getSchemaVersion(snapshot),
	}
}

/**
 * The R2 metadata stamped on a persisted snapshot: the {@link SnapshotVersion} the next persist
 * compares against, plus `documentClock` recording the clock the object was written at.
 *
 * `documentClock` is deliberately not part of `SnapshotVersion` and no read path compares it. It
 * is the counter shared with the object lane, so a comment write moves it without changing a byte
 * of the document — comparing on it would force an upload per comment and defeat the dedupe. It
 * is stamped so a history entry records when it was taken; on the rooms object it therefore reads
 * as the clock at the last document write, not the room's current clock.
 */
export function getSnapshotMetadata(snapshot: RoomSnapshot): Record<string, string> {
	const version = getSnapshotVersion(snapshot)
	const metadata: Record<string, string> = {
		[DOCUMENT_VERSION_METADATA_KEY]: String(version.documentVersion),
		[SCHEMA_VERSION_METADATA_KEY]: version.schemaVersion,
	}
	const documentClock = snapshot.documentClock ?? snapshot.clock
	if (documentClock !== undefined) {
		metadata[DOCUMENT_CLOCK_METADATA_KEY] = String(documentClock)
	}
	return metadata
}

/**
 * Reads the version stamped on an R2 object, or null if the object is missing or predates
 * version stamping. Null means "unknown" — callers must treat it as "not persisted" and write,
 * never as "up to date".
 */
export async function readPersistedSnapshotVersion(
	bucket: R2Bucket,
	key: string
): Promise<SnapshotVersion | null> {
	const head = await bucket.head(key)
	const rawDocumentVersion = head?.customMetadata?.[DOCUMENT_VERSION_METADATA_KEY]
	const schemaVersion = head?.customMetadata?.[SCHEMA_VERSION_METADATA_KEY]
	// A half-stamped object tells us nothing about the half that's missing.
	if (rawDocumentVersion === undefined || !schemaVersion) return null
	const documentVersion = Number(rawDocumentVersion)
	if (!Number.isFinite(documentVersion)) return null
	return { documentVersion, schemaVersion }
}

/**
 * Resolves the version stamped on an R2 object at most once, returning `known` untouched after
 * that. `undefined` means "not looked up yet"; `null` means "looked up, no usable stamp", and the
 * two must stay distinct.
 *
 * Looking it up a second time would let a persist observe its own partial write. A persist that
 * stamps the rooms object and then fails before writing the history entry retries with the
 * version it resolved beforehand; re-reading would hand it back its own fresh stamp, so it would
 * conclude everything was persisted and drop the history entry it still owes.
 */
export async function resolvePersistedSnapshotVersion(
	known: SnapshotVersion | null | undefined,
	bucket: R2Bucket,
	key: string
): Promise<SnapshotVersion | null> {
	if (known !== undefined) return known
	return await readPersistedSnapshotVersion(bucket, key)
}

/** Unknown (null) never matches, so an unstamped object is always re-uploaded. */
export function isSameSnapshotVersion(
	a: SnapshotVersion | null,
	b: SnapshotVersion | null
): boolean {
	if (!a || !b) return false
	return a.documentVersion === b.documentVersion && a.schemaVersion === b.schemaVersion
}

// Object keys are sorted so that a serializer emitting the same schema in a different order
// can't read as a change and re-upload every board.
function canonicalJson(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined'
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
	return `{${Object.keys(value)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonicalJson((value as any)[key])}`)
		.join(',')}}`
}

// FNV-1a run with two offsets: 64 bits of output makes a collision — which would skip a real
// upload — implausible. Non-cryptographic is fine, since this only answers "did the schema
// change?", and a false mismatch costs one redundant upload rather than losing a migration.
function hashString(value: string): string {
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
