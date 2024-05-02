import {
	BindingUtil,
	Editor,
	IndexKey,
	TLArrowBinding,
	TLArrowBindingProps,
	TLArrowShape,
	TLParentId,
	TLShape,
	TLShapeId,
	TLUnknownBinding,
	Vec,
	arrowBindingMakeItNotSo,
	arrowBindingMakeItSo,
	arrowBindingMigrations,
	arrowBindingProps,
	assert,
	getArrowBindings,
	getArrowTerminalsInArrowSpace,
	getIndexAbove,
	getIndexBetween,
	intersectLineSegmentCircle,
	structuredClone,
} from '@tldraw/editor'

export class ArrowBindingUtil extends BindingUtil<TLArrowBinding> {
	static override type = 'arrow'

	static override props = arrowBindingProps
	static override migrations = arrowBindingMigrations

	override getDefaultProps(): Partial<TLArrowBindingProps> {
		return {
			isPrecise: false,
			isExact: false,
			normalizedAnchor: { x: 0.5, y: 0.5 },
		}
	}

	// when the binding itself changes
	override onAfterCreate(binding: TLArrowBinding): void {
		arrowDidUpdate(this.editor, this.editor.getShape(binding.fromId) as TLArrowShape)
	}

	// when the binding itself changes
	override onAfterChange(prev: TLArrowBinding, next: TLArrowBinding): void {
		arrowDidUpdate(this.editor, this.editor.getShape(next.fromId) as TLArrowShape)
	}

	// if an arrow is created whilst already bound
	override onAfterCreateFromShape(binding: TLArrowBinding, shape: TLShape): void {
		arrowDidUpdate(this.editor, shape as TLArrowShape)
	}

	// when a bound arrow is updated
	override onAfterChangeFromShape(binding: TLArrowBinding, prev: TLShape, next: TLShape): void {
		arrowDidUpdate(this.editor, next as TLArrowShape)
	}

	// when duplicating an arrow shape
	override onAfterDuplicateFromShape(
		binding: TLArrowBinding,
		originalShape: TLShape,
		newShape: TLShape,
		duplicatedIds: ReadonlyMap<TLShapeId, TLShapeId>
	): void {
		assert(
			this.editor.isShapeOfType<TLArrowShape>(newShape, 'arrow') &&
				this.editor.isShapeOfType<TLArrowShape>(originalShape, 'arrow')
		)

		if (this.editor.getBindingsFromShape<TLArrowBinding>(newShape, 'arrow').length) {
			// if the new shape is already bound, we don't need to do anything. arrows can be bound
			// more than once (start/end), and this handles all the cases although it will be called
			// for each binding.
			return
		}

		const nextShape = structuredClone(newShape)

		const originalInfo = this.editor.getArrowInfo(originalShape)!
		let didBindStart = false
		let didBindEnd = false

		if (originalInfo.bindings.start) {
			const newStartShapeId = duplicatedIds.get(originalInfo.bindings.start.toId)

			if (newStartShapeId) {
				arrowBindingMakeItSo(
					this.editor,
					nextShape,
					newStartShapeId,
					originalInfo.bindings.start.props
				)
				didBindStart = true
			} else {
				if (originalInfo?.isValid) {
					const { x, y } = originalInfo.start.point
					nextShape.props.start = { x, y }
				} else {
					const { start } = getArrowTerminalsInArrowSpace(
						this.editor,
						originalShape,
						originalInfo.bindings
					)
					nextShape.props.start = { x: start.x, y: start.y }
				}
			}
		}

		if (originalInfo.bindings.end) {
			const newEndShapeId = duplicatedIds.get(originalInfo.bindings.end.toId)
			if (newEndShapeId) {
				arrowBindingMakeItSo(this.editor, nextShape, newEndShapeId, originalInfo.bindings.end.props)
				didBindEnd = true
			} else {
				if (originalInfo?.isValid) {
					const { x, y } = originalInfo.end.point
					nextShape.props.end = { x, y }
				} else {
					const { end } = getArrowTerminalsInArrowSpace(
						this.editor,
						originalShape,
						originalInfo.bindings
					)
					nextShape.props.start = { x: end.x, y: end.y }
				}
			}
		}

		// fix up the bend:
		if (!originalInfo.isStraight) {
			// find the new start/end points of the resulting arrow
			const startPoint = didBindStart ? originalInfo.start.handle : nextShape.props.start
			const endPoint = didBindEnd ? originalInfo.end.handle : nextShape.props.end
			const midPoint = Vec.Med(startPoint, endPoint)

			// intersect a line segment perpendicular to the new arrow with the old arrow arc to
			// find the new mid-point
			const lineSegment = (
				originalShape.props.bend < 0 ? Vec.Sub(endPoint, startPoint) : Vec.Sub(startPoint, endPoint)
			)
				.per()
				.uni()
				.mul(originalInfo.handleArc.radius * 2)

			// find the intersections with the old arrow arc:
			const intersections = intersectLineSegmentCircle(
				originalInfo.handleArc.center,
				Vec.Add(midPoint, lineSegment),
				originalInfo.handleArc.center,
				originalInfo.handleArc.radius
			)

			if (intersections?.length === 1) {
				const bend = Vec.Dist(midPoint, intersections[0]) * Math.sign(originalShape.props.bend)
				nextShape.props.bend = bend
			}
		}

		this.editor.updateShape(nextShape)
	}

	// when the shape an arrow is bound to changes ancestry
	override onAfterChangeToShapeAncestry(binding: TLArrowBinding): void {
		reparentArrow(this.editor, binding.fromId)
	}

	// when the arrow itself changes ancestry
	override onAfterChangeFromShapeAncestry(binding: TLUnknownBinding): void {
		arrowDidUpdate(this.editor, this.editor.getShape(binding.fromId) as TLArrowShape)
	}

	// when the shape the arrow is pointing to is deleted:
	override onBeforeDeleteToShape(binding: TLArrowBinding): void {
		const arrow = this.editor.getShape<TLArrowShape>(binding.fromId)
		if (!arrow) return
		unbindArrowTerminal(this.editor, arrow, binding.props.terminal)
	}

	// when the arrow itself is deleted, also delete the bindings:
	override onBeforeDeleteFromShape(binding: TLArrowBinding): void {
		this.editor.deleteBinding(binding)
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
			unbindArrowTerminal(editor, arrow, handle)
		}
	}

	// always check the arrow parents
	reparentArrow(editor, arrow.id)
}

function unbindArrowTerminal(editor: Editor, arrow: TLArrowShape, terminal: 'start' | 'end') {
	const terminalPositions = getArrowTerminalsInArrowSpace(
		editor,
		arrow,
		getArrowBindings(editor, arrow)
	)
	const { x, y } = terminalPositions[terminal]
	editor.updateShape<TLArrowShape>({
		id: arrow.id,
		type: 'arrow',
		props: { [terminal]: { x, y } },
	})
	arrowBindingMakeItNotSo(editor, arrow, terminal)
}
