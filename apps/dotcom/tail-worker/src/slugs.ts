/// <reference types="@cloudflare/workers-types" />

// A file slug is the whole authority of a board (tldraw.com/f/<slug> — no other check gates access),
// so it must never reach a third-party log sink as free text. `idFromName` is one-way, so converting a
// slug to its durable object id here redacts it while staying joinable: the id this produces equals
// the `durableObjectId` every err row already indexes on.

// Mirrors ROOM_PREFIX in packages/dotcom-shared/src/routes.ts, the name Cloudflare hashes via
// idFromName. Duplicated as a literal rather than imported, so this worker's dependency footprint
// stays at @cloudflare/workers-types alone: a mismatch here just produces an id that does not join to
// the sync worker's rows, it never falls back to letting the plaintext slug through.
const ROOM_PREFIX = 'r'

const REDACTED = '<slug>'

// Fail closed: with no binding, or an idFromName failure, the plaintext slug must never be the thing
// that gets returned.
function toRoomObjectId(slug: string, tldrDoc: DurableObjectNamespace | undefined): string {
	if (!tldrDoc) return REDACTED
	try {
		return tldrDoc.idFromName(`/${ROOM_PREFIX}/${slug}`).toString()
	} catch (_e) {
		return REDACTED
	}
}

const ROOM_NOT_FOUND_RE = /Room not found: (\S+)/g

/**
 * Converts every `Room not found: <slug>` occurrence in `text` to `Room not found: <objectId>`. Text
 * with no such occurrence passes through unchanged. This is the only slug shape handled here — no
 * generic slug-shaped pattern is matched, by design.
 */
export function redactRoomNotFoundSlug(
	text: string,
	tldrDoc: DurableObjectNamespace | undefined
): string {
	return text.replace(ROOM_NOT_FOUND_RE, (_match, slug: string) => {
		return `Room not found: ${toRoomObjectId(slug, tldrDoc)}`
	})
}

const SLUG_BEARING_CONSOLE_PREFIXES = new Set([
	'failed to retrieve document',
	'failed to fetch doc',
])

/**
 * Converts every slug-bearing string in a captured console.error(...) args array. workerd flattens an
 * Error argument to the plain string `"<name>: <message>"`, so a RoomNotFoundError thrown anywhere —
 * not just behind the two literal prefixes below — can show up in any element, including a bare
 * `console.error(err)`'s only element. Every string element is run through redactRoomNotFoundSlug
 * first; then, for the two known `console.error('failed to retrieve document' | 'failed to fetch doc',
 * slug, error)` shapes, args[1] — which is the bare slug with no surrounding text — is additionally
 * converted to a joinable object id rather than left as the generic redaction marker. Must run before
 * the args are stringified: matching against JSON-escaped text is not this function's job.
 */
export function redactConsoleArgsSlug(
	args: unknown[],
	tldrDoc: DurableObjectNamespace | undefined
): unknown[] {
	const redacted = args.map((arg) =>
		typeof arg === 'string' ? redactRoomNotFoundSlug(arg, tldrDoc) : arg
	)

	if (
		typeof args[0] === 'string' &&
		SLUG_BEARING_CONSOLE_PREFIXES.has(args[0]) &&
		typeof args[1] === 'string'
	) {
		redacted[1] = toRoomObjectId(args[1], tldrDoc)
	}

	return redacted
}
