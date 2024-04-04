import {
	BindingUtil,
	Editor,
	IndexKey,
	TLArrowShape,
	TLBinding,
	TLParentId,
	TLShape,
	TLShapeId,
	getArrowTerminalsInArrowSpace,
	getIndexAbove,
	getIndexBetween,
} from '@tldraw/editor'

export interface TLArrowBinding extends TLBinding<'arrow'> {
	terminal: 'start' | 'end'
}

export class ArrowBindingUtil extends BindingUtil<TLArrowBinding> {
	static override type = 'arrow'

	override getBindingsFromShape(shape: TLShape): TLArrowBinding[] | null {
		if (!this.editor.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
			return null
		}

		const bindings: TLArrowBinding[] = []
		if (shape.props.start.type === 'binding') {
			bindings.push({
				type: 'arrow',
				terminal: 'start',
				fromId: shape.id,
				toId: shape.props.start.boundShapeId,
			})
		}
		if (shape.props.end.type === 'binding') {
			bindings.push({
				type: 'arrow',
				terminal: 'end',
				fromId: shape.id,
				toId: shape.props.end.boundShapeId,
			})
		}

		console.log('getBindingsFromShape', shape.id, bindings)

		return bindings
	}

	// if an arrow is created whilst already bound
	override onAfterCreateFromShape(binding: TLArrowBinding, shape: TLShape): void {
		arrowDidUpdate(this.editor, shape as TLArrowShape)
	}

	// when a bound arrow is updated
	override onAfterChangeFromShape(binding: TLArrowBinding, prev: TLShape, next: TLShape): void {
		arrowDidUpdate(this.editor, next as TLArrowShape)
	}

	// when the shape an arrow is bound to changes ancestry
	override onAfterChangeToShapeAncestry(binding: TLArrowBinding): void {
		reparentArrow(this.editor, binding.fromId)
	}

	// when the shape the arrow is pointing to is deleted:
	override onBeforeDeleteToShape(binding: TLArrowBinding): void {
		const arrow = this.editor.getShape<TLArrowShape>(binding.fromId)
		if (!arrow) return
		unbindArrowTerminal(this.editor, arrow, binding.terminal)
	}
}

function reparentArrow(editor: Editor, arrowId: TLShapeId) {
	const arrow = editor.getShape<TLArrowShape>(arrowId)
	if (!arrow) return

	const { start, end } = arrow.props
	const startShape = start.type === 'binding' ? editor.getShape(start.boundShapeId) : undefined
	const endShape = end.type === 'binding' ? editor.getShape(end.boundShapeId) : undefined

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

function unbindArrowTerminal(editor: Editor, arrow: TLArrowShape, handleId: 'start' | 'end') {
	const { x, y } = getArrowTerminalsInArrowSpace(editor, arrow)[handleId]
	console.log('unbindArrowTerminal', arrow.id, handleId)
	editor.updateShape({
		id: arrow.id,
		type: 'arrow',
		props: { [handleId]: { type: 'point', x, y } },
	})
	// editor.store.put([{ ...arrow, props: { ...arrow.props, [handleId]: { type: 'point', x, y } } }])
}

function arrowDidUpdate(editor: Editor, arrow: TLArrowShape) {
	// if the shape is an arrow and its bound shape is on another page
	// or was deleted, unbind it
	for (const handle of ['start', 'end'] as const) {
		const terminal = arrow.props[handle]
		if (terminal.type !== 'binding') continue
		const boundShape = editor.getShape(terminal.boundShapeId)
		const isShapeInSamePageAsArrow =
			editor.getAncestorPageId(arrow) === editor.getAncestorPageId(boundShape)
		if (!boundShape || !isShapeInSamePageAsArrow) {
			unbindArrowTerminal(editor, arrow, handle)
		}
	}

	// always check the arrow parents
	reparentArrow(editor, arrow.id)
}
