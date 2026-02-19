import {
	Editor,
	Geometry2d,
	intersectLineSegmentPolygon,
	Mat,
	MatModel,
	pointInPolygon,
	TLArrowBinding,
	TLArrowBindingProps,
	TLArrowShape,
	TLShape,
	TLShapeId,
	Vec,
} from '@tldraw/editor'
import { createComputedCache } from '@tldraw/store'

const MIN_ARROW_BEND = 8

export function getIsArrowStraight(shape: TLArrowShape) {
	if (shape.props.kind !== 'arc') return false
	return Math.abs(shape.props.bend) < MIN_ARROW_BEND * shape.props.scale // snap to +-8px
}

export interface BoundShapeInfo<T extends TLShape = TLShape> {
	shape: T
	didIntersect: boolean
	isExact: boolean
	isClosed: boolean
	transform: Mat
	geometry: Geometry2d
}

export function getBoundShapeInfoForTerminal(
	editor: Editor,
	arrow: TLArrowShape,
	terminalName: 'start' | 'end'
): BoundShapeInfo | undefined {
	const binding = editor
		.getBindingsFromShape(arrow, 'arrow')
		.find((b) => b.props.terminal === terminalName)
	if (!binding) return

	const boundShape = editor.getShape(binding.toId)!
	if (!boundShape) return
	const transform = editor.getShapePageTransform(boundShape)!
	const hasArrowhead =
		terminalName === 'start'
			? arrow.props.arrowheadStart !== 'none'
			: arrow.props.arrowheadEnd !== 'none'
	const geometry = editor.getShapeGeometry(
		boundShape,
		hasArrowhead ? undefined : { context: '@tldraw/arrow-without-arrowhead' }
	)

	return {
		shape: boundShape,
		transform,
		isClosed: geometry.isClosed,
		isExact: binding.props.isExact,
		didIntersect: false,
		geometry,
	}
}

export function getArrowTerminalInArrowSpace(
	editor: Editor,
	arrowPageTransform: Mat,
	binding: TLArrowBinding,
	forceImprecise: boolean
) {
	const boundShape = editor.getShape(binding.toId)

	if (!boundShape) {
		// this can happen in multiplayer contexts where the shape is being deleted
		return new Vec(0, 0)
	} else {
		// Find the actual local point of the normalized terminal on
		// the bound shape and transform it to page space, then transform
		// it to arrow space
		const { point, size } = editor.getShapeGeometry(boundShape).bounds
		const shapePoint = Vec.Add(
			point,
			Vec.MulV(
				// if the parent is the bound shape, then it's ALWAYS precise
				binding.props.isPrecise || forceImprecise
					? binding.props.normalizedAnchor
					: { x: 0.5, y: 0.5 },
				size
			)
		)
		const pagePoint = Mat.applyToPoint(editor.getShapePageTransform(boundShape)!, shapePoint)
		const arrowPoint = Mat.applyToPoint(Mat.Inverse(arrowPageTransform), pagePoint)
		return arrowPoint
	}
}

/** @public */
export interface TLArrowBindings {
	start: TLArrowBinding | undefined
	end: TLArrowBinding | undefined
}

const arrowBindingsCache = createComputedCache(
	'arrow bindings',
	(editor: Editor, arrow: TLArrowShape) => {
		const bindings = editor.getBindingsFromShape(arrow.id, 'arrow')
		return {
			start: bindings.find((b) => b.props.terminal === 'start'),
			end: bindings.find((b) => b.props.terminal === 'end'),
		}
	},
	{
		// we only look at the arrow IDs:
		areRecordsEqual: (a, b) => a.id === b.id,
		// the records should stay the same:
		areResultsEqual: (a, b) => a.start === b.start && a.end === b.end,
	}
)

/** @public */
export function getArrowBindings(editor: Editor, shape: TLArrowShape): TLArrowBindings {
	return arrowBindingsCache.get(editor, shape.id)!
}

/** @public */
export function getArrowTerminalsInArrowSpace(
	editor: Editor,
	shape: TLArrowShape,
	bindings: TLArrowBindings
) {
	const arrowPageTransform = editor.getShapePageTransform(shape)!

	const boundShapeRelationships = getBoundShapeRelationships(
		editor,
		bindings.start?.toId,
		bindings.end?.toId
	)

	const start = bindings.start
		? getArrowTerminalInArrowSpace(
				editor,
				arrowPageTransform,
				bindings.start,
				boundShapeRelationships === 'double-bound' ||
					boundShapeRelationships === 'start-contains-end'
			)
		: Vec.From(shape.props.start)

	const end = bindings.end
		? getArrowTerminalInArrowSpace(
				editor,
				arrowPageTransform,
				bindings.end,
				boundShapeRelationships === 'double-bound' ||
					boundShapeRelationships === 'end-contains-start'
			)
		: Vec.From(shape.props.end)

	return { start, end }
}

/**
 * Create or update the arrow binding for a particular arrow terminal. Will clear up if needed.
 * @internal
 */
export function createOrUpdateArrowBinding(
	editor: Editor,
	arrow: TLArrowShape | TLShapeId,
	target: TLShape | TLShapeId,
	props: TLArrowBindingProps
) {
	const arrowId = typeof arrow === 'string' ? arrow : arrow.id
	const targetId = typeof target === 'string' ? target : target.id

	const existingMany = editor
		.getBindingsFromShape(arrowId, 'arrow')
		.filter((b) => b.props.terminal === props.terminal)

	// if we've somehow ended up with too many bindings, delete the extras
	if (existingMany.length > 1) {
		editor.deleteBindings(existingMany.slice(1))
	}

	const existing = existingMany[0]
	if (existing) {
		editor.updateBinding({
			...existing,
			toId: targetId,
			props,
		})
	} else {
		editor.createBinding({
			type: 'arrow',
			fromId: arrowId,
			toId: targetId,
			props,
		})
	}
}

/**
 * Remove any arrow bindings for a particular terminal.
 * @internal
 */
export function removeArrowBinding(editor: Editor, arrow: TLArrowShape, terminal: 'start' | 'end') {
	const existing = editor
		.getBindingsFromShape(arrow, 'arrow')
		.filter((b) => b.props.terminal === terminal)

	editor.deleteBindings(existing)
}

/** @internal */
export const MIN_ARROW_LENGTH = 10
/** @internal */
export const BOUND_ARROW_OFFSET = 10
/** @internal */
export const WAY_TOO_BIG_ARROW_BEND_FACTOR = 10

/** @public */
export const STROKE_SIZES: Record<string, number> = {
	s: 2,
	m: 3.5,
	l: 5,
	xl: 10,
}

/**
 * Get the relationships for an arrow that has two bound shape terminals.
 * If the arrow has only one bound shape, then it is always "safe" to apply
 * standard offsets and precision behavior. If the shape is bound to the same
 * shape on both ends, then that is an exception. If one of the shape's
 * terminals is bound to a shape that contains / is contained by the shape that
 * is bound to the other terminal, then that is also an exception.
 *
 * @param editor - the editor instance
 * @param startShapeId - the bound shape from the arrow's start
 * @param endShapeId - the bound shape from the arrow's end
 *
 *  @internal */
export function getBoundShapeRelationships(
	editor: Editor,
	startShapeId?: TLShapeId,
	endShapeId?: TLShapeId
) {
	if (!startShapeId || !endShapeId) return 'safe'
	if (startShapeId === endShapeId) return 'double-bound'
	const startBounds = editor.getShapePageBounds(startShapeId)
	const endBounds = editor.getShapePageBounds(endShapeId)
	if (startBounds && endBounds) {
		if (startBounds.contains(endBounds)) return 'start-contains-end'
		if (endBounds.contains(startBounds)) return 'end-contains-start'
	}
	return 'safe'
}

/**
 * If the arrow terminal point falls outside the bound shape's mask (e.g. when a shape
 * extends beyond a frame boundary and is clipped), clamp the terminal to the mask boundary.
 * Uses the binding anchor point (inside the shape/frame) as the ray origin, since the
 * arrow endpoint may be entirely outside the mask.
 *
 * @internal
 */
export function clampArrowTerminalToMask(
	editor: Editor,
	point: Vec,
	terminalHandle: Vec,
	arrowPageTransform: MatModel,
	targetShapeInfo?: BoundShapeInfo
) {
	if (!targetShapeInfo) return

	const mask = editor.getShapeMask(targetShapeInfo.shape.id)
	if (!mask) return

	const pagePoint = Mat.applyToPoint(arrowPageTransform, point)

	if (pointInPolygon(pagePoint, mask)) return

	// The point is outside the mask (clipped). Cast a ray from the binding
	// anchor (which is inside the shape, and typically inside the frame) through
	// the intersection point on the shape boundary to find where it crosses the mask.
	// We extend the line slightly past the anchor in case the anchor sits exactly
	// on the mask boundary.
	const pageAnchor = Mat.applyToPoint(arrowPageTransform, terminalHandle)
	const direction = Vec.Sub(pageAnchor, pagePoint).uni()
	const extendedAnchor = Vec.Add(pageAnchor, Vec.Mul(direction, 1))
	const intersections = intersectLineSegmentPolygon(extendedAnchor, pagePoint, mask)
	if (!intersections || intersections.length === 0) return

	// Pick the intersection closest to the original point (nearest frame edge to the shape)
	let closest = intersections[0]
	let closestDist = Vec.Dist2(closest, pagePoint)
	for (let i = 1; i < intersections.length; i++) {
		const dist = Vec.Dist2(intersections[i], pagePoint)
		if (dist < closestDist) {
			closest = intersections[i]
			closestDist = dist
		}
	}

	const arrowPoint = Mat.applyToPoint(Mat.Inverse(arrowPageTransform), closest)
	point.setTo(arrowPoint)
}
