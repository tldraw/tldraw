import { TLShape } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { Environment } from '../../types'
import {
	CLUSTER_INDEX_FORMAT_VERSION,
	ResolvedPageOk,
	ShapeMeasurement,
	buildClusterIndex,
	clusterPage,
	clusteringFromIndex,
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
// behaviour it produces — which calls measure and which don't — is in mcpServer.test.

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
	return {
		ok: true,
		pageId: 'page:a',
		pageName: 'Cover',
		shapes,
		bindings: [],
		pageIds: ['page:a'],
	}
}

const MEASUREMENTS: Record<string, ShapeMeasurement> = {
	'shape:one': { minX: 0.4, minY: -0.6, maxX: 80.2, maxY: 79.9, text: 'Checkout total' },
	'shape:two': {
		minX: 5000,
		minY: 0,
		maxX: 5080.5,
		maxY: 80,
		arrow: { start: { x: 5000.3, y: 0.2 }, end: { x: 5080.5, y: 79.6 }, label: { x: 5040, y: 40 } },
	},
}

// Whichever cluster a shape is in, so a test can be read without knowing the hash it got.
function clusterIdOf(clusters: ReturnType<typeof clusterPage>, shapeId: string) {
	return clusters.find((cluster) => cluster.shapes.some((shape) => shape.id === shapeId))!.id
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
	// Geometry is stored rounded, the way every tool reports it, so a fresh render's floats and a
	// stored index's integers have to describe every shape identically.
	it('answers exactly what the clusters it was built from would', () => {
		const page = makePage()
		const clusters = clusterPage(page, MEASUREMENTS)
		const selector = { kind: 'ordinal', ordinal: 0 } as const

		const stored = parseClusterIndex(JSON.stringify(buildClusterIndex(clusters, MEASUREMENTS)))!
		const rehydrated = clusteringFromIndex(page, stored)!

		for (const shapeId of ['shape:one', 'shape:two']) {
			const clusterId = clusterIdOf(clusters, shapeId)
			expect(getClusterInfo(page, rehydrated, clusterId, selector)).toEqual(
				getClusterInfo(page, { clusters, measurements: MEASUREMENTS }, clusterId, selector)
			)
		}
	})

	it('keeps the text, rounded bounds and arrow geometry', () => {
		const clusters = clusterPage(makePage(), MEASUREMENTS)
		const index = buildClusterIndex(clusters, MEASUREMENTS)

		expect(index.text).toEqual({ 'shape:one': 'Checkout total' })
		// Bounds sit beside the ids they belong to rather than keyed by them again.
		expect(index.clusters.map((c) => [c.shapeIds, c.bounds])).toEqual([
			[
				['shape:one', 'shape:two'],
				[
					[0, -1, 80, 81],
					[5000, 0, 81, 80],
				],
			],
		])
		expect(index.arrows).toEqual({
			'shape:two': { start: [5000, 0], end: [5081, 80], label: [5040, 40] },
		})
	})

	it('stores a shape the render could not measure without bounds', () => {
		const index = buildClusterIndex(clusterPage(makePage(), {}), {})
		expect(index.clusters.flatMap((c) => c.bounds)).toEqual([null, null])

		const rehydrated = clusteringFromIndex(makePage(), index)!
		expect(rehydrated.measurements).toEqual({})
	})

	it('refuses a row this build did not write', () => {
		const index = buildClusterIndex(clusterPage(makePage(), MEASUREMENTS), MEASUREMENTS)

		expect(parseClusterIndex('not json')).toBeNull()
		expect(parseClusterIndex('null')).toBeNull()
		// A format from another build. The cache key rotates on edits, not on deploys, so this is the
		// only thing standing between a changed index shape and a tool reading it as current.
		expect(parseClusterIndex(JSON.stringify({ ...index, v: index.v + 1 }))).toBeNull()
		expect(parseClusterIndex(JSON.stringify({ ...index, clusters: undefined }))).toBeNull()
		expect(parseClusterIndex(JSON.stringify({ ...index, arrows: undefined }))).toBeNull()
	})

	it('refuses to rebuild for a page that has gained shapes', () => {
		const index = buildClusterIndex(clusterPage(makePage(), MEASUREMENTS), MEASUREMENTS)

		// The direction a stored index cannot otherwise notice. Nothing about the index is wrong — it
		// rebuilds cleanly — it is just short, and answering short is a wrong answer no uncached call
		// could give. An index built when the page was empty is the worst case: a full page would be
		// reported as having no clusters at all.
		const grown = makePage([...makePage().shapes, makeShape('shape:three', 200)])
		expect(clusteringFromIndex(grown, index)).toBeNull()
		expect(clusteringFromIndex(grown, buildClusterIndex([], {}))).toBeNull()
	})

	it('refuses to rebuild for a page whose shapes it does not name', () => {
		const index = buildClusterIndex(clusterPage(makePage(), MEASUREMENTS), MEASUREMENTS)

		expect(clusteringFromIndex(makePage(), index)).not.toBeNull()
		// One shape gone: the board moved under the index in a way its version did not catch, so it is
		// refused rather than served with a cluster that is quietly a shape short.
		expect(clusteringFromIndex(makePage([makeShape('shape:one', 0)]), index)).toBeNull()
	})
})

describe('reading and writing', () => {
	it('stores a page index and reads its clusters back for the same content version', async () => {
		const { env, namespace } = makeEnv()
		const page = makePage()
		const clusters = clusterPage(page, MEASUREMENTS)

		const index = buildClusterIndex(clusters, MEASUREMENTS)
		const stored = clusteringFromIndex(page, index)

		await writePageClusterIndex({ env }, BOARD, page, index, SNAPSHOT_VERSION)
		expect(await readPageClusters({ env }, BOARD, page, SNAPSHOT_VERSION)).toEqual(stored)
		expect(stored!.clusters).toEqual(clusters)
		expect(namespace.calls.put).toBe(1)

		// The resolved board version can move before R2 does, so it is deliberately not the cache key.
		const moved = { ...BOARD, version: 'v2' }
		expect(await readPageClusters({ env }, moved, page, SNAPSHOT_VERSION)).toEqual(stored)

		// The digest of the snapshot actually read is the key. This catches a publish-gap read where
		// lastPublished already moved but R2 still held the previous snapshot, even when both snapshots
		// contain the same shape ids.
		expect(await readPageClusters({ env }, moved, page, 'snapshot-v2')).toBeNull()

		// And writing under the new snapshot replaces the row rather than adding one, so a file's cache
		// is bounded by its page count no matter how often it is edited.
		await writePageClusterIndex({ env }, moved, page, index, 'snapshot-v2')
		expect([...namespace.objects.values()].flatMap((store) => [...store.keys()])).toHaveLength(1)
	})

	it('does not store a page whose index is over the size cap', async () => {
		const { env, namespace } = makeEnv()
		const shapes = Array.from({ length: 12000 }, (_, i) => makeShape(`shape:${i}`, i * 200))
		const page = makePage(shapes)
		const index = buildClusterIndex(clusterPage(page, {}), {})

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
				buildClusterIndex(clusterPage(page, MEASUREMENTS), MEASUREMENTS),
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
			buildClusterIndex(clusterPage(page, MEASUREMENTS), MEASUREMENTS),
			SNAPSHOT_VERSION
		)

		// Not a shape parseClusterIndex checks field by field — reading it throws inside the rebuild,
		// which the cache read catches and reports. Either way the caller measures.
		for (const store of namespace.objects.values()) {
			for (const [key, row] of store) {
				store.set(key, {
					...row,
					payload: JSON.stringify({
						v: CLUSTER_INDEX_FORMAT_VERSION,
						clusters: [{}],
						text: {},
						arrows: {},
					}),
				})
			}
		}
		expect(await readPageClusters({ env }, BOARD, page, SNAPSHOT_VERSION)).toBeNull()
	})
})
