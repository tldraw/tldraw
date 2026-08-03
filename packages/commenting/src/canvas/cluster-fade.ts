import { useEffect, useRef, useState } from 'react'
import type { ClusterNode } from '../clustering/types'

const CLUSTER_FADE_MS = 150

export type ClusterFadePhase = 'entering' | 'present' | 'exiting'

export interface ClusterFadeNode {
	node: ClusterNode
	phase: ClusterFadePhase
}

/**
 * Cross-fades the visible cluster nodes as the partition changes: a node that appears starts
 * `entering` and flips to `present` on the next frame, and one that leaves is kept as `exiting`
 * until the CSS transition has run. `resetKey` is compared by identity — a new cluster model
 * replaces the whole world, so its nodes snap to `present` instead of animating.
 */
export function useFadeVisibleNodes(
	nodes: readonly ClusterNode[],
	resetKey: object
): ClusterFadeNode[] {
	const resetKeyRef = useRef(resetKey)
	const didReset = resetKeyRef.current !== resetKey
	if (didReset) {
		resetKeyRef.current = resetKey
	}

	const [fadeNodes, setFadeNodes] = useState<ClusterFadeNode[]>(() => toPresentFadeNodes(nodes))
	const renderedNodes = didReset ? toPresentFadeNodes(nodes) : fadeNodes

	useEffect(() => {
		setFadeNodes(toPresentFadeNodes(nodes))
		// Resets only on a new model (resetKey); node-list changes within the same model are
		// handled by the reconcile effect below, which fades entries in/out instead of snapping.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [resetKey])

	useEffect(() => {
		if (didReset) return
		setFadeNodes((previous) => reconcileFadeNodes(previous, nodes))
	}, [didReset, nodes])

	const hasEntering = renderedNodes.some((item) => item.phase === 'entering')
	useEffect(() => {
		if (!hasEntering) return
		const frame = requestAnimationFrame(() => {
			setFadeNodes((previous) =>
				previous.map((item) => (item.phase === 'entering' ? { ...item, phase: 'present' } : item))
			)
		})
		return () => cancelAnimationFrame(frame)
	}, [hasEntering, renderedNodes])

	const hasExiting = renderedNodes.some((item) => item.phase === 'exiting')
	useEffect(() => {
		if (!hasExiting) return
		const timeout = window.setTimeout(() => {
			setFadeNodes((previous) => previous.filter((item) => item.phase !== 'exiting'))
		}, CLUSTER_FADE_MS)
		return () => window.clearTimeout(timeout)
	}, [hasExiting, renderedNodes])

	return renderedNodes
}

function toPresentFadeNodes(nodes: readonly ClusterNode[]): ClusterFadeNode[] {
	return nodes.map((node) => ({ node, phase: 'present' }))
}

function reconcileFadeNodes(
	previous: readonly ClusterFadeNode[],
	nextNodes: readonly ClusterNode[]
): ClusterFadeNode[] {
	const previousById = new Map(previous.map((item) => [item.node.id, item]))
	const nextIds = new Set(nextNodes.map((node) => node.id))
	const next: ClusterFadeNode[] = []

	for (const node of nextNodes) {
		const previousItem = previousById.get(node.id)
		next.push({
			node,
			phase:
				previousItem && previousItem.phase !== 'exiting'
					? previousItem.phase
					: previousItem
						? 'present'
						: 'entering',
		})
	}

	for (const item of previous) {
		if (nextIds.has(item.node.id)) continue
		next.push(item.phase === 'exiting' ? item : { ...item, phase: 'exiting' })
	}

	return next
}

export function clusterFadeClassName(phase: ClusterFadePhase): string {
	return `tlui-cmt-cluster-fade tlui-cmt-cluster-fade--${phase}`
}
