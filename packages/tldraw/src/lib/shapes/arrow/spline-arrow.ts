import {
	Editor,
	IndexKey,
	TLArrowShape,
	TLHandle,
	TLShapePartial,
	Vec,
	getIndexAbove,
	getIndexBelow,
	getIndexBetween,
	sortByIndex,
} from '@tldraw/editor'
import { PathBuilder, PathBuilderGeometry2d } from '../shared/PathBuilder'
import { TLSplineArrowInfo } from './arrow-types'
import { updateArrowTargetState } from './arrowTargetState'
import {
	TLArrowBindings,
	createOrUpdateArrowBinding,
	getArrowTerminalInArrowSpace,
	getArrowTerminalsInArrowSpace,
} from './shared'
import { getStraightArrowInfo } from './straight-arrow'

export function getSplineArrowPoints(editor: Editor, shape: TLArrowShape) {
	const bindings = editor.getBindingsFromShape(shape, 'arrow')
	const transform = editor.getShapePageTransform(shape)!
	return Object.values(shape.props.points)
		.sort(sortByIndex)
		.map((point) => {
			const binding = bindings.find((binding) => binding.props.pointId === point.id)
			if (!binding) return point
			const position = getArrowTerminalInArrowSpace(editor, transform, binding, true)
			return { ...point, x: position.x, y: position.y }
		})
}

export function getSplineArrowInfo(
	editor: Editor,
	shape: TLArrowShape,
	bindings: TLArrowBindings,
	strokeWidth: number
): TLSplineArrowInfo {
	const { start, end } = getArrowTerminalsInArrowSpace(editor, shape, bindings)
	const anchors = getSplineArrowPoints(editor, shape).map(Vec.From)
	const startInfo = getStraightArrowInfo(
		editor,
		{ ...shape, props: { ...shape.props, end: anchors[0] } },
		{ start: bindings.start, end: undefined },
		strokeWidth
	)
	const endInfo = getStraightArrowInfo(
		editor,
		{ ...shape, props: { ...shape.props, start: anchors[anchors.length - 1] } },
		{ start: undefined, end: bindings.end },
		strokeWidth
	)
	const points = [Vec.From(startInfo.start.point), ...anchors, Vec.From(endInfo.end.point)]
	// Use the line shape's interpolation so editing an anchor has the same effect in both tools.
	const path =
		shape.props.kind === 'arc'
			? PathBuilder.cubicSplineThroughPoints(points, { endOffsets: 0 })
			: PathBuilder.lineThroughPoints(
					points.flatMap((point, i) =>
						i === 0 ? [point] : [new Vec(point.x, points[i - 1].y), point]
					),
					{ endOffsets: 0 }
				)
	return {
		type: 'spline',
		bindings,
		path,
		isValid: true,
		start: { handle: start, point: points[0], arrowhead: shape.props.arrowheadStart },
		end: { handle: end, point: points[points.length - 1], arrowhead: shape.props.arrowheadEnd },
	}
}

export function getSplineArrowHandles(
	editor: Editor,
	shape: TLArrowShape,
	info: TLSplineArrowInfo
): TLHandle[] {
	const points = getSplineArrowPoints(editor, shape)
	const vertices = [
		{ id: 'start', index: getIndexBelow(points[0].index), ...info.start.handle },
		...points,
		{ id: 'end', index: getIndexAbove(points[points.length - 1].index), ...info.end.handle },
	]
	const handles: TLHandle[] = vertices.map((point) => ({ ...point, type: 'vertex', canSnap: true }))
	const segments = (info.path.toGeometry() as PathBuilderGeometry2d).getSegments()
	for (let i = 0; i < vertices.length - 1; i++) {
		const index = getIndexBetween(vertices[i].index, vertices[i + 1].index)
		const point =
			shape.props.kind === 'arc'
				? segments[i].interpolateAlongEdge(0.5)
				: segments[i * 2].interpolateAlongEdge(0.5)
		handles.push({ id: index, index, type: 'create', canSnap: true, ...point.toJson() })
	}
	return handles
}

export function appendSplineArrowPoint(editor: Editor, shape: TLArrowShape) {
	const bindings = editor.getBindingsFromShape(shape, 'arrow')
	const endBinding = bindings.find(
		(binding) => !binding.props.pointId && binding.props.terminal === 'end'
	)
	const end = endBinding
		? getArrowTerminalInArrowSpace(editor, editor.getShapePageTransform(shape)!, endBinding, true)
		: Vec.From(shape.props.end)
	const points = Object.values(shape.props.points).sort(sortByIndex)
	const index = getIndexAbove(points.at(-1)?.index ?? ('a1' as IndexKey))
	editor.updateShape<TLArrowShape>({
		id: shape.id,
		type: 'arrow',
		props: {
			points: { ...shape.props.points, [index]: { id: index, index, x: end.x, y: end.y } },
			end: end.toJson(),
		},
	})
	if (endBinding)
		editor.updateBinding({
			...endBinding,
			props: { ...endBinding.props, pointId: index, isExact: true, isPrecise: true },
		})
}

export function dragSplineArrowPoint(
	editor: Editor,
	shape: TLArrowShape,
	handle: TLHandle
): TLShapePartial<TLArrowShape> {
	const binding = editor
		.getBindingsFromShape(shape, 'arrow')
		.find((binding) => binding.props.pointId === handle.id)
	const target = updateArrowTargetState({
		editor,
		arrow: shape,
		pointInPageSpace: editor.getShapePageTransform(shape)!.applyToPoint(handle),
		isPrecise: true,
		currentBinding: binding,
		oppositeBinding: undefined,
	})
	if (target) {
		createOrUpdateArrowBinding(editor, shape, target.target, {
			pointId: handle.id,
			terminal: 'end',
			normalizedAnchor: target.normalizedAnchor,
			isPrecise: true,
			isExact: true,
			snap: 'none',
		})
	} else if (binding) editor.deleteBindings([binding])
	return {
		id: shape.id,
		type: 'arrow' as const,
		props: {
			points: {
				...shape.props.points,
				[handle.id]: { id: handle.id, index: handle.index, x: handle.x, y: handle.y },
			},
		},
	}
}
