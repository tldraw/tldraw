import { mstEdges } from './mst'
import { cappedReplay } from './replay'
import { contract, finalize } from './schedule'
import type { ClusterNode, ClusterOptions, ClusterTable, LeafInput } from './types'

interface ResolvedClusterOptions {
	Tc: number
	Tu: number
	eps: number
	Dmax: number
	minZoom: number
	maxZoom: number
	maxSplitZoom: number
}

export function computeClusterTable(
	leaves: readonly LeafInput[],
	options: ClusterOptions
): ClusterTable {
	const opts = resolveOptions(options)
	const leafNodes = leaves.map(leafToNode)
	const edges = mstEdges(leaves)

	if (leaves.length < 2) {
		return { events: [], leaves: leafNodes }
	}

	const raw = cappedReplay(leaves, edges, { Tc: opts.Tc, Dmax: opts.Dmax })
	const contracted = contract(raw, opts.eps)
	const events = finalize(contracted, {
		Tc: opts.Tc,
		Tu: opts.Tu,
		minZoom: opts.minZoom,
		maxZoom: opts.maxZoom,
		maxSplitZoom: opts.maxSplitZoom,
	})

	return { events, leaves: leafNodes }
}

function resolveOptions(options: ClusterOptions): ResolvedClusterOptions {
	const Tc = options.Tc ?? 40
	const Tu = options.Tu ?? 1.5 * Tc
	const eps = options.eps ?? 0.12
	const Dmax = options.Dmax ?? 3 * Tc
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
