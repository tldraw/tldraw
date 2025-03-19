import { Box, Editor, Mat, Vec, VecLike } from '@tldraw/editor'
import { Computed, computed } from '@tldraw/state'
import { ArrowShapeKindStyle, ElbowArrowSide, TLArrowShape } from '@tldraw/tlschema'
import { WeakCache, exhaustiveSwitchError, mapObjectMapValues, objectMapKeys } from '@tldraw/utils'
import { DraggingHandle } from '../../tools/SelectTool/childStates/DraggingHandle'
import { PointingHandle } from '../../tools/SelectTool/childStates/PointingHandle'
import { ArrowShapeUtil } from './ArrowShapeUtil'
import { ElbowArrowSideDeltas } from './elbow/definitions'
import { getArrowBindings } from './shared'

const targetFilterFallback = { type: 'arrow' }

function computeArrowTargetInfo(editor: Editor) {
	const pointInPageSpace = editor.inputs.currentPagePoint
	const util = editor.getShapeUtil<ArrowShapeUtil>('arrow')
	const onlySelectedShape = editor.getOnlySelectedShape()
	const arrow =
		onlySelectedShape && editor.isShapeOfType<TLArrowShape>(onlySelectedShape, 'arrow')
			? onlySelectedShape
			: null
	const arrowKind = arrow ? arrow.props.kind : editor.getStyleForNextShape(ArrowShapeKindStyle)

	const { currentBinding, otherBinding } = getCurrentBindings(editor) ?? {}

	const isPrecise = getIsPrecise(editor)

	const target = editor.getShapeAtPoint(pointInPageSpace, {
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

	if (!target) return null

	const targetGeometry = editor.getShapeGeometry(target)
	const targetBounds = Box.ZeroFix(targetGeometry.bounds)
	const targetCenterInTargetSpace = targetGeometry.center
	const arrowTransform = arrow ? editor.getShapePageTransform(arrow.id) : Mat.Identity()
	const targetTransform = editor.getShapePageTransform(target)
	const targetToArrowTransform = arrowTransform.clone().invert().multiply(targetTransform)
	const targetToArrowRotation = targetToArrowTransform.rotation()
	const pointInTargetSpace = editor.getPointInShapeSpace(target, pointInPageSpace)

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

	const zoomLevel = editor.getZoomLevel()
	const minDistScaled2 = (util.options.minHandleDistance / zoomLevel) ** 2

	const targetCenterInPageSpace = targetTransform.applyToPoint(targetCenterInTargetSpace)
	for (const side of objectMapKeys(handlePointsInPageSpace)) {
		const point = handlePointsInPageSpace[side]
		if (!point) continue
		const dist2 = Vec.Dist2(point, targetCenterInPageSpace)
		if (dist2 < minDistScaled2) {
			handlePointsInPageSpace[side] = null
		}
	}

	let precise = isPrecise

	if (!precise) {
		// If we're switching to a new bound shape, then precise only if moving slowly
		if (!currentBinding || (currentBinding && target.id !== currentBinding.toId)) {
			precise = editor.inputs.pointerVelocity.len() < 0.5
		}
	}

	if (!isPrecise) {
		if (!targetGeometry.isClosed) {
			precise = true
		}

		// Double check that we're not going to be doing an imprecise snap on
		// the same shape twice, as this would result in a zero length line
		if (otherBinding && target.id === otherBinding.toId && otherBinding.props.isPrecise) {
			precise = true
		}
	}

	const normalizedAnchor = {
		x: (pointInTargetSpace.x - targetBounds.minX) / targetBounds.width,
		y: (pointInTargetSpace.y - targetBounds.minY) / targetBounds.height,
	}

	let closestSide: ElbowArrowSide | null = null

	// Turn off precision if we're within a certain distance to the center of the shape.
	// Funky math but we want the snap distance to be 4 at the minimum and either
	// 16 or 15% of the smaller dimension of the target shape, whichever is smaller
	const snapDistance =
		Math.max(4, Math.min(Math.min(targetBounds.width, targetBounds.height) * 0.15, 16)) /
		editor.getZoomLevel()
	if (precise) {
		switch (arrowKind) {
			// for bendy arrows, just snap to the center
			case 'bendy':
				if (Vec.Dist(pointInTargetSpace, targetBounds.center) < snapDistance) {
					normalizedAnchor.x = 0.5
					normalizedAnchor.y = 0.5
				}
				break
			// for elbow arrows, snap on each axis independently, but rotate the axis to match that of the arrow:
			case 'elbow':
				if (Vec.Dist(pointInTargetSpace, targetBounds.center) < snapDistance) {
					normalizedAnchor.x = 0.5
					normalizedAnchor.y = 0.5
				} else if (Math.abs(targetCenterInPageSpace.x - pointInPageSpace.x) < snapDistance) {
					const snappedPointInPageSpace = {
						x: targetCenterInPageSpace.x,
						y: pointInPageSpace.y,
					}
					const snappedPointInTargetSpace = editor.getPointInShapeSpace(
						target,
						snappedPointInPageSpace
					)
					normalizedAnchor.x =
						(snappedPointInTargetSpace.x - targetBounds.minX) / targetBounds.width
					normalizedAnchor.y =
						(snappedPointInTargetSpace.y - targetBounds.minY) / targetBounds.height

					closestSide = targetCenterInPageSpace.y > pointInPageSpace.y ? 'top' : 'bottom'
				} else if (Math.abs(targetCenterInPageSpace.y - pointInPageSpace.y) < snapDistance) {
					const snappedPointInPageSpace = {
						x: pointInPageSpace.x,
						y: targetCenterInPageSpace.y,
					}
					const snappedPointInTargetSpace = editor.getPointInShapeSpace(
						target,
						snappedPointInPageSpace
					)
					normalizedAnchor.x =
						(snappedPointInTargetSpace.x - targetBounds.minX) / targetBounds.width
					normalizedAnchor.y =
						(snappedPointInTargetSpace.y - targetBounds.minY) / targetBounds.height

					closestSide = targetCenterInPageSpace.x > pointInPageSpace.x ? 'left' : 'right'
				}
				break
			default:
				exhaustiveSwitchError(arrowKind)
		}
	} else if (arrowKind === 'elbow') {
		normalizedAnchor.x = 0.5
		normalizedAnchor.y = 0.5
		if (Vec.Dist(pointInTargetSpace, targetBounds.center) < snapDistance) {
			closestSide = null
		} else {
			if (Math.abs(normalizedAnchor.x - 0.5) < Math.abs(normalizedAnchor.y - 0.5)) {
				closestSide = normalizedAnchor.x < 0.5 ? 'left' : 'right'
			} else {
				closestSide = normalizedAnchor.y < 0.5 ? 'top' : 'bottom'
			}
		}
	}

	// const possibleHandles: [ElbowArrowSide | null, VecLike | null][] =
	// 	objectMapEntries(handlePointsInPageSpace)
	// possibleHandles.push([null, targetCenterInPageSpace])

	// let closestHandle: [ElbowArrowSide | null, VecLike | null] | null = null
	// let closestDistance = Infinity

	// for (const [side, point] of possibleHandles) {
	// 	if (!point) continue
	// 	const distance = Vec.Dist2(point, pointInPageSpace)
	// 	if (distance < closestDistance) {
	// 		closestDistance = distance
	// 		closestHandle = [side, point]
	// 	}
	// }

	// assert(closestHandle)

	return {
		target,
		arrowKind,
		handlePointsInPageSpace,
		centerInPageSpace: targetCenterInPageSpace,
		// closestHandle: {
		// 	side: closestSide[0],
		// 	point: closestSide[1],
		// },
		closestSide,
		normalizedAnchor,
		precise,
	}
}

function getCurrentBindings(editor: Editor) {
	if (editor.isInAny('select.pointing_handle', 'select.dragging_handle')) {
		const node = editor.root.getCurrent()!.getCurrent()! as PointingHandle | DraggingHandle
		const handleId = node.info.handle.id
		if (
			editor.isShapeOfType<TLArrowShape>(node.info.shape, 'arrow') &&
			(handleId === 'start' || handleId === 'end')
		) {
			const bindings = getArrowBindings(editor, node.info.shape)
			const currentBinding = bindings[handleId]
			const otherBinding = handleId === 'start' ? bindings.end : bindings.start
			return { currentBinding, otherBinding }
		}
	}

	return null
}

function getIsPrecise(editor: Editor) {
	if (editor.isIn('select.dragging_handle')) {
		const node: DraggingHandle = editor.getStateDescendant('select.dragging_handle')!
		return node.isPrecise
	}

	if (editor.isIn('select.pointing_handle')) {
		const node: PointingHandle = editor.getStateDescendant('select.pointing_handle')!
		const handleId = node.info.handle.id
		if (
			editor.isShapeOfType<TLArrowShape>(node.info.shape, 'arrow') &&
			(handleId === 'start' || handleId === 'end')
		) {
			const binding = getArrowBindings(editor, node.info.shape)[handleId]
			return binding?.props.isPrecise ?? false
		}
	}

	return false
}

const arrowTargetInfoCache = new WeakCache<
	Editor,
	Computed<ReturnType<typeof computeArrowTargetInfo> | null>
>()
export function getArrowTargetInfo(editor: Editor) {
	return arrowTargetInfoCache
		.get(editor, (editor) => computed('arrow target info', () => computeArrowTargetInfo(editor)))
		.get()
}
