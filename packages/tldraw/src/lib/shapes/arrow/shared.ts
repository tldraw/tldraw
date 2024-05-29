import {
	Editor,
	Group2d,
	Mat,
	TLArrowBinding,
	TLArrowBindingProps,
	TLArrowShape,
	TLShape,
	TLShapeId,
	Vec,
} from '@tldraw/editor'
import { createComputedCache } from '@tldraw/store'
import { getCurvedArrowInfo } from './curved-arrow'
import { getStraightArrowInfo } from './straight-arrow'

export function getIsArrowStraight(shape: TLArrowShape) {
	return Math.abs(shape.props.bend) < 8 // snap to +-8px
}

export interface BoundShapeInfo<T extends TLShape = TLShape> {
	shape: T
	didIntersect: boolean
	isExact: boolean
	isClosed: boolean
	transform: Mat
	outline: Vec[]
}

export function getBoundShapeInfoForTerminal(
	editor: Editor,
	arrow: TLArrowShape,
	terminalName: 'start' | 'end'
): BoundShapeInfo | undefined {
	const binding = editor
		.getBindingsFromShape<TLArrowBinding>(arrow, 'arrow')
		.find((b) => b.props.terminal === terminalName)
	if (!binding) return

	const boundShape = editor.getShape(binding.toId)!
	if (!boundShape) return
	const transform = editor.getShapePageTransform(boundShape)!
	const geometry = editor.getShapeGeometry(boundShape)

	// This is hacky: we're only looking at the first child in the group. Really the arrow should
	// consider all items in the group which are marked as snappable as separate polygons with which
	// to intersect, in the case of a group that has multiple children which do not overlap; or else
	// flatten the geometry into a set of polygons and intersect with that.
	const outline = geometry instanceof Group2d ? geometry.children[0].vertices : geometry.vertices

	return {
		shape: boundShape,
		transform,
		isClosed: geometry.isClosed,
		isExact: binding.props.isExact,
		didIntersect: false,
		outline,
	}
}

function getArrowTerminalInArrowSpace(
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

/** @public */
export function getArrowBindings(editor: Editor, shape: TLArrowShape): TLArrowBindings {
	const bindings = editor.getBindingsFromShape<TLArrowBinding>(shape, 'arrow')
	return {
		start: bindings.find((b) => b.props.terminal === 'start'),
		end: bindings.find((b) => b.props.terminal === 'end'),
	}
}

const arrowInfoCache = createComputedCache('arrow info', (editor: Editor, shape: TLArrowShape) => {
	const bindings = getArrowBindings(editor, shape)
	return getIsArrowStraight(shape)
		? getStraightArrowInfo(editor, shape, bindings)
		: getCurvedArrowInfo(editor, shape, bindings)
})

/** @public */
export function getArrowInfo(editor: Editor, shape: TLArrowShape | TLShapeId) {
	const id = typeof shape === 'string' ? shape : shape.id
	return arrowInfoCache.get(editor, id)
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
		.getBindingsFromShape<TLArrowBinding>(arrowId, 'arrow')
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
		.getBindingsFromShape<TLArrowBinding>(arrow, 'arrow')
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
