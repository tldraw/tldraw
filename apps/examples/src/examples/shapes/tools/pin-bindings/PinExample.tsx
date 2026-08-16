import {
	BindingOnShapeChangeOptions,
	BindingOnShapeDeleteOptions,
	BindingUtil,
	Box,
	DefaultFillStyle,
	DefaultToolbar,
	DefaultToolbarContent,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	StateNode,
	TLBinding,
	TLComponents,
	TLPointerEventInfo,
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLShapeUtilCanBindOpts,
	TLUiAssetUrlOverrides,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	Vec,
	VecModel,
	createShapeId,
	invLerp,
	lerp,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const PIN_TYPE = 'pin'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[PIN_TYPE]: Record<string, never>
	}
}

type PinShape = TLShape<typeof PIN_TYPE>

const offsetX = -16
const offsetY = -26

// [1]
class PinShapeUtil extends ShapeUtil<PinShape> {
	static override type = PIN_TYPE
	static override props: RecordProps<PinShape> = {}

	override getDefaultProps() {
		return {}
	}

	// [2]
	override canBind({ toShape, bindingType }: TLShapeUtilCanBindOpts<PinShape>) {
		if (bindingType === PIN_TYPE) {
			return toShape.type !== PIN_TYPE
		}
		return true
	}
	override canEdit(shape: PinShape) {
		return false
	}
	override canResize(shape: PinShape) {
		return false
	}
	override hideRotateHandle(shape: PinShape) {
		return true
	}
	override isAspectRatioLocked() {
		return true
	}

	override getGeometry() {
		return new Rectangle2d({
			width: 32,
			height: 32,
			x: offsetX,
			y: offsetY,
			isFilled: true,
		})
	}

	override component() {
		return (
			<div
				style={{
					width: '100%',
					height: '100%',
					marginLeft: offsetX,
					marginTop: offsetY,
					fontSize: '26px',
					textAlign: 'center',
				}}
			>
				📍
			</div>
		)
	}

	override getIndicatorPath() {
		const path = new Path2D()
		path.rect(offsetX, offsetY, 32, 32)
		return path
	}

	// [3]
	override onTranslateStart(shape: PinShape) {
		const bindings = this.editor.getBindingsFromShape(shape, PIN_TYPE)
		this.editor.deleteBindings(bindings)
	}

	override onTranslateEnd(_initial: PinShape, pin: PinShape) {
		const pageAnchor = this.editor.getShapePageTransform(pin).applyToPoint({ x: 0, y: 0 })

		const targets = this.editor
			.getShapesAtPoint(pageAnchor, { hitInside: true })
			.filter(
				(shape) =>
					this.editor.canBindShapes({ fromShape: pin, toShape: shape, binding: PIN_TYPE }) &&
					shape.parentId === pin.parentId &&
					shape.index < pin.index
			)

		for (const target of targets) {
			const targetBounds = Box.ZeroFix(this.editor.getShapeGeometry(target)!.bounds)
			const pointInTargetSpace = this.editor.getPointInShapeSpace(target, pageAnchor)

			const anchor = {
				x: invLerp(targetBounds.minX, targetBounds.maxX, pointInTargetSpace.x),
				y: invLerp(targetBounds.minY, targetBounds.maxY, pointInTargetSpace.y),
			}

			this.editor.createBinding({
				type: PIN_TYPE,
				fromId: pin.id,
				toId: target.id,
				props: {
					anchor,
				},
			})
		}
	}
}

declare module 'tldraw' {
	export interface TLGlobalBindingPropsMap {
		[PIN_TYPE]: {
			anchor: VecModel
		}
	}
}

type PinBinding = TLBinding<typeof PIN_TYPE>

class PinBindingUtil extends BindingUtil<PinBinding> {
	static override type = PIN_TYPE

	override getDefaultProps() {
		return {
			anchor: { x: 0.5, y: 0.5 },
		}
	}

	private changedToShapes = new Set<TLShapeId>()

	// [4]
	override onOperationComplete(): void {
		if (this.changedToShapes.size === 0) return

		const fixedShapes = this.changedToShapes
		const toCheck = [...this.changedToShapes]

		const initialPositions = new Map<TLShapeId, VecModel>()
		const targetDeltas = new Map<TLShapeId, Map<TLShapeId, VecModel>>()

		const addTargetDelta = (fromId: TLShapeId, toId: TLShapeId, delta: VecModel) => {
			if (!targetDeltas.has(fromId)) targetDeltas.set(fromId, new Map())
			targetDeltas.get(fromId)!.set(toId, delta)

			if (!targetDeltas.has(toId)) targetDeltas.set(toId, new Map())
			targetDeltas.get(toId)!.set(fromId, { x: -delta.x, y: -delta.y })
		}

		const allShapes = new Set<TLShapeId>()
		while (toCheck.length) {
			const shapeId = toCheck.pop()!

			const shape = this.editor.getShape(shapeId)
			if (!shape) continue

			if (allShapes.has(shapeId)) continue
			allShapes.add(shapeId)

			const bindings = this.editor.getBindingsToShape(shape, PIN_TYPE)
			for (const binding of bindings) {
				if (allShapes.has(binding.fromId)) continue
				allShapes.add(binding.fromId)

				const pin = this.editor.getShape<PinShape>(binding.fromId)
				if (!pin) continue

				const pinPosition = this.editor.getShapePageTransform(pin).applyToPoint({ x: 0, y: 0 })
				initialPositions.set(pin.id, pinPosition)

				for (const binding of this.editor.getBindingsFromShape(pin.id, PIN_TYPE)) {
					const shapeBounds = this.editor.getShapeGeometry(binding.toId)!.bounds
					const shapeAnchor = {
						x: lerp(shapeBounds.minX, shapeBounds.maxX, binding.props.anchor.x),
						y: lerp(shapeBounds.minY, shapeBounds.maxY, binding.props.anchor.y),
					}
					const currentPageAnchor = this.editor
						.getShapePageTransform(binding.toId)
						.applyToPoint(shapeAnchor)

					const shapeOrigin = this.editor
						.getShapePageTransform(binding.toId)
						.applyToPoint({ x: 0, y: 0 })
					initialPositions.set(binding.toId, shapeOrigin)

					addTargetDelta(pin.id, binding.toId, {
						x: currentPageAnchor.x - shapeOrigin.x,
						y: currentPageAnchor.y - shapeOrigin.y,
					})

					if (!allShapes.has(binding.toId)) toCheck.push(binding.toId)
				}
			}
		}

		// [5]
		const currentPositions = new Map(initialPositions)

		const iterations = 30
		for (let i = 0; i < iterations; i++) {
			const movements = new Map<TLShapeId, VecModel[]>()
			for (const [aId, deltas] of targetDeltas) {
				if (fixedShapes.has(aId)) continue
				const aPosition = currentPositions.get(aId)!
				for (const [bId, targetDelta] of deltas) {
					const bPosition = currentPositions.get(bId)!

					const adjustmentDelta = {
						x: targetDelta.x - (aPosition.x - bPosition.x),
						y: targetDelta.y - (aPosition.y - bPosition.y),
					}

					if (!movements.has(aId)) movements.set(aId, [])
					movements.get(aId)!.push(adjustmentDelta)
				}
			}

			for (const [shapeId, deltas] of movements) {
				const currentPosition = currentPositions.get(shapeId)!
				currentPositions.set(shapeId, Vec.Average(deltas).add(currentPosition))
			}
		}

		const updates: TLShapePartial[] = []
		for (const [shapeId, position] of currentPositions) {
			const delta = Vec.Sub(position, initialPositions.get(shapeId)!)
			if (delta.len2() <= 0.01) continue

			const newPosition = this.editor.getPointInParentSpace(shapeId, position)
			updates.push({
				...this.editor.getShape(shapeId)!,
				id: shapeId,
				x: newPosition.x,
				y: newPosition.y,
			})
		}

		if (updates.length === 0) {
			this.changedToShapes.clear()
		} else {
			this.editor.updateShapes(updates)
		}
	}

	// [6]
	override onAfterChangeToShape({
		binding,
		shapeAfter,
	}: BindingOnShapeChangeOptions<PinBinding>): void {
		this.changedToShapes.add(binding.toId)
		const pin = this.editor.getShape(binding.fromId)
		if (!pin) return

		if (pin.parentId !== shapeAfter.parentId) {
			this.editor.reparentShapes([pin.id], shapeAfter.parentId)
		}
	}

	override onBeforeDeleteToShape({ binding }: BindingOnShapeDeleteOptions<PinBinding>): void {
		this.editor.deleteShape(binding.fromId)
	}
}

// [7]
class PinTool extends StateNode {
	static override id = PIN_TYPE

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown(info: TLPointerEventInfo) {
		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()
		const pinId = createShapeId()
		this.editor.markHistoryStoppingPoint()
		this.editor.createShape({
			id: pinId,
			type: PIN_TYPE,
			x: currentPagePoint.x,
			y: currentPagePoint.y,
		})
		this.editor.setSelectedShapes([pinId])
		this.editor.setCurrentTool('select.translating', {
			...info,
			target: 'shape',
			shape: this.editor.getShape(pinId),
			isCreating: true,
			onInteractionEnd: 'pin',
			onCreate: () => {
				this.editor.setCurrentTool('pin')
			},
		})
	}
}

const overrides: TLUiOverrides = {
	tools(editor, schema) {
		schema['pin'] = {
			id: 'pin',
			label: 'Pin',
			icon: 'heart-icon',
			kbd: 'p',
			onSelect: () => {
				editor.setCurrentTool('pin')
			},
		}
		return schema
	},
}

const assetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'heart-icon': '/heart-icon.svg',
	},
}

const components: TLComponents = {
	Toolbar: (...props) => {
		const pin = useTools().pin
		const isPinSelected = useIsToolSelected(pin)
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...pin} isSelected={isPinSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}

const shapeUtils = [PinShapeUtil]
const bindingUtils = [PinBindingUtil]
const tools = [PinTool]

export default function PinExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="pin-example"
				onMount={(editor) => {
					editor.setStyleForNextShapes(DefaultFillStyle, 'semi')
				}}
				shapeUtils={shapeUtils}
				bindingUtils={bindingUtils}
				tools={tools}
				overrides={overrides}
				assetUrls={assetUrls}
				components={components}
			/>
		</div>
	)
}

/*
Introduction:

A pin is a small shape that, when dropped over other shapes, creates a `pin` binding from
itself to each shape underneath. When any pinned shape moves, the binding util moves the rest
of the network so every pin stays at the same relative spot on each shape it's stuck to.

[1]
The pin shape has no props. Its geometry and indicator are offset so the pin's origin (0,0)
sits at the tip of the emoji, which is the point that gets bound to other shapes.

[2]
`canBind` is asked for every binding that would touch this shape. Pins can't be pinned to
other pins, but they can still be the target of other binding types (e.g. arrows).

[3]
Dragging a pin unpins it: `onTranslateStart` removes its bindings. On `onTranslateEnd` we look
at every shape under the pin's tip (excluding shapes above the pin in z-order and shapes in a
different parent) and create a binding to each, storing the pin's position as a normalized
anchor inside the target's bounds so it survives resizing.

[4]
`onAfterChangeToShape` fires once per changed shape, but a network may involve many shapes
changing in one operation. We only record which target shapes changed and do the real work in
`onOperationComplete`, which runs once after the whole operation, so the network is solved
once rather than once per shape.

[5]
Solving the network: walk out from the changed shapes across pin bindings to gather every
connected shape and the page-space delta each pin should have from each shape it's stuck to.
Changed shapes are fixed; everything else is relaxed toward its target deltas over a few
iterations (a simple constraint solver). Shapes that ended up moving get one `updateShapes`
call, which itself triggers `onAfterChangeToShape` and another `onOperationComplete` pass; the
`changedToShapes` set is cleared only when a pass produces no movement, so this settles.

[6]
A reparented pinned shape takes its pin with it so both stay in one coordinate space; a deleted
one takes its pin too.

[7]
The pin tool creates a pin at the pointer and immediately hands off to the select tool's
translating state, so the pin follows the pointer until pointer up. `onInteractionEnd: 'pin'`
masks the current tool id as 'pin' during the drag (and returns to the pin tool afterwards when
the tool is locked); `onTranslateEnd` in the shape util does the binding.
*/
