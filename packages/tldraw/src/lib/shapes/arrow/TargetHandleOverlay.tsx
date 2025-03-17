import {
	ArrowShapeKindStyle,
	mapObjectMapValues,
	Mat,
	objectMapEntries,
	TLArrowShape,
	track,
	useEditor,
	useEditorComponents,
	useValue,
	Vec,
	VecLike,
} from '@tldraw/editor'
import { ArrowShapeUtil, findArrowTarget } from './ArrowShapeUtil'
import { ElbowArrowSideDeltas } from './elbow/definitions'

const targetFilterFallback = { type: 'arrow' }

export const TargetHandleOverlay = track(function TargetHandleOverlay({
	arrow,
}: {
	arrow: TLArrowShape | null
}) {
	const editor = useEditor()
	const arrowUtil = editor.getShapeUtil<ArrowShapeUtil>('arrow')
	const { ConnectionHandle } = arrowUtil.options
	const { ShapeIndicator } = useEditorComponents()

	const arrowKind = arrow ? arrow.props.kind : editor.getStyleForNextShape(ArrowShapeKindStyle)
	const showOutline =
		arrowKind === 'elbow' || editor.isInAny('select.pointing_handle', 'select.dragging_handle')
	const showHandles = arrowKind === 'elbow'

	console.log('showOutline', showOutline, arrow, ShapeIndicator)

	const target = useValue(
		'target',
		() => findArrowTarget(editor, arrow, editor.inputs.currentPagePoint),
		[editor, arrow]
	)

	const hoverHandles = useValue(
		'hover handles',
		() => {
			if (!showHandles) return null
			if (!target) return null

			const targetGeometry = editor.getShapeGeometry(target)
			const targetCenterInTargetSpace = targetGeometry.center
			const arrowTransform = arrow ? editor.getShapePageTransform(arrow.id) : Mat.Identity()
			const targetTransform = editor.getShapePageTransform(target)
			const targetToArrowTransform = arrowTransform.clone().invert().multiply(targetTransform)
			const targetToArrowRotation = targetToArrowTransform.rotation()

			const castDistance = Math.max(targetGeometry.bounds.width, targetGeometry.bounds.height)

			return mapObjectMapValues(ElbowArrowSideDeltas, (_, delta) => {
				const castPoint = Vec.Mul(delta, castDistance)
					.rot(-targetToArrowRotation)
					.add(targetCenterInTargetSpace)

				let handlePointInTargetSpace: VecLike | null = null
				let furthestDistance = 0

				for (const intersection of targetGeometry.intersectLineSegment(
					targetCenterInTargetSpace,
					castPoint
				)) {
					const distance = Vec.Dist2(intersection, targetCenterInTargetSpace)
					if (distance > furthestDistance) {
						furthestDistance = distance
						handlePointInTargetSpace = intersection
					}
				}

				const handlePointInPageSpace = handlePointInTargetSpace
					? targetTransform.applyToPoint(handlePointInTargetSpace)
					: null

				return handlePointInPageSpace
			})
		},
		[editor, arrow, target]
	)

	return (
		<>
			{showOutline && ShapeIndicator && arrow && (
				<ShapeIndicator className="tl-user-indicator__hint" shapeId={arrow?.id} />
			)}
			{hoverHandles &&
				objectMapEntries(hoverHandles).map(([side, point]) => {
					if (!point) return null

					return <ConnectionHandle key={side} x={point.x} y={point.y} />
				})}
		</>
	)
})
