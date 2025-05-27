import {
	BindingOnChangeOptions,
	BindingOnCreateOptions,
	BindingOnShapeChangeOptions,
	BindingOnShapeIsolateOptions,
	BindingUtil,
	Editor,
	IndexKey,
	TLArrowBinding,
	TLArrowBindingProps,
	TLArrowShape,
	TLParentId,
	TLShape,
	TLShapeId,
	TLShapePartial,
	Vec,
	approximately,
	arrowBindingMigrations,
	arrowBindingProps,
	assert,
	getIndexAbove,
	getIndexBetween,
	intersectLineSegmentCircle,
} from '@tldraw/editor'
import { getArrowBindings, getArrowInfo, removeArrowBinding } from '../../shapes/arrow/shared'

/**
 * @public
 */
export class ArrowBindingUtil extends BindingUtil<TLArrowBinding> {
	static override type = 'arrow'

	static override props = arrowBindingProps
	static override migrations = arrowBindingMigrations

	override getDefaultProps(): Partial<TLArrowBindingProps> {
		return {
			isPrecise: false,
			isExact: false,
			normalizedAnchor: { x: 0.5, y: 0.5 },
			snap: 'none',
		}
	}

	// when the binding itself changes
	override onAfterCreate({ binding }: BindingOnCreateOptions<TLArrowBinding>): void {
		const arrow = this.editor.getShape(binding.fromId) as TLArrowShape | undefined
		if (!arrow) return
		arrowDidUpdate(this.editor, arrow)
	}

	// when the binding itself changes
	override onAfterChange({ bindingAfter }: BindingOnChangeOptions<TLArrowBinding>): void {
		const arrow = this.editor.getShape(bindingAfter.fromId) as TLArrowShape | undefined
		if (!arrow) return
		arrowDidUpdate(this.editor, arrow)
	}

	// when the arrow itself changes
	override onAfterChangeFromShape({
		shapeAfter,
	}: BindingOnShapeChangeOptions<TLArrowBinding>): void {
		arrowDidUpdate(this.editor, shapeAfter as TLArrowShape)
	}

	// when the shape an arrow is bound to changes
	override onAfterChangeToShape({ binding }: BindingOnShapeChangeOptions<TLArrowBinding>): void {
		reparentArrow(this.editor, binding.fromId)
	}

	// when the arrow is isolated we need to update it's x,y positions
	override onBeforeIsolateFromShape({
		binding,
	}: BindingOnShapeIsolateOptions<TLArrowBinding>): void {
		const arrow = this.editor.getShape<TLArrowShape>(binding.fromId)
		if (!arrow) return
		updateArrowTerminal({
			editor: this.editor,
			arrow,
			terminal: binding.props.terminal,
		})
	}
}

function reparentArrow(editor: Editor, arrowId: TLShapeId) {
	const arrow = editor.getShape<TLArrowShape>(arrowId)
	if (!arrow) return
	const bindings = getArrowBindings(editor, arrow)
	const { start, end } = bindings
	const startShape = start ? editor.getShape(start.toId) : undefined
	const endShape = end ? editor.getShape(end.toId) : undefined

	const parentPageId = editor.getAncestorPageId(arrow)
	if (!parentPageId) return

	let nextParentId: TLParentId
	if (startShape && endShape) {
		// if arrow has two bindings, always parent arrow to closest common ancestor of the bindings
		nextParentId = editor.findCommonAncestor([startShape, endShape]) ?? parentPageId
	} else if (startShape || endShape) {
		const bindingParentId = (startShape || endShape)?.parentId
		// If the arrow and the shape that it is bound to have the same parent, then keep that parent
		if (bindingParentId && bindingParentId === arrow.parentId) {
			nextParentId = arrow.parentId
		} else {
			// if arrow has one binding, keep arrow on its own page
			nextParentId = parentPageId
		}
	} else {
		return
	}

	if (nextParentId && nextParentId !== arrow.parentId) {
		editor.reparentShapes([arrowId], nextParentId)
	}

	const reparentedArrow = editor.getShape<TLArrowShape>(arrowId)
	if (!reparentedArrow) throw Error('no reparented arrow')

	const startSibling = editor.getShapeNearestSibling(reparentedArrow, startShape)
	const endSibling = editor.getShapeNearestSibling(reparentedArrow, endShape)

	let highestSibling: TLShape | undefined

	if (startSibling && endSibling) {
		highestSibling = startSibling.index > endSibling.index ? startSibling : endSibling
	} else if (startSibling && !endSibling) {
		highestSibling = startSibling
	} else if (endSibling && !startSibling) {
		highestSibling = endSibling
	} else {
		return
	}

	let finalIndex: IndexKey

	const higherSiblings = editor
		.getSortedChildIdsForParent(highestSibling.parentId)
		.map((id) => editor.getShape(id)!)
		.filter((sibling) => sibling.index > highestSibling!.index)

	if (higherSiblings.length) {
		// there are siblings above the highest bound sibling, we need to
		// insert between them.

		// if the next sibling is also a bound arrow though, we can end up
		// all fighting for the same indexes. so lets find the next
		// non-arrow sibling...
		const nextHighestNonArrowSibling = higherSiblings.find((sibling) => sibling.type !== 'arrow')

		if (
			// ...then, if we're above the last shape we want to be above...
			reparentedArrow.index > highestSibling.index &&
			// ...but below the next non-arrow sibling...
			(!nextHighestNonArrowSibling || reparentedArrow.index < nextHighestNonArrowSibling.index)
		) {
			// ...then we're already in the right place. no need to update!
			return
		}

		// otherwise, we need to find the index between the highest sibling
		// we want to be above, and the next highest sibling we want to be
		// below:
		finalIndex = getIndexBetween(highestSibling.index, higherSiblings[0].index)
	} else {
		// if there are no siblings above us, we can just get the next index:
		finalIndex = getIndexAbove(highestSibling.index)
	}

	if (finalIndex !== reparentedArrow.index) {
		editor.updateShapes<TLArrowShape>([{ id: arrowId, type: 'arrow', index: finalIndex }])
	}
}

function arrowDidUpdate(editor: Editor, arrow: TLArrowShape) {
	const bindings = getArrowBindings(editor, arrow)
	// if the shape is an arrow and its bound shape is on another page
	// or was deleted, unbind it
	for (const handle of ['start', 'end'] as const) {
		const binding = bindings[handle]
		if (!binding) continue
		const boundShape = editor.getShape(binding.toId)
		const isShapeInSamePageAsArrow =
			editor.getAncestorPageId(arrow) === editor.getAncestorPageId(boundShape)
		if (!boundShape || !isShapeInSamePageAsArrow) {
			updateArrowTerminal({ editor, arrow, terminal: handle, unbind: true })
		}
	}

	// always check the arrow parents
	reparentArrow(editor, arrow.id)
}

/** @internal */
export function updateArrowTerminal({
	editor,
	arrow,
	terminal,
	unbind = false,
	useHandle = false,
}: {
	editor: Editor
	arrow: TLArrowShape
	terminal: 'start' | 'end'
	unbind?: boolean
	useHandle?: boolean
}) {
	const info = getArrowInfo(editor, arrow)
	if (!info) {
		throw new Error('expected arrow info')
	}

	const startPoint = useHandle ? info.start.handle : info.start.point
	const endPoint = useHandle ? info.end.handle : info.end.point
	const point = terminal === 'start' ? startPoint : endPoint

	const update = {
		id: arrow.id,
		type: 'arrow',
		props: {
			[terminal]: { x: point.x, y: point.y },
			bend: arrow.props.bend,
		},
	} satisfies TLShapePartial<TLArrowShape>

	// fix up the bend:
	if (info.type === 'arc') {
		// find the new start/end points of the resulting arrow
		const newStart = terminal === 'start' ? startPoint : info.start.handle
		const newEnd = terminal === 'end' ? endPoint : info.end.handle
		const newMidPoint = Vec.Med(newStart, newEnd)

		// intersect a line segment perpendicular to the new arrow with the old arrow arc to
		// find the new mid-point
		const lineSegment = Vec.Sub(newStart, newEnd)
			.per()
			.uni()
			.mul(info.handleArc.radius * 2 * Math.sign(arrow.props.bend))

		// find the intersections with the old arrow arc:
		const intersections = intersectLineSegmentCircle(
			info.handleArc.center,
			Vec.Add(newMidPoint, lineSegment),
			info.handleArc.center,
			info.handleArc.radius
		)

		assert(intersections?.length === 1)
		const bend = Vec.Dist(newMidPoint, intersections[0]) * Math.sign(arrow.props.bend)
		// use `approximately` to avoid endless update loops
		if (!approximately(bend, update.props.bend)) {
			update.props.bend = bend
		}
	}

	editor.updateShape(update)
	if (unbind) {
		removeArrowBinding(editor, arrow, terminal)
	}
}
