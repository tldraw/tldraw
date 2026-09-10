import { mstEdges } from './mst'
import { cappedReplay } from './replay'
import { contract, finalize } from './schedule'
import type {
	ClusterNode,
	ClusterOptions,
	ClusterTable,
	LeafInput,
	LeafScreenOffsets,
} from './types'

/** @internal */
export function computeClusterTable(
	leaves: readonly LeafInput[],
	options: ClusterOptions,
	// Render offsets for markers that draw off their anchor (imprecise pins), keyed by leaf id.
	// Omitted or empty, the run is identical — output and code paths — to an offset-unaware one.
	screenOffsets?: LeafScreenOffsets
): ClusterTable {
	const opts = resolveOptions(options)
	const leafNodes = leaves.map(leafToNode)
	const edges = mstEdges(leaves)

	if (leaves.length < 2) {
		return { events: [], leaves: leafNodes }
	}

	const raw = cappedReplay(leaves, edges, opts, screenOffsets)
	const events = finalize(contract(raw, opts.eps), opts)

	return { events, leaves: leafNodes }
}

function resolveOptions(options: ClusterOptions): Required<ClusterOptions> {
	const Tc = options.Tc ?? 22
	const Tu = options.Tu ?? 1.2 * Tc
	const eps = options.eps ?? 0.7
	const Dmax = options.Dmax ?? 3.75 * Tc
	const maxSplitZoom = options.maxSplitZoom ?? 6
	const { minZoom, maxZoom } = options

	if (!Number.isFinite(Tc) || Tc <= 0) {
		throw new Error('Tc must be finite and greater than 0')
	}
	if (!Number.isFinite(Tu) || Tu <= Tc) {
		throw new Error('Tu must be finite and greater than Tc')
	}
	if (!Number.isFinite(eps) || eps < 0) {
		throw new Error('eps must be finite and greater than or equal to 0')
	}
	if (!Number.isFinite(Dmax) || Dmax < Tc) {
		throw new Error('Dmax must be finite and greater than or equal to Tc')
	}
	if (!Number.isFinite(minZoom) || minZoom <= 0) {
		throw new Error('minZoom must be finite and greater than 0')
	}
	if (!Number.isFinite(maxZoom) || maxZoom <= minZoom) {
		throw new Error('maxZoom must be finite and greater than minZoom')
	}
	if (!Number.isFinite(maxSplitZoom) || maxSplitZoom <= 0) {
		throw new Error('maxSplitZoom must be finite and greater than 0')
	}

	return { Tc, Tu, eps, Dmax, minZoom, maxZoom, maxSplitZoom }
}

function leafToNode(leaf: LeafInput): ClusterNode {
	return {
		id: leaf.id,
		centroid: { x: leaf.point.x, y: leaf.point.y },
		count: 1,
		members: [leaf.id],
	}
}
