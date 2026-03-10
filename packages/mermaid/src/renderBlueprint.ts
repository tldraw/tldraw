import {
	createShapeId,
	Editor,
	IndexKey,
	TLGeoShape,
	TLLineShape,
	TLShapeId,
	toRichText,
	Vec,
} from 'tldraw'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintGeoNode,
	MermaidBlueprintLineNode,
} from './blueprint'
import { sanitizeDiagramText } from './utils'

/** @public */
export function renderBlueprint(editor: Editor, blueprint: DiagramMermaidBlueprint) {
	const { nodes, edges, lines } = blueprint

	const bounds = computeBlueprintBounds(nodes, lines)
	const viewportCenter = editor.getViewportPageBounds().center
	const offsetX = viewportCenter.x - (bounds.maxX + bounds.minX) / 2
	const offsetY = viewportCenter.y - (bounds.maxY + bounds.minY) / 2

	const ordered = orderParentFirst(nodes)
	const nodeById = new Map(nodes.map((node) => [node.id, node]))

	const shapeIds = new Map<string, TLShapeId>()

	// Lines first so nodes render on top (z-order = creation order in tldraw)
	if (lines) {
		for (const line of lines) {
			const lineId = createShapeId()
			shapeIds.set(line.id, lineId)
			editor.createShape<TLLineShape>({
				id: lineId,
				type: 'line',
				x: offsetX + line.x,
				y: offsetY + line.y,
				props: {
					dash: line.dash ?? 'solid',
					size: line.size ?? 's',
					color: line.color ?? 'black',
					spline: 'line',
					points: {
						a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
						a2: { id: 'a2', index: 'a2' as IndexKey, x: 0, y: line.endY },
					},
				},
			})
		}
	}

	for (const node of ordered) {
		const shapeId = createShapeId()
		shapeIds.set(node.id, shapeId)

		const parent = node.parentId ? nodeById.get(node.parentId) : undefined
		const parentShapeId = node.parentId ? shapeIds.get(node.parentId) : undefined

		const absoluteX = offsetX + node.x
		const absoluteY = offsetY + node.y
		const x = parent ? absoluteX - (offsetX + parent.x) : absoluteX
		const y = parent ? absoluteY - (offsetY + parent.y) : absoluteY

		editor.createShape<TLGeoShape>({
			id: shapeId,
			type: 'geo',
			x,
			y,
			parentId: parentShapeId,
			props: {
				geo: node.geo,
				w: node.w,
				h: node.h,
				...(node.fill && { fill: node.fill }),
				...(node.color && { color: node.color }),
				...(node.dash && { dash: node.dash }),
				...(node.size && { size: node.size }),
				...(node.label && { richText: toRichText(sanitizeDiagramText(node.label)) }),
				...(node.align && { align: node.align }),
				...(node.verticalAlign && { verticalAlign: node.verticalAlign }),
			},
		})
	}

	const arrowIds: TLShapeId[] = []
	for (const edge of edges) {
		const arrowId = createArrowFromEdge(editor, edge, shapeIds)
		if (arrowId) arrowIds.push(arrowId)
	}

	// Create sub-groups and track which shape IDs are consumed by a group
	const groupedIds = new Set<TLShapeId>()
	const subGroupIds: TLShapeId[] = []
	if (blueprint.groups) {
		for (const group of blueprint.groups) {
			const members: TLShapeId[] = []
			for (const blueprintId of group) {
				const memberShapeId = shapeIds.get(blueprintId)
				if (memberShapeId) {
					members.push(memberShapeId)
					groupedIds.add(memberShapeId)
				}
			}
			if (members.length > 1) {
				editor.groupShapes(members)
				const first = editor.getShape(members[0])
				if (first && first.parentId !== editor.getCurrentPageId()) {
					subGroupIds.push(first.parentId as TLShapeId)
				} else {
					subGroupIds.push(members[0])
				}
			} else if (members.length === 1) {
				subGroupIds.push(members[0])
			}
		}
	}

	// Collect ungrouped top-level IDs
	const topLevelIds: TLShapeId[] = [...subGroupIds]
	for (const node of nodes) {
		if (!node.parentId) {
			const nodeShapeId = shapeIds.get(node.id)
			if (nodeShapeId && !groupedIds.has(nodeShapeId)) topLevelIds.push(nodeShapeId)
		}
	}
	if (lines) {
		for (const line of lines) {
			const lineShapeId = shapeIds.get(line.id)
			if (lineShapeId && !groupedIds.has(lineShapeId)) topLevelIds.push(lineShapeId)
		}
	}
	topLevelIds.push(...arrowIds)

	if (topLevelIds.length > 1) {
		editor.groupShapes(topLevelIds)
	}
}

function makeArrowBinding(
	arrowId: TLShapeId,
	targetId: TLShapeId,
	terminal: 'start' | 'end',
	anchor: { x: number; y: number },
	isExact: boolean,
	isPrecise: boolean
) {
	return {
		fromId: arrowId,
		toId: targetId,
		type: 'arrow' as const,
		props: { terminal, normalizedAnchor: anchor, isExact, isPrecise },
	}
}

function createArrowFromEdge(
	editor: Editor,
	edge: MermaidBlueprintEdge,
	shapeIds: Map<string, TLShapeId>
): TLShapeId | undefined {
	const startShapeId = shapeIds.get(edge.startNodeId)
	const endShapeId = shapeIds.get(edge.endNodeId)
	if (!startShapeId || !endShapeId) return undefined

	const startBounds = editor.getShapePageBounds(startShapeId)
	const endBounds = editor.getShapePageBounds(endShapeId)
	if (!startBounds || !endBounds) return undefined

	const arrowId = createShapeId()
	const isSelfLoop = startShapeId === endShapeId
	const hasPreciseAnchors = edge.anchorStartY !== undefined || edge.anchorEndY !== undefined

	const baseProps = {
		dash: edge.dash ?? ('solid' as const),
		size: edge.size ?? ('s' as const),
		arrowheadEnd: edge.arrowheadEnd ?? ('arrow' as const),
		...(edge.arrowheadStart && { arrowheadStart: edge.arrowheadStart }),
		...(edge.color && { color: edge.color }),
		...(edge.label && { richText: toRichText(sanitizeDiagramText(edge.label)) }),
	}

	if (hasPreciseAnchors) {
		const startAnchorY = edge.anchorStartY ?? 0.5
		const endAnchorY = edge.anchorEndY ?? 0.5
		const exact = edge.isExact ?? true
		const precise = edge.isPrecise ?? true

		const startPoint = {
			x: startBounds.x + startBounds.w * 0.5,
			y: startBounds.y + startBounds.h * startAnchorY,
		}
		const endPoint = {
			x: endBounds.x + endBounds.w * 0.5,
			y: endBounds.y + endBounds.h * endAnchorY,
		}
		const origin = {
			x: Math.min(startPoint.x, endPoint.x),
			y: Math.min(startPoint.y, endPoint.y),
		}

		editor.run(() => {
			editor.createShape({
				id: arrowId,
				type: 'arrow',
				x: origin.x,
				y: origin.y,
				props: {
					...baseProps,
					start: { x: startPoint.x - origin.x, y: startPoint.y - origin.y },
					end: { x: endPoint.x - origin.x, y: endPoint.y - origin.y },
					bend: edge.bend,
				},
			})
			editor.createBindings([
				makeArrowBinding(
					arrowId,
					startShapeId,
					'start',
					{ x: 0.5, y: startAnchorY },
					exact,
					precise
				),
				makeArrowBinding(arrowId, endShapeId, 'end', { x: 0.5, y: endAnchorY }, exact, precise),
			])
		})
		return arrowId
	}

	if (isSelfLoop) {
		editor.run(() => {
			editor.createShape({
				id: arrowId,
				type: 'arrow',
				x: startBounds.x,
				y: startBounds.y,
				props: {
					...baseProps,
					start: { x: startBounds.w / 2, y: 0 },
					end: { x: startBounds.w, y: startBounds.h / 2 },
					bend: -80,
				},
			})
			editor.createBindings([
				makeArrowBinding(arrowId, startShapeId, 'start', { x: 0.9, y: 0.5 }, false, false),
				makeArrowBinding(arrowId, endShapeId, 'end', { x: 0.85, y: 0.8 }, false, false),
			])
		})
		return arrowId
	}

	const startCenter = startBounds.center
	const endCenter = endBounds.center
	const arrowOrigin = Vec.Min(startCenter, endCenter)

	editor.run(() => {
		editor.createShape({
			id: arrowId,
			type: 'arrow',
			x: arrowOrigin.x,
			y: arrowOrigin.y,
			props: {
				...baseProps,
				start: { x: startCenter.x - arrowOrigin.x, y: startCenter.y - arrowOrigin.y },
				end: { x: endCenter.x - arrowOrigin.x, y: endCenter.y - arrowOrigin.y },
				bend: edge.bend,
			},
		})
		editor.createBindings([
			makeArrowBinding(arrowId, startShapeId, 'start', { x: 0.5, y: 0.5 }, false, false),
			makeArrowBinding(arrowId, endShapeId, 'end', { x: 0.5, y: 0.5 }, false, false),
		])
	})

	return arrowId
}

function computeBlueprintBounds(
	nodes: MermaidBlueprintGeoNode[],
	lines?: MermaidBlueprintLineNode[]
): { minX: number; minY: number; maxX: number; maxY: number } {
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity
	for (const node of nodes) {
		if (node.parentId) continue
		minX = Math.min(minX, node.x)
		minY = Math.min(minY, node.y)
		maxX = Math.max(maxX, node.x + node.w)
		maxY = Math.max(maxY, node.y + node.h)
	}
	if (lines) {
		for (const line of lines) {
			minX = Math.min(minX, line.x)
			minY = Math.min(minY, line.y)
			maxX = Math.max(maxX, line.x)
			maxY = Math.max(maxY, line.y + line.endY)
		}
	}
	return { minX, minY, maxX, maxY }
}

function orderParentFirst(nodes: MermaidBlueprintGeoNode[]): MermaidBlueprintGeoNode[] {
	const byId = new Map(nodes.map((node) => [node.id, node]))
	const visited = new Set<string>()
	const result: MermaidBlueprintGeoNode[] = []

	function visit(id: string) {
		if (visited.has(id)) return
		visited.add(id)
		const node = byId.get(id)
		if (!node) return
		if (node.parentId && !visited.has(node.parentId)) {
			visit(node.parentId)
		}
		result.push(node)
	}

	for (const node of nodes) visit(node.id)
	return result
}
