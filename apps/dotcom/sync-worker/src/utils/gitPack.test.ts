import { execFileSync } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it } from 'vitest'
import {
	ZERO_OID,
	buildCommitObject,
	buildPack,
	buildSnapshotPush,
	buildTreeObject,
	hashGitObject,
	packEntryHeader,
	parseReportStatus,
	pktLine,
	sha1Hex,
} from './gitPack'

const encoder = new TextEncoder()

// Golden values generated with real git (git hash-object / write-tree / commit-tree):
// blob content {"documentClock":42,"documents":[]} with author "huppy [bot]"
// <huppy@tldraw.com> at unix time 1786500000 +0000.
const GOLDEN_BLOB_CONTENT = '{"documentClock":42,"documents":[]}'
const GOLDEN_BLOB_SHA = 'b49550ed81b1d251daab628675b1dae857b9040e'
const GOLDEN_TREE_SHA = '3788c11da6a63e97183db1ef3f083f210ceb1215'
const GOLDEN_COMMIT_SHA = '8a7c322f9ef13479d747b8ef8176f81b5eb315ee'
const GOLDEN_AUTHOR = { name: 'huppy [bot]', email: 'huppy@tldraw.com' }
const GOLDEN_TIMESTAMP = 1786500000
const GOLDEN_MESSAGE = 'Snapshot at 2026-08-12T02:40:00.000Z\n\nDocument-Clock: 42'

const GOLDEN_BLOB2_CONTENT =
	'{"documentClock":43,"documents":[{"state":{"id":"shape:a"},"lastChangedClock":43}]}'
const GOLDEN_COMMIT2_SHA = 'e19f0fcb7bc6adca5efc74beeb23a49bc2cef8af'
const GOLDEN_TIMESTAMP2 = 1786500060
const GOLDEN_MESSAGE2 = 'Snapshot at 2026-08-12T02:41:00.000Z\n\nDocument-Clock: 43'

function hasGit(): boolean {
	try {
		execFileSync('git', ['--version'], { stdio: 'ignore' })
		return true
	} catch {
		return false
	}
}

describe('git object identity (golden shas from real git)', () => {
	it('hashes a blob', async () => {
		expect(await hashGitObject('blob', encoder.encode(GOLDEN_BLOB_CONTENT))).toBe(GOLDEN_BLOB_SHA)
	})

	it('builds and hashes a single-entry tree', async () => {
		const tree = buildTreeObject([
			{ mode: '100644', name: 'snapshot.json', shaHex: GOLDEN_BLOB_SHA },
		])
		// `<mode> <name>\0` + 20 raw sha bytes
		expect(tree.length).toBe('100644 snapshot.json\0'.length + 20)
		expect(await hashGitObject('tree', tree)).toBe(GOLDEN_TREE_SHA)
	})

	it('builds and hashes a root commit', async () => {
		const commit = buildCommitObject({
			treeSha: GOLDEN_TREE_SHA,
			author: GOLDEN_AUTHOR,
			timestampSec: GOLDEN_TIMESTAMP,
			message: GOLDEN_MESSAGE,
		})
		expect(await hashGitObject('commit', commit)).toBe(GOLDEN_COMMIT_SHA)
	})

	it('builds and hashes a commit with a parent', async () => {
		const blobSha = await hashGitObject('blob', encoder.encode(GOLDEN_BLOB2_CONTENT))
		const tree = buildTreeObject([{ mode: '100644', name: 'snapshot.json', shaHex: blobSha }])
		const commit = buildCommitObject({
			treeSha: await hashGitObject('tree', tree),
			parentSha: GOLDEN_COMMIT_SHA,
			author: GOLDEN_AUTHOR,
			timestampSec: GOLDEN_TIMESTAMP2,
			message: GOLDEN_MESSAGE2,
		})
		expect(await hashGitObject('commit', commit)).toBe(GOLDEN_COMMIT2_SHA)
	})
})

describe('pack structure', () => {
	it('encodes entry headers with varint sizes', () => {
		// size 10 fits the low nibble: one byte, type blob (3) in bits 4-6
		expect([...packEntryHeader('blob', 10)]).toEqual([0x3a])
		// size 16 needs a continuation byte
		expect([...packEntryHeader('blob', 16)]).toEqual([0xb0, 0x01])
		// commit (1), size 0
		expect([...packEntryHeader('commit', 0)]).toEqual([0x10])
	})

	it('builds a pack with a valid header and SHA-1 trailer', async () => {
		const pack = await buildPack([{ type: 'blob', content: encoder.encode('hello') }])
		expect(new TextDecoder().decode(pack.slice(0, 4))).toBe('PACK')
		const view = new DataView(pack.buffer, pack.byteOffset)
		expect(view.getUint32(4)).toBe(2)
		expect(view.getUint32(8)).toBe(1)
		const trailer = [...pack.slice(-20)].map((b) => b.toString(16).padStart(2, '0')).join('')
		expect(trailer).toBe(await sha1Hex(pack.slice(0, -20)))
	})
})

describe('pkt-line and report-status', () => {
	it('encodes pkt-lines with self-inclusive lengths', () => {
		expect(new TextDecoder().decode(pktLine('a'))).toBe('0005a')
	})

	it('parses a successful report-status', () => {
		const body = new Uint8Array([
			...pktLine('unpack ok\n'),
			...pktLine('ok refs/heads/main\n'),
			...encoder.encode('0000'),
		])
		expect(parseReportStatus(body)).toEqual({ unpackOk: true, refOk: true, refMessage: null })
	})

	it('parses a CAS rejection', () => {
		const body = new Uint8Array([
			...pktLine('unpack ok\n'),
			...pktLine('ng refs/heads/main fetch first\n'),
			...encoder.encode('0000'),
		])
		expect(parseReportStatus(body)).toEqual({
			unpackOk: true,
			refOk: false,
			refMessage: 'fetch first',
		})
	})

	it('handles truncated bodies', () => {
		expect(parseReportStatus(encoder.encode('00'))).toEqual({
			unpackOk: false,
			refOk: false,
			refMessage: 'no ref status in response',
		})
	})
})

describe.skipIf(!hasGit())('round-trip with real git', () => {
	const dirs: string[] = []
	afterAll(() => {
		for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
	})

	it('produces a pack that git index-pack --strict accepts and objects git can read', async () => {
		const { body, commitSha, packBytes } = await buildSnapshotPush({
			snapshotJson: encoder.encode(GOLDEN_BLOB_CONTENT),
			parentSha: undefined,
			author: GOLDEN_AUTHOR,
			timestampSec: GOLDEN_TIMESTAMP,
			message: GOLDEN_MESSAGE,
		})
		expect(commitSha).toBe(GOLDEN_COMMIT_SHA)

		// The receive-pack body is command pkt-line + flush + pack; the pack is the tail.
		const pack = body.slice(body.length - packBytes)
		expect(new TextDecoder().decode(pack.slice(0, 4))).toBe('PACK')

		const dir = mkdtempSync(join(tmpdir(), 'gitpack-test-'))
		dirs.push(dir)
		execFileSync('git', ['init', '--quiet', '--bare', dir])
		execFileSync('git', ['index-pack', '--strict', '--stdin'], {
			cwd: dir,
			input: pack,
		})

		const catFile = (oid: string, kind: string) =>
			execFileSync('git', ['cat-file', kind, oid], { cwd: dir }).toString()
		expect(catFile(GOLDEN_BLOB_SHA, 'blob')).toBe(GOLDEN_BLOB_CONTENT)
		expect(catFile(commitSha, 'commit')).toContain(`tree ${GOLDEN_TREE_SHA}`)
		expect(catFile(commitSha, 'commit')).toContain('Document-Clock: 42')
	})

	it('builds a receive-pack body whose command line matches the computed shas', async () => {
		const { body, commitSha } = await buildSnapshotPush({
			snapshotJson: encoder.encode(GOLDEN_BLOB2_CONTENT),
			parentSha: GOLDEN_COMMIT_SHA,
			author: GOLDEN_AUTHOR,
			timestampSec: GOLDEN_TIMESTAMP2,
			message: GOLDEN_MESSAGE2,
		})
		expect(commitSha).toBe(GOLDEN_COMMIT2_SHA)
		const head = new TextDecoder().decode(body.slice(0, 200))
		expect(head).toContain(`${GOLDEN_COMMIT_SHA} ${GOLDEN_COMMIT2_SHA} refs/heads/main`)
		expect(head).toContain('report-status')
	})

	it('uses the zero oid for pushes to an empty repo', async () => {
		const { body } = await buildSnapshotPush({
			snapshotJson: encoder.encode('{}'),
			parentSha: undefined,
			author: GOLDEN_AUTHOR,
			timestampSec: GOLDEN_TIMESTAMP,
			message: 'Snapshot at 2026-08-12T00:00:00.000Z',
		})
		expect(new TextDecoder().decode(body.slice(4, 44))).toBe(ZERO_OID)
	})
})
