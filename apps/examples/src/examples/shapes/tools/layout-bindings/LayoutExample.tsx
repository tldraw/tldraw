import {
	BindingOnChangeOptions,
	BindingOnCreateOptions,
	BindingOnDeleteOptions,
	BindingOnShapeChangeOptions,
	BindingUtil,
	HTMLContainer,
	IndexKey,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLBinding,
	TLShape,
	TLShapeUtilCanBindOpts,
	TLStoreSnapshot,
	Tldraw,
	Vec,
	clamp,
	getIndexBetween,
} from 'tldraw'
import 'tldraw/tldraw.css'
import snapshot from './snapshot.json'

// There's a guide at the bottom of this file!

const CONTAINER_TYPE = 'container'
const ELEMENT_TYPE = 'element'
const LAYOUT_TYPE = 'layout'
const ELEMENT_SIZE = 100
const CONTAINER_PADDING = 24

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[CONTAINER_TYPE]: { height: number; width: number }
		[ELEMENT_TYPE]: { color: string }
	}
}

// [1]
type ContainerShape = TLShape<typeof CONTAINER_TYPE>

class ContainerShapeUtil extends ShapeUtil<ContainerShape> {
	static override type = CONTAINER_TYPE
	static override props: RecordProps<ContainerShape> = { height: T.number, width: T.number }

	override getDefaultProps() {
		return {
			width: ELEMENT_SIZE + CONTAINER_PADDING * 2,
			height: ELEMENT_SIZE + CONTAINER_PADDING * 2,
		}
	}

	// [2]
	override canBind({ fromShape, toShape, bindingType }: TLShapeUtilCanBindOpts<ContainerShape>) {
		return (
			fromShape.type === CONTAINER_TYPE &&
			toShape.type === ELEMENT_TYPE &&
			bindingType === LAYOUT_TYPE
		)
	}
	override canEdit(shape: ContainerShape) {
		return false
	}
	override canResize(shape: ContainerShape) {
		return false
	}
	override hideRotateHandle(shape: ContainerShape) {
		return true
	}
	override isAspectRatioLocked(shape: ContainerShape) {
		return true
	}

	override getGeometry(shape: ContainerShape) {
		return new Rectangle2d({
			width: shape.props.width,
			height: shape.props.height,
			isFilled: true,
		})
	}

	override component(shape: ContainerShape) {
		return (
			<HTMLContainer
				style={{
					backgroundColor: '#efefef',
					width: shape.props.width,
					height: shape.props.height,
				}}
			/>
		)
	}

	override getIndicatorPath(shape: ContainerShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.width, shape.props.height)
		return path
	}
}

type ElementShape = TLShape<typeof ELEMENT_TYPE>

class ElementShapeUtil extends ShapeUtil<ElementShape> {
	static override type = ELEMENT_TYPE
	static override props: RecordProps<ElementShape> = {
		color: T.string,
	}

	override getDefaultProps() {
		return {
			color: '#AEC6CF',
		}
	}

	override canBind({ fromShape, toShape, bindingType }: TLShapeUtilCanBindOpts<ElementShape>) {
		return (
			fromShape.type === CONTAINER_TYPE &&
			toShape.type === ELEMENT_TYPE &&
			bindingType === LAYOUT_TYPE
		)
	}
	override canEdit(shape: ElementShape) {
		return false
	}
	override canResize(shape: ElementShape) {
		return false
	}
	override hideRotateHandle(shape: ElementShape) {
		return true
	}
	override isAspectRatioLocked(shape: ElementShape) {
		return true
	}

	override getGeometry() {
		return new Rectangle2d({
			width: ELEMENT_SIZE,
			height: ELEMENT_SIZE,
			isFilled: true,
		})
	}

	override component(shape: ElementShape) {
		return <HTMLContainer style={{ backgroundColor: shape.props.color }}></HTMLContainer>
	}

	override getIndicatorPath() {
		const path = new Path2D()
		path.rect(0, 0, ELEMENT_SIZE, ELEMENT_SIZE)
		return path
	}

	private getElementCenter(shape: ElementShape) {
		return this.editor
			.getShapePageTransform(shape)
			.applyToPoint({ x: ELEMENT_SIZE / 2, y: ELEMENT_SIZE / 2 })
	}

	private getTargetContainer(shape: ElementShape, pageAnchor: Vec) {
		return this.editor.getShapeAtPoint(pageAnchor, {
			hitInside: true,
			filter: (otherShape) =>
				this.editor.canBindShapes({ fromShape: otherShape, toShape: shape, binding: LAYOUT_TYPE }),
		}) as ContainerShape | undefined
	}

	// [3]
	private getBindingIndexForPosition(
		shape: ElementShape,
		container: ContainerShape,
		pageAnchor: Vec
	) {
		const allBindings = this.editor
			.getBindingsFromShape(container, LAYOUT_TYPE)
			.sort((a, b) => (a.props.index > b.props.index ? 1 : -1))

		const siblings = allBindings.filter((b) => b.toId !== shape.id)

		// Which slot is the element's center closest to?
		const order = clamp(
			Math.round(
				(pageAnchor.x - container.x - CONTAINER_PADDING) / (ELEMENT_SIZE + CONTAINER_PADDING)
			),
			0,
			siblings.length + 1
		)

		const belowSib = allBindings[order - 1]
		const aboveSib = allBindings[order]
		let index: IndexKey

		if (belowSib?.toId === shape.id) {
			index = belowSib.props.index
		} else if (aboveSib?.toId === shape.id) {
			index = aboveSib.props.index
		} else {
			index = getIndexBetween(belowSib?.props.index, aboveSib?.props.index)
		}

		return index
	}

	// [4]
	override onTranslateStart(shape: ElementShape) {
		this.editor.updateBindings(
			this.editor.getBindingsToShape(shape, LAYOUT_TYPE).map((binding) => ({
				...binding,
				props: { ...binding.props, placeholder: true },
			}))
		)
	}

	override onTranslate(_: ElementShape, shape: ElementShape) {
		const pageAnchor = this.getElementCenter(shape)
		const targetContainer = this.getTargetContainer(shape, pageAnchor)

		if (!targetContainer) {
			this.editor.deleteBindings(this.editor.getBindingsToShape(shape, LAYOUT_TYPE))
			return
		}

		const index = this.getBindingIndexForPosition(shape, targetContainer, pageAnchor)

		const existingBinding = this.editor
			.getBindingsFromShape(targetContainer, LAYOUT_TYPE)
			.find((b) => b.toId === shape.id)

		if (existingBinding) {
			if (existingBinding.props.index === index) return
			this.editor.updateBinding({
				...existingBinding,
				props: {
					...existingBinding.props,
					placeholder: true,
					index,
				},
			})
		} else {
			this.editor.createBinding({
				type: LAYOUT_TYPE,
				fromId: targetContainer.id,
				toId: shape.id,
				props: {
					index,
					placeholder: true,
				},
			})
		}
	}

	// [5]
	override onTranslateEnd(_: ElementShape, shape: ElementShape) {
		const pageAnchor = this.getElementCenter(shape)
		const targetContainer = this.getTargetContainer(shape, pageAnchor)
		if (!targetContainer) return

		const index = this.getBindingIndexForPosition(shape, targetContainer, pageAnchor)

		this.editor.deleteBindings(this.editor.getBindingsToShape(shape, LAYOUT_TYPE))
		this.editor.createBinding({
			type: LAYOUT_TYPE,
			fromId: targetContainer.id,
			toId: shape.id,
			props: {
				index,
				placeholder: false,
			},
		})
	}
}

// [6]
declare module 'tldraw' {
	export interface TLGlobalBindingPropsMap {
		[LAYOUT_TYPE]: {
			index: IndexKey
			placeholder: boolean
		}
	}
}

type LayoutBinding = TLBinding<typeof LAYOUT_TYPE>

class LayoutBindingUtil extends BindingUtil<LayoutBinding> {
	static override type = LAYOUT_TYPE

	override getDefaultProps() {
		return {
			index: 'a1' as IndexKey,
			placeholder: true,
		}
	}

	override onAfterCreate({ binding }: BindingOnCreateOptions<LayoutBinding>): void {
		this.updateElementsForContainer(binding)
	}

	override onAfterChange({ bindingAfter }: BindingOnChangeOptions<LayoutBinding>): void {
		this.updateElementsForContainer(bindingAfter)
	}

	override onAfterChangeFromShape({ binding }: BindingOnShapeChangeOptions<LayoutBinding>): void {
		this.updateElementsForContainer(binding)
	}

	override onAfterDelete({ binding }: BindingOnDeleteOptions<LayoutBinding>): void {
		this.updateElementsForContainer(binding)
	}

	// [7]
	private updateElementsForContainer({
		props: { placeholder },
		fromId: containerId,
		toId,
	}: LayoutBinding) {
		const container = this.editor.getShape<ContainerShape>(containerId)
		if (!container) return

		const bindings = this.editor
			.getBindingsFromShape(container, LAYOUT_TYPE)
			.sort((a, b) => (a.props.index > b.props.index ? 1 : -1))
		if (bindings.length === 0) return

		for (let i = 0; i < bindings.length; i++) {
			const binding = bindings[i]

			// The element being dragged keeps following the pointer; only its slot is reserved
			if (toId === binding.toId && placeholder) continue

			const offset = new Vec(
				CONTAINER_PADDING + i * (ELEMENT_SIZE + CONTAINER_PADDING),
				CONTAINER_PADDING
			)

			const shape = this.editor.getShape<ElementShape>(binding.toId)
			if (!shape) continue

			const point = this.editor.getPointInParentSpace(
				shape,
				this.editor.getShapePageTransform(container)!.applyToPoint(offset)
			)

			if (shape.x !== point.x || shape.y !== point.y) {
				this.editor.updateShape({
					id: binding.toId,
					type: ELEMENT_TYPE,
					x: point.x,
					y: point.y,
				})
			}
		}

		const width =
			CONTAINER_PADDING +
			(bindings.length * ELEMENT_SIZE + (bindings.length - 1) * CONTAINER_PADDING) +
			CONTAINER_PADDING

		const height = CONTAINER_PADDING + ELEMENT_SIZE + CONTAINER_PADDING

		if (width !== container.props.width || height !== container.props.height) {
			this.editor.updateShape({
				id: container.id,
				type: CONTAINER_TYPE,
				props: { width, height },
			})
		}
	}
}

const shapeUtils = [ContainerShapeUtil, ElementShapeUtil]
const bindingUtils = [LayoutBindingUtil]

export default function LayoutExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				snapshot={snapshot as unknown as TLStoreSnapshot}
				shapeUtils={shapeUtils}
				bindingUtils={bindingUtils}
			/>
		</div>
	)
}

/*
Introduction:

A container shape lays out element shapes in a row. The relationship between a container and
each element is a `layout` binding whose `index` prop is a fractional index giving the
element's position in the row. The binding util reacts to changes by re-laying-out the row.

[1]
The container has no children in the tldraw parent/child sense; the elements stay on the page
and are related to it only through bindings. Its size is derived from how many bindings it has.

[2]
`canBind` on both shapes only allows `layout` bindings from a container to an element. The
element util's translate handlers use `editor.canBindShapes` (which consults both sides) to
find drop targets, so this is the single source of truth for what can go where.

[3]
Turn a drop position into a fractional index: work out which slot the element's center is
nearest, then use `getIndexBetween` on the neighbouring bindings. Reusing the element's own
index when it hasn't moved slots avoids churning bindings while dragging.

[4]
While an element is being dragged its binding is marked `placeholder`, which tells the layout
to reserve the slot but not snap the element into it, so it keeps following the pointer.
`onTranslate` moves the placeholder between containers and slots as the pointer moves.

[5]
On drop, replace whatever bindings the element has with a single non-placeholder binding to
the container under it. Creating the binding triggers `onAfterCreate`, which snaps the element
into place.

[6]
The binding props: `index` orders the elements, `placeholder` marks an in-progress drag.

[7]
Every binding lifecycle hook that can affect a row (create, change, container moved, delete)
runs the same layout: position each bound element in its slot and resize the container to fit.
Comparing before updating keeps this idempotent so it doesn't loop.
*/
