import { createShapeId, Editor, IndexKey, TLLineShape, TLShapeId, toRichText, Vec } from 'tldraw'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintLineNode,
	MermaidBlueprintNode,
	MermaidNodeRenderMapper,
} from './blueprint'
import { resolveMermaidNodeRender } from './defaultMermaidNodeRenderSpec'
import { defaultCreateMermaidNodeFromBlueprint } from './mermaidNodeCreateShape'
import { orderTopDown, sanitizeDiagramText } from './utils'

/** @public */
export interface BlueprintRenderingOptions {
	centerOnPosition?: boolean
	position?: { x: number; y: number }
	/**
	 * Return a custom {@link MermaidBlueprintNodeRenderSpec} per node, or `undefined` for package defaults.
	 * Called from {@link renderBlueprint} for each node (after layout offsets are known).
	 */
	mapNodeToRenderSpec?: MermaidNodeRenderMapper
}

const defaultBlueprintRenderingOptions = {
	centerOnPosition: true,
}

/** @public */
export function renderBlueprint(
	editor: Editor,
	blueprint: DiagramMermaidBlueprint,
	opts?: BlueprintRenderingOptions
) {
	const options = { ...defaultBlueprintRenderingOptions, ...opts }
	const { nodes, edges, lines, diagramKind } = blueprint
	const mapper = options.mapNodeToRenderSpec

	const bounds = computeBlueprintBounds(nodes, lines)
	const center =
		options.position ??
		(editor.user.getIsPasteAtCursorMode()
			? editor.inputs.getCurrentPagePoint()
			: editor.getViewportPageBounds().center)
	const offsetX = options.centerOnPosition
		? center.x - (bounds.maxX + bounds.minX) / 2
		: center.x - bounds.minX
	const offsetY = options.centerOnPosition
		? center.y - (bounds.maxY + bounds.minY) / 2
		: center.y - bounds.minY

	const ordered = orderTopDown(
		nodes,
		(n) => n.id,
		(n) => n.parentId
	)
	const nodeById = new Map(nodes.map((node) => [node.id, node]))

	const shapeIds = new Map<string, TLShapeId>()

	// Lines first so nodes render on top (z-order = creation order in tldraw)
	for (const line of lines ?? []) {
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
					a2: { id: 'a2', index: 'a2' as IndexKey, x: line.endX ?? 0, y: line.endY },
				},
			},
		})
	}

	for (const node of ordered) {
		const shapeId = createShapeId()
		shapeIds.set(node.id, shapeId)

		const parent = node.parentId ? nodeById.get(node.parentId) : undefined
		const parentShapeId = node.parentId ? shapeIds.get(node.parentId) : undefined

		defaultCreateMermaidNodeFromBlueprint({
			editor,
			node,
			shapeId,
			x: parent ? node.x - parent.x : offsetX + node.x,
			y: parent ? node.y - parent.y : offsetY + node.y,
			parentShapeId,
			diagramKind,
			render: resolveMermaidNodeRender(diagramKind, node, mapper),
		})
	}

	const arrowIds: TLShapeId[] = []
	for (const edge of edges) {
		const arrowId = createArrowFromEdge(editor, edge, shapeIds)
		if (arrowId) arrowIds.push(arrowId)
	}

	// Create sub-groups and track which shape IDs are consumed by a group
	const groupedIds = new Set<TLShapeId>()
	const topLevelIds: TLShapeId[] = []
	for (const group of blueprint.groups ?? []) {
		const members: TLShapeId[] = []
		for (const blueprintId of group) {
			const memberShapeId = shapeIds.get(blueprintId)
			if (memberShapeId) {
				members.push(memberShapeId)
				groupedIds.add(memberShapeId)
			}
		}
		if (members.length > 0) topLevelIds.push(groupShapes(editor, members) ?? members[0])
	}

	// Collect ungrouped top-level IDs
	for (const item of [...nodes.filter((node) => !node.parentId), ...(lines ?? [])]) {
		const itemShapeId = shapeIds.get(item.id)
		if (itemShapeId && !groupedIds.has(itemShapeId)) topLevelIds.push(itemShapeId)
	}
	topLevelIds.push(...arrowIds)

	const rootShapeId = groupShapes(editor, topLevelIds)
	if (rootShapeId) {
		const actualBounds = editor.getShapePageBounds(rootShapeId)
		if (actualBounds) {
			const desiredX = options.centerOnPosition ? center.x - actualBounds.w / 2 : center.x
			const desiredY = options.centerOnPosition ? center.y - actualBounds.h / 2 : center.y
			const dx = desiredX - actualBounds.x
			const dy = desiredY - actualBounds.y
			if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
				const shape = editor.getShape(rootShapeId)!
				editor.updateShape({
					id: rootShapeId,
					type: shape.type,
					x: shape.x + dx,
					y: shape.y + dy,
				})
			}
		}
	}
}

/**
 * Group `ids` and return the group id (or the single id when there is only one).
 * Returns undefined when nothing was grouped, e.g. no ids or grouping failed.
 */
function groupShapes(editor: Editor, ids: TLShapeId[]): TLShapeId | undefined {
	if (ids.length === 0) return undefined
	if (ids.length === 1) return ids[0]
	const groupId = createShapeId()
	editor.groupShapes(ids, { groupId })
	return editor.getShape(groupId) ? groupId : undefined
}

interface ArrowTerminal {
	point: { x: number; y: number }
	anchor: { x: number; y: number }
	isExact: boolean
	isPrecise: boolean
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

	let labelText = edge.label
	if (edge.decoration?.type === 'autonumber') {
		const num = edge.decoration.value
		labelText = labelText ? `${num}  ${labelText}` : num
	}

	const baseProps = {
		dash: edge.dash ?? ('solid' as const),
		size: edge.size ?? ('s' as const),
		arrowheadEnd: edge.arrowheadEnd ?? ('arrow' as const),
		...(edge.arrowheadStart && { arrowheadStart: edge.arrowheadStart }),
		color: edge.color ?? ('black' as const),
		...(labelText && { richText: toRichText(sanitizeDiagramText(labelText)) }),
	}

	let origin: { x: number; y: number }
	let start: ArrowTerminal
	let end: ArrowTerminal
	let bend = edge.bend

	if (edge.anchorStartY !== undefined || edge.anchorEndY !== undefined) {
		const startAnchorY = edge.anchorStartY ?? 0.5
		const endAnchorY = edge.anchorEndY ?? 0.5
		const isExact = edge.isExact ?? true
		const isPrecise = edge.isPrecise ?? true
		start = {
			point: { x: startBounds.midX, y: startBounds.y + startBounds.h * startAnchorY },
			anchor: { x: 0.5, y: startAnchorY },
			isExact,
			isPrecise,
		}
		end = {
			point: { x: endBounds.midX, y: endBounds.y + endBounds.h * endAnchorY },
			anchor: { x: 0.5, y: endAnchorY },
			isExact: edge.isExactEnd ?? isExact,
			isPrecise: edge.isPreciseEnd ?? isPrecise,
		}
		origin = Vec.Min(start.point, end.point)
	} else if (startShapeId === endShapeId) {
		origin = { x: startBounds.x, y: startBounds.y }
		start = {
			point: { x: startBounds.midX, y: startBounds.y },
			anchor: { x: 0.9, y: 0.5 },
			isExact: false,
			isPrecise: false,
		}
		end = {
			point: { x: startBounds.maxX, y: startBounds.midY },
			anchor: { x: 0.85, y: 0.8 },
			isExact: false,
			isPrecise: false,
		}
		bend = -80
	} else {
		start = {
			point: startBounds.center,
			anchor: { x: 0.5, y: 0.5 },
			isExact: false,
			isPrecise: false,
		}
		end = { point: endBounds.center, anchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false }
		origin = Vec.Min(start.point, end.point)
	}

	const arrowId = createShapeId()
	editor.run(() => {
		editor.createShape({
			id: arrowId,
			type: 'arrow',
			x: origin.x,
			y: origin.y,
			props: {
				...baseProps,
				start: { x: start.point.x - origin.x, y: start.point.y - origin.y },
				end: { x: end.point.x - origin.x, y: end.point.y - origin.y },
				bend,
			},
		})
		editor.createBindings([
			makeArrowBinding(arrowId, startShapeId, 'start', start),
			makeArrowBinding(arrowId, endShapeId, 'end', end),
		])
	})
	return arrowId
}

function makeArrowBinding(
	arrowId: TLShapeId,
	targetId: TLShapeId,
	terminal: 'start' | 'end',
	{ anchor, isExact, isPrecise }: ArrowTerminal
) {
	return {
		fromId: arrowId,
		toId: targetId,
		type: 'arrow' as const,
		props: { terminal, normalizedAnchor: anchor, isExact, isPrecise },
	}
}

function computeBlueprintBounds(
	nodes: MermaidBlueprintNode[],
	lines?: MermaidBlueprintLineNode[]
): { minX: number; minY: number; maxX: number; maxY: number } {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const node of nodes) {
		if (node.parentId) continue
		minX = Math.min(minX, node.x)
		minY = Math.min(minY, node.y)
		maxX = Math.max(maxX, node.x + node.w)
		maxY = Math.max(maxY, node.y + node.h)
	}
	for (const line of lines ?? []) {
		minX = Math.min(minX, line.x)
		minY = Math.min(minY, line.y)
		maxX = Math.max(maxX, line.x)
		maxY = Math.max(maxY, line.y + line.endY)
	}
	return { minX, minY, maxX, maxY }
}
