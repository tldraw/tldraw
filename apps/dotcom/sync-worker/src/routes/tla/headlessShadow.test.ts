import { McpClusterSummary, McpPageRead } from '@tldraw/dotcom-shared'
import { BoxModel } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { diffClusterReads } from './headlessShadow'

function cluster(id: string, numberOfShapes: number, bounds: BoxModel | null): McpClusterSummary {
	return { id, label: id, keywords: [], numberOfShapes, bounds }
}

function read(clusters: McpClusterSummary[]): McpPageRead {
	return {
		pageId: 'page:1',
		pageName: 'Page 1',
		clusters,
		details: [],
		ancestors: [],
		bindings: [],
		arrows: {},
		dimensions: {},
	}
}

const BOX_A: BoxModel = { x: 0, y: 0, w: 100, h: 100 }
const BOX_B: BoxModel = { x: 10, y: 20, w: 50, h: 50 }

describe('diffClusterReads', () => {
	it('reports full agreement when both reads cluster identically', () => {
		const clusters = [cluster('cluster:a', 3, BOX_A), cluster('cluster:b', 2, BOX_B)]
		expect(diffClusterReads(read(clusters), read(clusters))).toEqual({
			tabClusters: 2,
			headlessClusters: 2,
			matchedClusters: 2,
			onlyTabClusters: 0,
			onlyHeadlessClusters: 0,
			pageShapes: 5,
			maxBoundsDelta: 0,
			meanBoundsDelta: 0,
		})
	})

	it('counts clusters each side produced that the other did not', () => {
		// The cluster id hashes its sorted member ids, so a different id means the two paths grouped
		// different shapes together.
		const tab = read([cluster('cluster:a', 3, BOX_A), cluster('cluster:tab-only', 1, BOX_B)])
		const headless = read([cluster('cluster:a', 3, BOX_A), cluster('cluster:hl-only', 4, BOX_B)])
		expect(diffClusterReads(tab, headless)).toEqual({
			tabClusters: 2,
			headlessClusters: 2,
			matchedClusters: 1,
			onlyTabClusters: 1,
			onlyHeadlessClusters: 1,
			pageShapes: 4,
			maxBoundsDelta: 0,
			meanBoundsDelta: 0,
		})
	})

	it('measures the largest and mean bounds gap over matched clusters', () => {
		const tab = read([
			cluster('cluster:a', 1, { x: 0, y: 0, w: 100, h: 100 }),
			cluster('cluster:b', 1, { x: 0, y: 0, w: 50, h: 50 }),
		])
		const headless = read([
			// w differs by 10, the widest single gap.
			cluster('cluster:a', 1, { x: 0, y: 0, w: 100, h: 110 }),
			// x differs by 2.
			cluster('cluster:b', 1, { x: 2, y: 0, w: 50, h: 50 }),
		])
		const diff = diffClusterReads(tab, headless)
		expect(diff.maxBoundsDelta).toBe(10)
		expect(diff.meanBoundsDelta).toBe(6)
		expect(diff.matchedClusters).toBe(2)
	})

	it('skips matched clusters that either side could not measure', () => {
		const tab = read([cluster('cluster:a', 1, null), cluster('cluster:b', 1, BOX_A)])
		const headless = read([cluster('cluster:a', 1, BOX_B), cluster('cluster:b', 1, BOX_A)])
		const diff = diffClusterReads(tab, headless)
		// cluster:a has a null side so it is left out of the deltas; cluster:b agrees exactly.
		expect(diff.matchedClusters).toBe(2)
		expect(diff.maxBoundsDelta).toBe(0)
		expect(diff.meanBoundsDelta).toBe(0)
	})
})
