import { useMemo } from 'react'
import { TLShapeId, track, useEditor, useValue } from 'tldraw'
import { getIdeaNodes } from './graph'
import { IdeaNode } from './types'

/**
 * Returns a tier key based on the node's depth and arity (parent count).
 * - depth 0 → 'atom' (no border)
 * - depth 1, 2 parents → 'l1'
 * - depth 1, 3 parents → 'l1-triple'
 * - depth 1, 4+ parents → 'l1-quad'
 * - depth 2, 2 parents → 'l2'
 * - depth 2, 3+ parents → 'l2-multi'
 * - depth 3+ → 'l3+'
 */
function getTier(node: IdeaNode): string {
	if (node.depth === 0) return 'atom'
	if (node.depth === 1) {
		if (node.parents.length >= 4) return 'l1-quad'
		if (node.parents.length >= 3) return 'l1-triple'
		return 'l1'
	}
	if (node.depth === 2) {
		if (node.parents.length >= 3) return 'l2-multi'
		return 'l2'
	}
	return 'l3+'
}

const TIER_COLORS: Record<string, string> = {
	l1: 'rgba(59, 130, 246, 0.35)', // blue
	'l1-triple': 'rgba(147, 51, 234, 0.35)', // purple
	'l1-quad': 'rgba(236, 72, 153, 0.35)', // pink
	l2: 'rgba(16, 185, 129, 0.35)', // emerald
	'l2-multi': 'rgba(20, 184, 166, 0.35)', // teal
	'l3+': 'rgba(245, 158, 11, 0.35)', // amber
}

const BORDER_WIDTH = 2
const BORDER_RADIUS = 6
const PADDING = 6

interface ShapeBorderInfo {
	id: TLShapeId
	tier: string
	color: string
	x: number
	y: number
	w: number
	h: number
}

export const TierBordersOverlay = track(function TierBordersOverlay() {
	const editor = useEditor()

	const ideaNodes = useValue('ideaNodes', () => getIdeaNodes(editor), [editor])

	const borders = useMemo(() => {
		const result: ShapeBorderInfo[] = []
		for (const node of ideaNodes) {
			const tier = getTier(node)
			if (tier === 'atom') continue
			const color = TIER_COLORS[tier]
			if (!color) continue
			const bounds = editor.getShapePageBounds(node.id)
			if (!bounds) continue
			result.push({
				id: node.id,
				tier,
				color,
				x: bounds.x - PADDING,
				y: bounds.y - PADDING,
				w: bounds.w + PADDING * 2,
				h: bounds.h + PADDING * 2,
			})
		}
		return result
	}, [ideaNodes, editor])

	if (borders.length === 0) return null

	return (
		<>
			{borders.map((b) => (
				<div
					key={b.id}
					style={{
						position: 'absolute',
						left: b.x,
						top: b.y,
						width: b.w,
						height: b.h,
						border: `${BORDER_WIDTH}px solid ${b.color}`,
						borderRadius: BORDER_RADIUS,
						pointerEvents: 'none',
					}}
				/>
			))}
		</>
	)
})
