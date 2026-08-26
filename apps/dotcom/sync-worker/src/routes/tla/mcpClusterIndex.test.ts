import { TLShape } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { Environment } from '../../types'
import {
	ResolvedPageOk,
	ShapeMeasurement,
	buildClusterIndex,
	clusterPage,
	clustersFromIndex,
	getClusterInfo,
	parseClusterIndex,
} from './boardTools'
import {
	MAX_CLUSTER_INDEX_LENGTH,
	readPageClusters,
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
	return { ok: true, pageId: 'page:a', pageName: 'Cover', shapes, pageIds: ['page:a'] }
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

const SNAPSHOT_VERSION = 'snapshot-v1'

function makeEnv() {
	const namespace = makeFakeFileDurableObjectNamespace()
	return { env: makeScreenshotTestEnv({ TLDR_DOC: namespace }), namespace }
}

describe('the stored index', () => {
	it('answers exactly what the clusters it was built from would', () => {
		const page = makePage()
		const clusters = clusterPage(page, MEASUREMENTS)
		const selector = { kind: 'ordinal', ordinal: 0 } as const

		const stored = parseClusterIndex(JSON.stringify(buildClusterIndex(clusters)))!
		const rehydrated = clustersFromIndex(page, stored)!

		expect(getClusterInfo(page, rehydrated, clusters[0].id, selector)).toEqual(
			getClusterInfo(page, clusters, clusters[0].id, selector)
		)
	})

	it('keeps the measured text and drops the measured bounds', () => {
		const index = buildClusterIndex(clusterPage(makePage(), MEASUREMENTS))

		// Text is not derivable from the record, so it is stored. Bounds are: they decide which atoms
		// merge, and that decision is already in `clusters`.
		expect(index.text).toEqual({ 'shape:one': 'Checkout total' })
		expect(JSON.stringify(index)).not.toContain('minX')
	})

	it('refuses a row this build did not write', () => {
		const index = buildClusterIndex(clusterPage(makePage(), MEASUREMENTS))

		expect(parseClusterIndex('not json')).toBeNull()
		expect(parseClusterIndex('null')).toBeNull()
		// A format from another build. The cache key rotates on edits, not on deploys, so this is the
		// only thing standing between a changed index shape and a tool reading it as current.
		expect(parseClusterIndex(JSON.stringify({ ...index, v: index.v + 1 }))).toBeNull()
		expect(parseClusterIndex(JSON.stringify({ ...index, clusters: undefined }))).toBeNull()
	})

	it('refuses to rebuild for a page that has gained shapes', () => {
		const index = buildClusterIndex(clusterPage(makePage(), MEASUREMENTS))

		// The direction a stored index cannot otherwise notice. Nothing about the index is wrong — it
		// rebuilds cleanly — it is just short, and answering short is a wrong answer no uncached call
		// could give. An index built when the page was empty is the worst case: a full page would be
		// reported as having no clusters at all.
		const grown = makePage([...makePage().shapes, makeShape('shape:three', 200)])
		expect(clustersFromIndex(grown, index)).toBeNull()
		expect(clustersFromIndex(grown, buildClusterIndex([]))).toBeNull()
	})

	it('refuses to rebuild for a page whose shapes it does not name', () => {
		const index = buildClusterIndex(clusterPage(makePage(), MEASUREMENTS))

		expect(clustersFromIndex(makePage(), index)).not.toBeNull()
		// One shape gone: the board moved under the index in a way its version did not catch, so it is
		// refused rather than served with a cluster that is quietly a shape short.
		expect(clustersFromIndex(makePage([makeShape('shape:one', 0)]), index)).toBeNull()
	})
})

describe('reading and writing', () => {
	it('stores a page index and reads its clusters back for the same content version', async () => {
		const { env, namespace } = makeEnv()
		const page = makePage()
		const clusters = clusterPage(page, MEASUREMENTS)

		await writePageClusterIndex({ env }, BOARD, page, buildClusterIndex(clusters), SNAPSHOT_VERSION)
		expect(await readPageClusters({ env }, BOARD, page, SNAPSHOT_VERSION)).toEqual(clusters)
		expect(namespace.calls.put).toBe(1)

		// The resolved board version can move before R2 does, so it is deliberately not the cache key.
		const moved = { ...BOARD, version: 'v2' }
		expect(await readPageClusters({ env }, moved, page, SNAPSHOT_VERSION)).toEqual(clusters)

		// The digest of the snapshot actually read is the key. This catches a publish-gap read where
		// lastPublished already moved but R2 still held the previous snapshot, even when both snapshots
		// contain the same shape ids.
		expect(await readPageClusters({ env }, moved, page, 'snapshot-v2')).toBeNull()

		// And writing under the new snapshot replaces the row rather than adding one, so a file's cache
		// is bounded by its page count no matter how often it is edited.
		await writePageClusterIndex({ env }, moved, page, buildClusterIndex(clusters), 'snapshot-v2')
		expect([...namespace.objects.values()].flatMap((store) => [...store.keys()])).toHaveLength(1)
	})

	it('does not store a page whose index is over the size cap', async () => {
		const { env, namespace } = makeEnv()
		const shapes = Array.from({ length: 12000 }, (_, i) => makeShape(`shape:${i}`, i * 200))
		const page = makePage(shapes)
		const index = buildClusterIndex(clusterPage(page, {}))

		expect(JSON.stringify(index).length).toBeGreaterThan(MAX_CLUSTER_INDEX_LENGTH)
		await writePageClusterIndex({ env }, BOARD, page, index, SNAPSHOT_VERSION)

		// Nothing written, and nothing thrown: a page this size keeps measuring, which is what it did
		// before the cache existed.
		expect([...namespace.objects.values()].flatMap((store) => [...store.keys()])).toHaveLength(0)
		expect(await readPageClusters({ env }, BOARD, page, SNAPSHOT_VERSION)).toBeNull()
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

		expect(await readPageClusters({ env }, BOARD, page, SNAPSHOT_VERSION)).toBeNull()
		await expect(
			writePageClusterIndex(
				{ env },
				BOARD,
				page,
				buildClusterIndex(clusterPage(page, MEASUREMENTS)),
				SNAPSHOT_VERSION
			)
		).resolves.toBeUndefined()
	})

	it('treats a malformed stored row as a miss', async () => {
		const { env, namespace } = makeEnv()
		const page = makePage()
		await writePageClusterIndex(
			{ env },
			BOARD,
			page,
			buildClusterIndex(clusterPage(page, MEASUREMENTS)),
			SNAPSHOT_VERSION
		)

		// Not a shape parseClusterIndex checks field by field — reading it throws inside the rebuild,
		// which the cache read catches and reports. Either way the caller measures.
		for (const store of namespace.objects.values()) {
			for (const [key, row] of store) {
				store.set(key, { ...row, payload: '{"v":1,"clusters":[{}],"text":{}}' })
			}
		}
		expect(await readPageClusters({ env }, BOARD, page, SNAPSHOT_VERSION)).toBeNull()
	})
})
