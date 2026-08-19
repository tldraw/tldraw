import { TLShape } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { Environment } from '../../types'
import {
	ResolvedPageOk,
	ShapeMeasurement,
	buildClusterIndex,
	getClusterInfo,
	getClusterInfoFromIndex,
	isClusterIndexUsable,
	parseClusterIndex,
} from './boardTools'
import {
	MAX_CLUSTER_INDEX_BYTES,
	readPageClusterIndex,
	writePageClusterIndex,
} from './mcpClusterIndex'
import { makeFakeFileDurableObjectNamespace, makeScreenshotTestEnv } from './screenshotTestHelpers'
import { ResolvedThumbnailBoard } from './thumbnailRender'

// The cluster index in isolation: what survives the round trip through storage, what is refused on
// the way back, and the two limits that stop a cache from becoming a liability. The tool-level
// behaviour it produces — which calls measure and which don't — is in sharedBoardScreenshotMcp.test.

function makeShape(id: string, x: number): TLShape {
	return {
		id,
		typeName: 'shape',
		parentId: 'page:a',
		type: 'geo',
		x,
		y: 0,
		rotation: 0,
		index: 'a1',
		opacity: 1,
		isLocked: false,
		meta: {},
		props: { w: 80, h: 80 },
	} as unknown as TLShape
}

function makePage(
	shapes = [makeShape('shape:one', 0), makeShape('shape:two', 5000)]
): ResolvedPageOk {
	return { ok: true, pageId: 'page:a', pageName: 'Cover', shapes }
}

const MEASUREMENTS: Record<string, ShapeMeasurement> = {
	'shape:one': { minX: 0, minY: 0, maxX: 80, maxY: 80, text: 'Checkout total' },
	'shape:two': { minX: 5000, minY: 0, maxX: 5080, maxY: 80 },
}

const BOARD: ResolvedThumbnailBoard = {
	kind: 'published',
	slug: 'abc',
	version: 'v1',
	access: 'public',
	fileId: 'file-1',
}

function makeEnv(namespace = makeFakeFileDurableObjectNamespace()) {
	return { env: makeScreenshotTestEnv({ TLDR_DOC: namespace }), namespace }
}

describe('the stored index', () => {
	it('answers exactly what the measurements it was built from would', () => {
		const page = makePage()
		const index = buildClusterIndex(page, MEASUREMENTS)
		const clusterId = index.clusters[0].id
		const selector = { kind: 'ordinal', ordinal: 0 } as const

		const stored = parseClusterIndex(JSON.stringify(index))!
		expect(stored).toEqual(index)
		expect(getClusterInfoFromIndex(page, stored, clusterId, selector)).toEqual(
			getClusterInfo(page, MEASUREMENTS, clusterId, selector)
		)
	})

	it('keeps the measured text and drops the measured bounds', () => {
		const index = buildClusterIndex(makePage(), MEASUREMENTS)

		// Text is not derivable from the record, so it is stored. Bounds are: they decide which atoms
		// merge, and that decision is already in `clusters`.
		expect(index.text).toEqual({ 'shape:one': 'Checkout total' })
		expect(JSON.stringify(index)).not.toContain('minX')
	})

	it('refuses anything it did not write', () => {
		const index = buildClusterIndex(makePage(), MEASUREMENTS)

		expect(parseClusterIndex('not json')).toBeNull()
		expect(parseClusterIndex('null')).toBeNull()
		// A format from another build. The cache key rotates on edits, not on deploys, so this is the
		// only thing standing between a changed index shape and a tool reading it as current.
		expect(parseClusterIndex(JSON.stringify({ ...index, v: index.v + 1 }))).toBeNull()
		expect(parseClusterIndex(JSON.stringify({ ...index, clusters: 'lots' }))).toBeNull()
		expect(parseClusterIndex(JSON.stringify({ ...index, text: { 'shape:one': 12 } }))).toBeNull()
		expect(
			parseClusterIndex(
				JSON.stringify({ ...index, clusters: [{ id: 'cluster:x', label: 'x', keywords: [] }] })
			)
		).toBeNull()
	})

	it('is unusable for a page whose shapes it does not name', () => {
		const index = buildClusterIndex(makePage(), MEASUREMENTS)

		expect(isClusterIndexUsable(makePage(), index)).toBe(true)
		// One shape gone: the board moved under the index in a way its version did not catch, so it is
		// refused rather than served with a cluster that is quietly a shape short.
		expect(isClusterIndexUsable(makePage([makeShape('shape:one', 0)]), index)).toBe(false)
	})
})

describe('reading and writing', () => {
	it('stores a page index and reads it back for the same content version', async () => {
		const { env, namespace } = makeEnv()
		const page = makePage()
		const index = buildClusterIndex(page, MEASUREMENTS)

		await writePageClusterIndex({ env }, BOARD, page, index)
		expect(await readPageClusterIndex({ env }, BOARD, page)).toEqual(index)
		expect(namespace.calls.put).toBe(1)

		// A rotated version is a miss: the row is still there, but it is not for this content.
		const moved = { ...BOARD, version: 'v2' }
		expect(await readPageClusterIndex({ env }, moved, page)).toBeNull()

		// And writing under the new version replaces the row rather than adding one, so a file's cache
		// is bounded by its page count no matter how often it is edited.
		await writePageClusterIndex({ env }, moved, page, index)
		expect(namespace.store.size).toBe(1)
	})

	it('does not store a page whose index is over the size cap', async () => {
		const { env, namespace } = makeEnv()
		const shapes = Array.from({ length: 12000 }, (_, i) => makeShape(`shape:${i}`, i * 200))
		const page = makePage(shapes)
		const index = buildClusterIndex(page, {})

		expect(JSON.stringify(index).length).toBeGreaterThan(MAX_CLUSTER_INDEX_BYTES)
		await writePageClusterIndex({ env }, BOARD, page, index)

		// Nothing written, and nothing thrown: a page this size keeps measuring, which is what it did
		// before the cache existed.
		expect(namespace.store.size).toBe(0)
		expect(await readPageClusterIndex({ env }, BOARD, page)).toBeNull()
	})

	it('reports a broken durable object as a miss rather than raising', async () => {
		const broken = {
			idFromName: (name: string) => ({ toString: () => `do(${name})` }),
			get: () => ({
				async getMcpClusterIndex() {
					throw new Error('nope')
				},
				async putMcpClusterIndex() {
					throw new Error('nope')
				},
			}),
		}
		const env = makeScreenshotTestEnv({ TLDR_DOC: broken }) as Environment
		const page = makePage()

		expect(await readPageClusterIndex({ env }, BOARD, page)).toBeNull()
		await expect(
			writePageClusterIndex({ env }, BOARD, page, buildClusterIndex(page, MEASUREMENTS))
		).resolves.toBeUndefined()
	})
})
