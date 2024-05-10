import {
	BindingOnChangeOptions,
	BindingOnCreateOptions,
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
	Editor,
	Mat,
	TLShapeId,
	TLTextBinding,
	TLTextBindingProps,
	TLTextShape,
	Vec,
	approximately,
	getIndexAbove,
	getIndexBetween,
	textBindingMigrations,
	textBindingProps,
} from '@tldraw/editor'

export class TextBindingUtil extends BindingUtil<TLTextBinding> {
	static override type = 'text'

	static override props = textBindingProps
	static override migrations = textBindingMigrations

	override getDefaultProps(): Partial<TLTextBindingProps> {
		return {
			x: { type: 'center' },
			y: { type: 'center' },
		}
	}

	// when the binding itself changes
	override onAfterCreate({ binding }: BindingOnCreateOptions<TLTextBinding>): void {
		makeTextGood(this.editor, binding.fromId)
	}

	// when the binding itself changes
	override onAfterChange({ bindingAfter }: BindingOnChangeOptions<TLTextBinding>): void {
		makeTextGood(this.editor, bindingAfter.fromId)
	}

	// when the text itself changes
	override onAfterChangeFromShape({
		shapeBefore,
		shapeAfter,
		binding,
	}: BindingOnShapeChangeOptions<TLTextBinding>): void {
		if (
			!this.editor.isIn('select.translating') ||
			!this.editor.getSelectedShapeIds().includes(shapeAfter.id)
		)
			return
		const edgeSlop = 25
		if (shapeBefore.x !== shapeAfter.x || shapeBefore.y !== shapeAfter.y) {
			const textShapeTransform = this.editor.getShapePageTransform(shapeAfter)
			const textShapeCornersInToShapeSpace = Mat.applyToPoints(
				textShapeTransform,
				this.editor.getShapeGeometry(shapeAfter).bounds.cornersAndCenter
			).map((p) => this.editor.getPointInShapeSpace(binding.toId, p))
			const toShapeBounds = this.editor.getShapeGeometry(binding.toId).bounds
			const left = textShapeCornersInToShapeSpace[0].x
			const top = textShapeCornersInToShapeSpace[0].y
			const right = textShapeCornersInToShapeSpace[2].x
			const bottom = textShapeCornersInToShapeSpace[2].y
			const textShapeCenterInToShapeSpace = textShapeCornersInToShapeSpace.pop()!
			const toShapeCenter = this.editor.getShapeGeometry(binding.toId).bounds.center
			{
				// do x
				const dist = Math.abs(textShapeCenterInToShapeSpace.x - toShapeCenter.x)
				const distInScreenSpace = dist / this.editor.getZoomLevel()

				if (distInScreenSpace > 10) {
					const wasRight = binding.props.x.type === 'offset' && binding.props.x.edge === 'right'
					const overrideRight = right > toShapeBounds.maxX - edgeSlop
					const overrideLeft = left < toShapeBounds.minX + edgeSlop
					this.editor.updateBinding({
						...binding,
						props: {
							...binding.props,
							x:
								(wasRight && !overrideLeft) || overrideRight
									? {
											type: 'offset',
											edge: 'right',
											offsetInToShapeSpace: toShapeBounds.maxX - right,
										}
									: {
											type: 'offset',
											edge: 'left',
											offsetInToShapeSpace: left - toShapeBounds.minX,
										},
						},
					})

					this.editor.updateShape({
						id: binding.fromId,
						type: 'text',
						props: { textAlign: (wasRight && !overrideLeft) || overrideRight ? 'end' : 'start' },
					})
				} else {
					this.editor.updateBinding({
						...binding,
						props: {
							...binding.props,
							x: { type: 'center' },
						},
					})
					this.editor.updateShape({
						id: binding.fromId,
						type: 'text',
						props: { textAlign: 'middle' },
					})
				}
				binding = this.editor.getBinding(binding.id) as TLTextBinding
			}
			{
				// do y
				const dist = Math.abs(textShapeCenterInToShapeSpace.y - toShapeCenter.y)
				const distInScreenSpace = dist / this.editor.getZoomLevel()
				if (distInScreenSpace > 10) {
					const wasBottom = binding.props.y.type === 'offset' && binding.props.y.edge === 'bottom'
					const overrideBottom = bottom > toShapeBounds.maxY - edgeSlop
					const overrideTop = top < toShapeBounds.minY + edgeSlop
					this.editor.updateBinding({
						...binding,
						props: {
							...binding.props,
							y:
								(wasBottom && !overrideTop) || overrideBottom
									? {
											type: 'offset',
											edge: 'bottom',
											offsetInToShapeSpace: toShapeBounds.maxY - bottom,
										}
									: { type: 'offset', edge: 'top', offsetInToShapeSpace: top - toShapeBounds.minY },
						},
					})
				} else {
					this.editor.updateBinding({
						...binding,
						props: {
							...binding.props,
							y: { type: 'center' },
						},
					})
				}
				binding = this.editor.getBinding(binding.id) as TLTextBinding
			}
		}
		makeTextGood(this.editor, shapeAfter.id)
	}

	// when the shape an text is bound to changes
	override onAfterChangeToShape({ binding }: BindingOnShapeChangeOptions<TLTextBinding>): void {
		makeTextGood(this.editor, binding.fromId)
	}

	// when the shape the text is pointing to is deleted
	override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<TLTextBinding>): void {
		const text = this.editor.getShape<TLTextShape>(binding.fromId)
		if (!text) return
		this.editor.deleteShape(text.id)
	}
}

function makeTextGood(editor: Editor, textId: TLShapeId) {
	const textShape = editor.getShape<TLTextShape>(textId)
	if (!textShape) return
	const bindings = editor.getBindingsFromShape<TLTextBinding>(textId, 'text')
	if (!bindings.length) return
	if (bindings.length > 1) {
		editor.deleteBindings(bindings.slice(1))
	}

	const binding = bindings[0]

	// need to make sure this text is directly above the shape it is bound to and bound to the same parent
	const boundShape = editor.getShape(bindings[0].toId)
	if (!boundShape) return

	const siblings = editor.getSortedChildIdsForParent(boundShape.parentId)
	const fromIndex = boundShape.index
	const nextSiblingId = siblings[siblings.findIndex((id) => id === boundShape.id) + 1]

	if (textShape.parentId !== boundShape.parentId) {
		const toIndex = nextSiblingId ? editor.getShape(nextSiblingId)?.index : undefined
		editor.updateShape({
			...textShape,
			parentId: boundShape.parentId,
			index: getIndexBetween(fromIndex, toIndex),
		})
		return
	}

	if (!nextSiblingId) {
		editor.updateShape({ ...textShape, index: getIndexAbove(fromIndex) })
		return
	}
	if (textShape.index < fromIndex) {
		const toIndex = editor.getShape(nextSiblingId)?.index
		editor.updateShape({ ...textShape, index: getIndexBetween(fromIndex, toIndex) })
		return
	}

	if (textShape.rotation !== boundShape.rotation) {
		editor.updateShape({ ...textShape, rotation: boundShape.rotation })
		return
	}

	if (binding.props.x.type === 'center' && textShape.props.textAlign !== 'middle') {
		editor.updateShape({ ...textShape, props: { ...textShape.props, textAlign: 'middle' } })
		return
	}

	// position the text shape
	const textBounds = editor.getShapeGeometry(textShape).bounds
	const geoBounds = editor.getShapeGeometry(boundShape).bounds

	const offset = Vec.Sub(geoBounds.center, new Vec(textBounds.width / 2, textBounds.height / 2))
	if (binding.props.x.type === 'offset') {
		if (binding.props.x.edge === 'right') {
			offset.x = geoBounds.maxX - binding.props.x.offsetInToShapeSpace - textBounds.width
		} else {
			offset.x = geoBounds.minX + binding.props.x.offsetInToShapeSpace
		}
	}
	if (binding.props.y.type === 'offset') {
		if (binding.props.y.edge === 'bottom') {
			offset.y = geoBounds.maxY - binding.props.y.offsetInToShapeSpace - textBounds.height
		} else {
			offset.y = geoBounds.minY + binding.props.y.offsetInToShapeSpace
		}
	}

	const geoTransform = editor.getShapePageTransform(boundShape)

	const { x, y } = editor.getPointInParentSpace(boundShape, Mat.applyToPoint(geoTransform, offset))

	if (!approximately(textShape.x, x) || !approximately(textShape.y, y)) {
		editor.updateShape({ ...textShape, x, y })
	}
}
