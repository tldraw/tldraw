import { atom, Atom, Box, clamp, Editor, elbowArrowDebug, Mat, Vec, VecLike } from '@tldraw/editor'
import {
	ArrowShapeKindStyle,
	ElbowArrowSide,
	TLArrowBinding,
	TLArrowShape,
	TLArrowShapeKind,
	TLShape,
} from '@tldraw/tlschema'
import {
	invLerp,
	mapObjectMapValues,
	objectMapEntries,
	objectMapKeys,
	WeakCache,
} from '@tldraw/utils'
import { ArrowShapeUtil } from './ArrowShapeUtil'
import { ElbowArrowAxes, ElbowArrowSideAxes, ElbowArrowSideDeltas } from './elbow/definitions'

export interface UpdateArrowTargetStateOpts {
	editor: Editor
	pointInPageSpace: VecLike
	arrow: TLArrowShape | undefined
	isPrecise: boolean
	isExact: boolean
	currentBinding: TLArrowBinding | undefined
	otherBinding: TLArrowBinding | undefined
	terminal: 'start' | 'end'
	isCreatingShape: boolean
}

export interface ArrowTargetState {
	target: TLShape
	arrowKind: TLArrowShapeKind

	handlesInPageSpace: {
		top: { point: VecLike; isEnabled: boolean }
		bottom: { point: VecLike; isEnabled: boolean }
		left: { point: VecLike; isEnabled: boolean }
		right: { point: VecLike; isEnabled: boolean }
	}

	isExact: boolean
	isPrecise: boolean

	centerInPageSpace: VecLike
	anchorInPageSpace: VecLike
	snap: 'center' | 'point' | 'axis' | 'edge' | 'none'
	normalizedAnchor: VecLike
}

const arrowTargetStore = new WeakCache<Editor, Atom<ArrowTargetState | null>>()

function getArrowTargetAtom(editor: Editor) {
	return arrowTargetStore.get(editor, () => atom('arrowTarget', null))
}

export function getArrowTargetState(editor: Editor) {
	return getArrowTargetAtom(editor).get()
}

export function clearArrowTargetState(editor: Editor) {
	getArrowTargetAtom(editor).set(null)
}

export function updateArrowTargetState({
	editor,
	pointInPageSpace,
	arrow,
	isPrecise,
	isExact,
	currentBinding,
	otherBinding,
	terminal,
	isCreatingShape,
}: UpdateArrowTargetStateOpts): ArrowTargetState | null {
	const opts = elbowArrowDebug.get()
	const util = editor.getShapeUtil<ArrowShapeUtil>('arrow')
	const arrowKind = arrow ? arrow.props.kind : editor.getStyleForNextShape(ArrowShapeKindStyle)

	const isInitialStartCreation = isCreatingShape && terminal === 'start'

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

	if (!target) {
		getArrowTargetAtom(editor).set(null)
		return null
	}

	const targetGeometryInTargetSpace = editor.getShapeGeometry(target)
	const targetBoundsInTargetSpace = Box.ZeroFix(targetGeometryInTargetSpace.bounds)
	const targetCenterInTargetSpace = targetGeometryInTargetSpace.center
	const arrowTransform = arrow ? editor.getShapePageTransform(arrow.id) : Mat.Identity()
	const targetTransform = editor.getShapePageTransform(target)
	const targetToArrowTransform = arrowTransform.clone().invert().multiply(targetTransform)
	const targetToArrowRotation = targetToArrowTransform.rotation()
	const pointInTargetSpace = editor.getPointInShapeSpace(target, pointInPageSpace)

	const castDistance = Math.max(
		targetGeometryInTargetSpace.bounds.width,
		targetGeometryInTargetSpace.bounds.height
	)

	const handlesInPageSpace = mapObjectMapValues(ElbowArrowSideDeltas, (side, delta) => {
		const axis = ElbowArrowAxes[ElbowArrowSideAxes[side]]

		const castPoint = Vec.Mul(delta, castDistance)
			.rot(-targetToArrowRotation)
			.add(targetCenterInTargetSpace)

		let isEnabled = true
		let handlePointInTargetSpace: VecLike = axis.v(
			targetBoundsInTargetSpace[side],
			targetBoundsInTargetSpace[axis.crossMid]
		)
		let furthestDistance = 0

		for (const intersection of targetGeometryInTargetSpace.intersectLineSegment(
			targetCenterInTargetSpace,
			castPoint
		)) {
			const distance = Vec.Dist2(intersection, targetCenterInTargetSpace)
			if (distance > furthestDistance) {
				furthestDistance = distance
				handlePointInTargetSpace = intersection
				isEnabled = true
			}
		}

		const handlePointInPageSpace = targetTransform.applyToPoint(handlePointInTargetSpace)

		return { point: handlePointInPageSpace, isEnabled }
	})

	const zoomLevel = editor.getZoomLevel()
	const minDistScaled2 = (util.options.minHandleDistance / zoomLevel) ** 2

	const targetCenterInPageSpace = targetTransform.applyToPoint(targetCenterInTargetSpace)
	for (const side of objectMapKeys(handlesInPageSpace)) {
		const handle = handlesInPageSpace[side]
		const dist2 = Vec.Dist2(handle.point, targetCenterInPageSpace)
		if (dist2 < minDistScaled2) {
			handle.isEnabled = false
		}
	}

	let precise = isPrecise

	if (!precise && !isInitialStartCreation) {
		// If we're switching to a new bound shape, then precise only if moving slowly
		if (!currentBinding || (currentBinding && target.id !== currentBinding.toId)) {
			precise = editor.inputs.pointerVelocity.len() < 0.5
		}
	}

	if (!isPrecise) {
		if (!targetGeometryInTargetSpace.isClosed) {
			precise = true
		}

		// Double check that we're not going to be doing an imprecise snap on
		// the same shape twice, as this would result in a zero length line
		if (otherBinding && target.id === otherBinding.toId && otherBinding.props.isPrecise) {
			precise = true
		}
	}

	const shouldSnapCenter = !isExact && isPrecise
	const shouldSnapEdges =
		!isExact && isPrecise && arrowKind === 'elbow' && opts.preciseEdgePicking.snapEdges
	const shouldSnapPoints =
		!isExact && isPrecise && arrowKind === 'elbow' && opts.preciseEdgePicking.snapPoints
	const shouldSnapInside =
		arrowKind === 'bendy' ? isPrecise : isPrecise && opts.preciseEdgePicking.snapNone
	const shouldSnapAxis =
		!isExact && isPrecise && arrowKind === 'elbow' && opts.preciseEdgePicking.snapAxis

	// we run through all the snapping options from least to most specific:
	let snap: ArrowTargetState['snap'] = 'none'
	let anchorInPageSpace: VecLike = pointInPageSpace

	if (!shouldSnapInside) {
		snap = 'center'
		anchorInPageSpace = targetCenterInPageSpace
	}

	if (shouldSnapEdges) {
		const snapDistance = calculateSnapDistance(
			editor,
			targetBoundsInTargetSpace,
			util.options.elbowArrowEdgeSnapDistance
		)

		const nearestPointOnEdgeInTargetSpace = targetGeometryInTargetSpace.nearestPoint(
			pointInTargetSpace,
			{
				includeLabels: false,
				includeInternal: false,
			}
		)

		const nearestPointOnEdgeInPageSpace = targetTransform.applyToPoint(
			nearestPointOnEdgeInTargetSpace
		)

		const distance = Vec.Dist(nearestPointOnEdgeInPageSpace, pointInPageSpace)

		if (distance < snapDistance) {
			snap = 'edge'
			anchorInPageSpace = nearestPointOnEdgeInPageSpace
		}
	}

	if (shouldSnapAxis) {
		const snapDistance = calculateSnapDistance(
			editor,
			targetBoundsInTargetSpace,
			util.options.elbowArrowAxisSnapDistance
		)

		const distanceFromXAxis = Math.abs(targetCenterInPageSpace.x - pointInPageSpace.x)
		const distanceFromYAxis = Math.abs(targetCenterInPageSpace.y - pointInPageSpace.y)

		const snapAxis =
			distanceFromXAxis < distanceFromYAxis && distanceFromXAxis < snapDistance
				? 'x'
				: distanceFromYAxis < snapDistance
					? 'y'
					: null

		if (snapAxis) {
			const axis = ElbowArrowAxes[snapAxis]
			const side =
				targetCenterInPageSpace[axis.cross] > pointInPageSpace[axis.cross]
					? axis.crossLoEdge
					: axis.crossHiEdge

			const snappedPointInPageSpace = handlesInPageSpace[side].isEnabled
				? handlesInPageSpace[side].point
				: axis.v(targetCenterInPageSpace[axis.self], pointInPageSpace[axis.cross])

			snap = 'axis'
			anchorInPageSpace = snappedPointInPageSpace
		}
	}

	if (shouldSnapPoints) {
		const snapDistance = calculateSnapDistance(
			editor,
			targetBoundsInTargetSpace,
			util.options.elbowArrowPointSnapDistance
		)

		let closestSide: ElbowArrowSide | null = null
		let closestDistance = Infinity

		for (const [side, handle] of objectMapEntries(handlesInPageSpace)) {
			if (!handle.isEnabled) continue
			const distance = Vec.Dist(handle.point, pointInPageSpace)
			if (distance < snapDistance && distance < closestDistance) {
				closestDistance = distance
				closestSide = side
			}
		}

		if (closestSide) {
			snap = 'point'
			anchorInPageSpace = handlesInPageSpace[closestSide].point
		}
	}

	if (shouldSnapCenter) {
		const snapDistance = calculateSnapDistance(
			editor,
			targetBoundsInTargetSpace,
			arrowKind === 'elbow'
				? util.options.elbowArrowCenterSnapDistance
				: util.options.bendyArrowCenterSnapDistance
		)

		if (Vec.Dist(pointInTargetSpace, targetBoundsInTargetSpace.center) < snapDistance) {
			snap = 'center'
			anchorInPageSpace = targetCenterInPageSpace
		}
	}

	const snapPointInTargetSpace = editor.getPointInShapeSpace(target, anchorInPageSpace)

	const normalizedAnchor = {
		x: invLerp(
			targetBoundsInTargetSpace.minX,
			targetBoundsInTargetSpace.maxX,
			snapPointInTargetSpace.x
		),
		y: invLerp(
			targetBoundsInTargetSpace.minY,
			targetBoundsInTargetSpace.maxY,
			snapPointInTargetSpace.y
		),
	}

	const result: ArrowTargetState = {
		target,
		arrowKind,
		handlesInPageSpace,
		centerInPageSpace: targetCenterInPageSpace,
		anchorInPageSpace,
		isExact,
		isPrecise: precise,
		snap,
		normalizedAnchor,
	}

	getArrowTargetAtom(editor).set(result)

	return result
}

const targetFilterFallback = { type: 'arrow' }

/**
 * Funky math but we want the snap distance to be 4 at the minimum and either 16 or 16% of the
 * smaller dimension of the target shape, whichever is smaller
 */
function calculateSnapDistance(
	editor: Editor,
	targetBoundsInTargetSpace: Box,
	idealSnapDistance: number
) {
	return (
		clamp(
			Math.min(targetBoundsInTargetSpace.width, targetBoundsInTargetSpace.height) * 0.15,
			4,
			idealSnapDistance
		) / editor.getZoomLevel()
	)
}
