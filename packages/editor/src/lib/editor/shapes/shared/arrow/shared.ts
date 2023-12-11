import {
	TLArrowBinding,
	TLArrowShape,
	TLArrowShapeTerminal,
	TLShape,
	TLShapeId,
} from '@tldraw/tlschema'
import { Matrix2d } from '../../../../primitives/Matrix2d'
import { Vec2d } from '../../../../primitives/Vec2d'
import { Group2d } from '../../../../primitives/geometry/Group2d'
import { Editor } from '../../../Editor'

export function getIsArrowStraight(shape: TLArrowShape) {
	return Math.abs(shape.props.bend) < 8 // snap to +-8px
}

export type BoundShapeInfo<T extends TLShape = TLShape> = {
	shape: T
	didIntersect: boolean
	isExact: boolean
	isClosed: boolean
	transform: Matrix2d
	outline: Vec2d[]
}

function getShapeInfoFromBinding(editor: Editor, binding?: TLArrowBinding) {
	if (!binding) return undefined
	const shape = editor.getShape(binding.toShapeId)!
	const transform = editor.getShapePageTransform(shape)!
	const geometry = editor.getShapeGeometry(shape)

	// This is hacky: we're only looking at the first child in the group. Really the arrow should
	// consider all items in the group which are marked as snappable as separate polygons with which
	// to intersect, in the case of a group that has multiple children which do not overlap; or else
	// flatten the geometry into a set of polygons and intersect with that.
	const outline = geometry instanceof Group2d ? geometry.children[0].vertices : geometry.vertices

	return {
		shape,
		transform,
		isClosed: geometry.isClosed,
		isExact: binding.props.isExact,
		didIntersect: false,
		outline,
	}
}

export function getBoundShapeInfo(
	editor: Editor,
	shape: TLArrowShape
): { startShapeInfo: BoundShapeInfo | undefined; endShapeInfo: BoundShapeInfo | undefined } {
	const { startBinding, endBinding } = getArrowBindings(editor, shape)

	return {
		startShapeInfo: getShapeInfoFromBinding(editor, startBinding),
		endShapeInfo: getShapeInfoFromBinding(editor, endBinding),
	}
}

export function getArrowTerminalInArrowSpace(
	editor: Editor,
	arrowPageTransform: Matrix2d,
	terminal: TLArrowShapeTerminal,
	forceImprecise: boolean,
	arrowBinding?: TLArrowBinding
) {
	if (!arrowBinding) {
		return Vec2d.From(terminal)
	}

	const boundShape = editor.getShape(arrowBinding.toShapeId)

	if (!boundShape) {
		// this can happen in multiplayer contexts where the shape is being deleted
		return new Vec2d(0, 0)
	} else {
		// Find the actual local point of the normalized terminal on
		// the bound shape and transform it to page space, then transform
		// it to arrow space
		const { point, size } = editor.getShapeGeometry(boundShape).bounds
		const shapePoint = Vec2d.Add(
			point,
			Vec2d.MulV(
				// if the parent is the bound shape, then it's ALWAYS precise
				arrowBinding.props.isPrecise || forceImprecise
					? arrowBinding.props.normalizedAnchor
					: { x: 0.5, y: 0.5 },
				size
			)
		)
		const pagePoint = Matrix2d.applyToPoint(editor.getShapePageTransform(boundShape)!, shapePoint)
		const arrowPoint = Matrix2d.applyToPoint(Matrix2d.Inverse(arrowPageTransform), pagePoint)
		return arrowPoint
	}
}

/** @internal */
export function getArrowBindings(editor: Editor, shape: TLArrowShape) {
	const bindings = editor.getBindingsForShapeId(shape.id, 'arrow')
	const startBinding = bindings.find((b) => b.props.terminal === 'start')
	const endBinding = bindings.find((b) => b.props.terminal === 'end')

	return { startBinding, endBinding }
}

/** @public */
export function getArrowTerminalsInArrowSpace(editor: Editor, shape: TLArrowShape) {
	const arrowPageTransform = editor.getShapePageTransform(shape)!

	const { startBinding, endBinding } = getArrowBindings(editor, shape)

	const boundShapeRelationships = getBoundShapeRelationships(
		editor,
		startBinding?.toShapeId,
		endBinding?.toShapeId
	)

	const start = getArrowTerminalInArrowSpace(
		editor,
		arrowPageTransform,
		shape.props.start,
		boundShapeRelationships === 'double-bound' || boundShapeRelationships === 'start-contains-end',
		startBinding
	)

	const end = getArrowTerminalInArrowSpace(
		editor,
		arrowPageTransform,
		shape.props.end,
		boundShapeRelationships === 'double-bound' || boundShapeRelationships === 'end-contains-start',
		endBinding
	)

	return { start, end }
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
