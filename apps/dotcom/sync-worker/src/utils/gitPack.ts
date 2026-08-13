/**
 * Minimal git object, packfile, and smart-HTTP receive-pack primitives — just enough to
 * push a blob-layout snapshot commit (blob + 1-entry tree + commit) to a git remote from
 * the Workers runtime. Pure module: no env, no bindings, no DO imports.
 *
 * Wire formats implemented from the git documentation (gitformat-pack, protocol-common,
 * pack-protocol). The pack contains only undeltified entries; the server has the parent
 * commit and old tree, so three new objects per push is complete.
 */

export const ZERO_OID = '0'.repeat(40)

export type GitObjectType = 'commit' | 'tree' | 'blob'

// Pack entry type numbers per gitformat-pack.
const PACK_TYPE: Record<GitObjectType, number> = { commit: 1, tree: 2, blob: 3 }

const encoder = new TextEncoder()

export function concatBytes(chunks: Uint8Array[]): Uint8Array {
	const out = new Uint8Array(chunks.reduce((sum, c) => sum + c.length, 0))
	let offset = 0
	for (const chunk of chunks) {
		out.set(chunk, offset)
		offset += chunk.length
	}
	return out
}

export async function sha1Hex(bytes: Uint8Array): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-1', bytes as BufferSource)
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha1Bytes(bytes: Uint8Array): Promise<Uint8Array> {
	return new Uint8Array(await crypto.subtle.digest('SHA-1', bytes as BufferSource))
}

function hexToBytes(hex: string): Uint8Array {
	const out = new Uint8Array(hex.length / 2)
	for (let i = 0; i < out.length; i++) {
		out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
	}
	return out
}

/**
 * A git object's id is the SHA-1 of `<type> <byteLength>\0<content>`. The header exists
 * only for identity hashing — pack entries carry type/size in their own header instead.
 */
export async function hashGitObject(type: GitObjectType, content: Uint8Array): Promise<string> {
	const header = encoder.encode(`${type} ${content.length}\0`)
	return await sha1Hex(concatBytes([header, content]))
}

/** Tree entry: `<mode> <name>\0` + 20 raw sha bytes (not hex). */
export function buildTreeObject(
	entries: Array<{ mode: string; name: string; shaHex: string }>
): Uint8Array {
	return concatBytes(
		entries.map((entry) =>
			concatBytes([encoder.encode(`${entry.mode} ${entry.name}\0`), hexToBytes(entry.shaHex)])
		)
	)
}

export function buildCommitObject(opts: {
	treeSha: string
	parentSha?: string
	author: { name: string; email: string }
	timestampSec: number
	message: string
}): Uint8Array {
	const ident = `${opts.author.name} <${opts.author.email}> ${opts.timestampSec} +0000`
	let text = `tree ${opts.treeSha}\n`
	if (opts.parentSha) text += `parent ${opts.parentSha}\n`
	text += `author ${ident}\n`
	text += `committer ${ident}\n`
	text += `\n${opts.message}\n`
	return encoder.encode(text)
}

/** RFC-1950 zlib stream, as git pack entries require. */
async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
	const stream = new Blob([bytes as BlobPart])
		.stream()
		.pipeThrough(new CompressionStream('deflate'))
	const chunks: Uint8Array[] = []
	const reader = stream.getReader()
	for (;;) {
		const { done, value } = await reader.read()
		if (done) break
		chunks.push(value)
	}
	return concatBytes(chunks)
}

/**
 * Pack entry header: bits 4-6 of the first byte are the type, low 4 bits are the size's
 * low nibble; remaining size bits follow in 7-bit little-endian groups with MSB
 * continuation flags.
 */
export function packEntryHeader(type: GitObjectType, size: number): Uint8Array {
	const bytes: number[] = []
	let first = (PACK_TYPE[type] << 4) | (size & 0x0f)
	let rest = Math.floor(size / 16)
	while (rest > 0) {
		bytes.push(first | 0x80)
		first = rest & 0x7f
		rest = Math.floor(rest / 128)
	}
	bytes.push(first)
	return new Uint8Array(bytes)
}

/** `PACK` + version 2 + entry count, then entries, then a SHA-1 trailer over everything. */
export async function buildPack(
	objects: Array<{ type: GitObjectType; content: Uint8Array }>
): Promise<Uint8Array> {
	const header = new Uint8Array(12)
	header.set(encoder.encode('PACK'), 0)
	new DataView(header.buffer).setUint32(4, 2)
	new DataView(header.buffer).setUint32(8, objects.length)

	const parts: Uint8Array[] = [header]
	for (const obj of objects) {
		parts.push(packEntryHeader(obj.type, obj.content.length))
		parts.push(await deflate(obj.content))
	}
	const body = concatBytes(parts)
	return concatBytes([body, await sha1Bytes(body)])
}

/** pkt-line: 4 hex digits of total line length (including the 4 digits), then the payload. */
export function pktLine(payload: string): Uint8Array {
	const bytes = encoder.encode(payload)
	const length = (bytes.length + 4).toString(16).padStart(4, '0')
	return concatBytes([encoder.encode(length), bytes])
}

const FLUSH_PKT = encoder.encode('0000')

/**
 * Body for POST <remote>/git-receive-pack. No ref discovery round-trip is needed: the
 * command's old-oid is our own tracked head and doubles as the compare-and-swap — a stale
 * old-oid comes back as `ng` in report-status. We request only `report-status` (no
 * side-band) so the response parses as plain pkt-lines.
 */
export function buildReceivePackBody(opts: {
	oldOid: string
	newOid: string
	ref: string
	pack: Uint8Array
}): Uint8Array {
	const command = pktLine(
		`${opts.oldOid} ${opts.newOid} ${opts.ref}\0report-status agent=tldraw-sync/1\n`
	)
	return concatBytes([command, FLUSH_PKT, opts.pack])
}

export interface ReportStatus {
	unpackOk: boolean
	refOk: boolean
	refMessage: string | null
}

/**
 * Parse a report-status response: pkt-lines `unpack <result>`, then per-ref
 * `ok <ref>` / `ng <ref> <reason>`. HTTP 200 does not imply success — `ng` here is the
 * real answer (and a CAS conflict surfaces as `ng` with a non-fast-forward-ish reason).
 */
export function parseReportStatus(body: Uint8Array): ReportStatus {
	const text = new TextDecoder().decode(body)
	const lines: string[] = []
	let cursor = 0
	while (cursor + 4 <= text.length) {
		const length = parseInt(text.slice(cursor, cursor + 4), 16)
		if (Number.isNaN(length)) break
		if (length === 0) {
			cursor += 4
			continue
		}
		lines.push(text.slice(cursor + 4, cursor + length).replace(/\n$/, ''))
		cursor += length
	}
	const unpackOk = lines.some((line) => line === 'unpack ok')
	const refLine = lines.find((line) => line.startsWith('ok ') || line.startsWith('ng '))
	if (!refLine) {
		return { unpackOk, refOk: false, refMessage: 'no ref status in response' }
	}
	if (refLine.startsWith('ok ')) {
		return { unpackOk, refOk: true, refMessage: null }
	}
	const match = refLine.match(/^ng \S+ ?(.*)$/)
	return { unpackOk, refOk: false, refMessage: match?.[1] || 'unknown failure' }
}

/**
 * Convenience: build the three objects for a blob-layout snapshot commit and return the
 * receive-pack body plus the new commit sha (computed client-side, which is what makes
 * ambiguous push outcomes exactly verifiable against the remote head).
 */
export async function buildSnapshotPush(opts: {
	snapshotJson: Uint8Array
	parentSha: string | undefined
	author: { name: string; email: string }
	timestampSec: number
	message: string
	ref?: string
}): Promise<{ body: Uint8Array; commitSha: string; packBytes: number }> {
	const blobSha = await hashGitObject('blob', opts.snapshotJson)
	const tree = buildTreeObject([{ mode: '100644', name: 'snapshot.json', shaHex: blobSha }])
	const treeSha = await hashGitObject('tree', tree)
	const commit = buildCommitObject({
		treeSha,
		parentSha: opts.parentSha,
		author: opts.author,
		timestampSec: opts.timestampSec,
		message: opts.message,
	})
	const commitSha = await hashGitObject('commit', commit)
	const pack = await buildPack([
		{ type: 'commit', content: commit },
		{ type: 'tree', content: tree },
		{ type: 'blob', content: opts.snapshotJson },
	])
	const body = buildReceivePackBody({
		oldOid: opts.parentSha ?? ZERO_OID,
		newOid: commitSha,
		ref: opts.ref ?? 'refs/heads/main',
		pack,
	})
	return { body, commitSha, packBytes: pack.length }
}
