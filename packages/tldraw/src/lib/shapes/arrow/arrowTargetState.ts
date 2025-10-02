import {
	ArrowShapeKindStyle,
	atom,
	Atom,
	Box,
	clamp,
	Editor,
	ElbowArrowSnap,
	Geometry2dFilters,
	invLerp,
	mapObjectMapValues,
	objectMapEntries,
	objectMapKeys,
	TLArrowBinding,
	TLArrowShape,
	TLArrowShapeKind,
	TLShape,
	Vec,
	VecLike,
	WeakCache,
} from '@tldraw/editor'
import { ArrowShapeUtil } from './ArrowShapeUtil'
import {
	ElbowArrowAxes,
	ElbowArrowSide,
	ElbowArrowSideAxes,
	ElbowArrowSideDeltas,
} from './elbow/definitions'

/**
 * Options passed to {@link updateArrowTargetState}.
 *
 * @public
 */
export interface UpdateArrowTargetStateOpts {
	editor: Editor
	pointInPageSpace: VecLike
	arrow: TLArrowShape | undefined
	isPrecise: boolean
	currentBinding: TLArrowBinding | undefined
	/** The binding from the opposite end of the arrow, if one exists. */
	oppositeBinding: TLArrowBinding | undefined
}

/**
 * State representing what we're pointing to when drawing or updating an arrow. You can get this
 * state using {@link getArrowTargetState}, and update it as part of an arrow interaction with
 * {@link updateArrowTargetState} or {@link clearArrowTargetState}.
 *
 * @public
 */
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
	snap: ElbowArrowSnap
	normalizedAnchor: VecLike
}

const arrowTargetStore = new WeakCache<Editor, Atom<ArrowTargetState | null>>()

function getArrowTargetAtom(editor: Editor) {
	return arrowTargetStore.get(editor, () => atom('arrowTarget', null))
}

/**
 * Get the current arrow target state for an editor. See {@link ArrowTargetState} for more
 * information.
 *
 * @public
 */
export function getArrowTargetState(editor: Editor) {
	return getArrowTargetAtom(editor).get()
}

/**
 * Clear the current arrow target state for an editor. See {@link ArrowTargetState} for more
 * information.
 *
 * @public
 */
export function clearArrowTargetState(editor: Editor) {
	getArrowTargetAtom(editor).set(null)
}

/**
 * Update the current arrow target state for an editor. See {@link ArrowTargetState} for more
 * information.
 *
 * @public
 */
export function updateArrowTargetState({
	editor,
	pointInPageSpace,
	arrow,
	isPrecise,
	currentBinding,
	oppositeBinding,
}: UpdateArrowTargetStateOpts): ArrowTargetState | null {
	const util = editor.getShapeUtil<ArrowShapeUtil>('arrow')

	// no target picking when ctrl is held:
	if (util.options.shouldIgnoreTargets(editor)) {
		getArrowTargetAtom(editor).set(null)
		return null
	}

	const arrowKind = arrow ? arrow.props.kind : editor.getStyleForNextShape(ArrowShapeKindStyle)

	const target = editor.getShapeAtPoint(pointInPageSpace, {
		hitInside: true,
		hitFrameInside: true,
		margin: arrowKind === 'elbow' ? 8 : [8, 0],
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
	const targetTransform = editor.getShapePageTransform(target)
	const pointInTargetSpace = editor.getPointInShapeSpace(target, pointInPageSpace)

	const castDistance = Math.max(
		targetGeometryInTargetSpace.bounds.width,
		targetGeometryInTargetSpace.bounds.height
	)

	const handlesInPageSpace = mapObjectMapValues(ElbowArrowSideDeltas, (side, delta) => {
		const axis = ElbowArrowAxes[ElbowArrowSideAxes[side]]

		const farPoint = Vec.Mul(delta, castDistance).add(targetCenterInTargetSpace)

		let isEnabled = false
		let handlePointInTargetSpace: VecLike = axis.v(
			targetBoundsInTargetSpace[side],
			targetBoundsInTargetSpace[axis.crossMid]
		)
		let furthestDistance = 0

		const intersections = targetGeometryInTargetSpace.intersectLineSegment(
			targetCenterInTargetSpace,
			farPoint,
			Geometry2dFilters.EXCLUDE_NON_STANDARD
		)
		for (const intersection of intersections) {
			const distance = Vec.Dist2(intersection, targetCenterInTargetSpace)
			if (distance > furthestDistance) {
				furthestDistance = distance
				handlePointInTargetSpace = intersection
				isEnabled = targetGeometryInTargetSpace.isClosed
			}
		}

		const handlePointInPageSpace = targetTransform.applyToPoint(handlePointInTargetSpace)

		return { point: handlePointInPageSpace, isEnabled, far: targetTransform.applyToPoint(farPoint) }
	})

	const zoomLevel = editor.getZoomLevel()
	const minDistScaled = util.options.minElbowHandleDistance / zoomLevel

	const targetCenterInPageSpace = targetTransform.applyToPoint(targetCenterInTargetSpace)
	for (const side of objectMapKeys(handlesInPageSpace)) {
		const handle = handlesInPageSpace[side]
		if (Vec.DistMin(handle.point, targetCenterInPageSpace, minDistScaled)) {
			handle.isEnabled = false
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
		if (!targetGeometryInTargetSpace.isClosed) {
			precise = true
		}

		// Double check that we're not going to be doing an imprecise snap on
		// the same shape twice, as this would result in a zero length line
		if (oppositeBinding && target.id === oppositeBinding.toId && oppositeBinding.props.isPrecise) {
			precise = true
		}
	}

	const isExact = util.options.shouldBeExact(editor, precise)
	if (isExact) precise = true

	const shouldSnapCenter = !isExact && precise && targetGeometryInTargetSpace.isClosed
	// const shouldSnapEdges = !isExact && (precise || !targetGeometryInTargetSpace.isClosed)
	const shouldSnapEdges =
		!isExact && ((precise && arrowKind === 'elbow') || !targetGeometryInTargetSpace.isClosed)
	const shouldSnapEdgePoints =
		!isExact && precise && arrowKind === 'elbow' && targetGeometryInTargetSpace.isClosed
	const shouldSnapNone = precise && (targetGeometryInTargetSpace.isClosed || isExact)
	const shouldSnapCenterAxis =
		!isExact && precise && arrowKind === 'elbow' && targetGeometryInTargetSpace.isClosed

	// we run through all the snapping options from least to most specific:
	let snap: ElbowArrowSnap = 'none'
	let anchorInPageSpace: VecLike = pointInPageSpace

	if (!shouldSnapNone) {
		snap = 'center'
		anchorInPageSpace = targetCenterInPageSpace
	}

	if (shouldSnapEdges) {
		const snapDistance = shouldSnapNone
			? calculateSnapDistance(
					editor,
					targetBoundsInTargetSpace,
					util.options.elbowArrowEdgeSnapDistance
				)
			: Infinity

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

	if (shouldSnapCenterAxis) {
		const snapDistance = calculateSnapDistance(
			editor,
			targetBoundsInTargetSpace,
			util.options.elbowArrowAxisSnapDistance
		)

		const distanceFromXAxis = Vec.DistanceToLineSegment(
			handlesInPageSpace.left.far,
			handlesInPageSpace.right.far,
			pointInPageSpace
		)
		const distanceFromYAxis = Vec.DistanceToLineSegment(
			handlesInPageSpace.top.far,
			handlesInPageSpace.bottom.far,
			pointInPageSpace
		)

		const snapAxis =
			distanceFromXAxis < distanceFromYAxis && distanceFromXAxis < snapDistance
				? 'x'
				: distanceFromYAxis < snapDistance
					? 'y'
					: null

		if (snapAxis) {
			const axis = ElbowArrowAxes[snapAxis]

			const loDist2 = Vec.Dist2(handlesInPageSpace[axis.loEdge].far, pointInPageSpace)
			const hiDist2 = Vec.Dist2(handlesInPageSpace[axis.hiEdge].far, pointInPageSpace)

			const side = loDist2 < hiDist2 ? axis.loEdge : axis.hiEdge

			if (handlesInPageSpace[side].isEnabled) {
				snap = 'edge-point'
				anchorInPageSpace = handlesInPageSpace[side].point
			}
		}
	}

	if (shouldSnapEdgePoints) {
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
			snap = 'edge-point'
			anchorInPageSpace = handlesInPageSpace[closestSide].point
		}
	}

	if (shouldSnapCenter) {
		const snapDistance = calculateSnapDistance(
			editor,
			targetBoundsInTargetSpace,
			arrowKind === 'elbow'
				? util.options.elbowArrowCenterSnapDistance
				: util.options.arcArrowCenterSnapDistance
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
 * Funky math but we want the snap distance to be 4 at the minimum and either 16 or 15% of the
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
