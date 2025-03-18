import { ArrowShapeKindStyle, ElbowArrowSide, TLArrowShape, TLShape } from '@tldraw/tlschema'
import { mapObjectMapValues, objectMapEntries } from '@tldraw/utils'
import { Editor } from '../editor/Editor'
import { Mat } from '../primitives/Mat'
import { Vec, VecLike } from '../primitives/Vec'
import { ElbowArrowSideDeltas } from './definitions'

const targetFilterFallback = { type: 'arrow' }
export function findArrowTarget(
	editor: Editor,
	arrow: TLArrowShape | null,
	point: VecLike = editor.inputs.currentPagePoint
) {
	const arrowKind = arrow ? arrow.props.kind : editor.getStyleForNextShape(ArrowShapeKindStyle)

	return editor.getShapeAtPoint(point, {
		hitInside: true,
		hitFrameInside: true,
		margin: arrowKind === 'elbow' ? 8 : 0,
		filter: (targetShape) => {
			return (
				!targetShape.isLocked &&
				editor.canBindShapes({
					fromShape: arrow ?? targetFilterFallback,
					toShape: targetShape,
					binding: 'arrow',
				})
			)
		},
	})
}

export function getElbowArrowTargetHandlesInPageSpace(
	editor: Editor,
	arrow: TLArrowShape | null,
	target: TLShape
) {
	const targetGeometry = editor.getShapeGeometry(target)
	const targetCenterInTargetSpace = targetGeometry.center
	const arrowTransform = arrow ? editor.getShapePageTransform(arrow.id) : Mat.Identity()
	const targetTransform = editor.getShapePageTransform(target)
	const targetToArrowTransform = arrowTransform.clone().invert().multiply(targetTransform)
	const targetToArrowRotation = targetToArrowTransform.rotation()

	const castDistance = Math.max(targetGeometry.bounds.width, targetGeometry.bounds.height)

	const handlePointsInPageSpace = mapObjectMapValues(ElbowArrowSideDeltas, (_, delta) => {
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

	return {
		handlePointsInPageSpace,
		targetCenterInPageSpace: targetTransform.applyToPoint(targetCenterInTargetSpace),
	}
}

export function findArrowTargetInfoAtPoint(
	editor: Editor,
	arrow: TLArrowShape | null,
	pointInPageSpace = editor.inputs.currentPagePoint
) {
	// const arrowKind = arrow ? arrow.props.kind : editor.getStyleForNextShape(ArrowShapeKindStyle)

	const target = findArrowTarget(editor, arrow, pointInPageSpace)
	if (!target) return null

	const { handlePointsInPageSpace, targetCenterInPageSpace } =
		getElbowArrowTargetHandlesInPageSpace(editor, arrow, target)
	// TODO: deal with too-close-together handles

	const possibleHandles: [ElbowArrowSide | null, VecLike | null][] =
		objectMapEntries(handlePointsInPageSpace)
	possibleHandles.push([null, targetCenterInPageSpace])

	let closestHandle: [ElbowArrowSide | null, VecLike | null] | null = null
	let closestDistance = Infinity

	for (const [side, point] of possibleHandles) {
		if (!point) continue
		const distance = Vec.Dist2(point, pointInPageSpace)
		if (distance < closestDistance) {
			closestDistance = distance
			closestHandle = [side, point]
		}
	}

	return {
		target,
		handlePointsInArrowSpace: handlePointsInPageSpace,
		closestHandle: closestHandle
			? {
					side: closestHandle[0],
					point: closestHandle[1],
				}
			: null,
	}
}
