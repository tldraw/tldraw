import {
	BaseBoxShapeUtil,
	BindingOnShapeChangeOptions,
	BindingUtil,
	Box,
	DefaultToolbar,
	DefaultToolbarContent,
	HTMLContainer,
	RecordProps,
	StateNode,
	T,
	TLBinding,
	TLPointerEventInfo,
	TLShape,
	TLShapeId,
	TLStateNodeConstructor,
	TLUiComponents,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuItem,
	Vec,
	VecModel,
	createShapeId,
	invLerp,
	lerp,
	maybeSnapToGrid,
	useIsToolSelected,
	useTools,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const STICKER_SIZE = 48

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		sticker: { w: number; h: number; emoji: string }
	}
	export interface TLGlobalBindingPropsMap {
		sticker: { anchor: VecModel }
	}
}

type StickerShape = TLShape<'sticker'>
type StickerBinding = TLBinding<'sticker'>

// [2]
class StickerShapeUtil extends BaseBoxShapeUtil<StickerShape> {
	static override type = 'sticker' as const
	static override props: RecordProps<StickerShape> = {
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		emoji: T.string,
	}

	override getDefaultProps() {
		return { w: STICKER_SIZE, h: STICKER_SIZE, emoji: '❤️' }
	}

	override canBind() {
		// stickers can bind to anything
		return true
	}
	override isAspectRatioLocked() {
		return true
	}

	// [3]
	override onTranslateStart(sticker: StickerShape) {
		const bindings = this.editor.getBindingsFromShape(sticker, 'sticker')
		this.editor.deleteBindings(bindings)
	}

	// [4]
	override onTranslateEnd(_initial: StickerShape, sticker: StickerShape) {
		const pageCenter = this.editor.getShapePageBounds(sticker)!.center
		const target = this.editor.getShapeAtPoint(pageCenter, {
			hitInside: true,
			filter: (shape) =>
				shape.type !== 'sticker' &&
				this.editor.canBindShapes({ fromShape: sticker, toShape: shape, binding: 'sticker' }),
		})

		if (!target) return

		const targetBounds = Box.ZeroFix(this.editor.getShapeGeometry(target).bounds)
		const pointInTargetSpace = this.editor.getPointInShapeSpace(target, pageCenter)

		const anchor = {
			x: invLerp(targetBounds.minX, targetBounds.maxX, pointInTargetSpace.x),
			y: invLerp(targetBounds.minY, targetBounds.maxY, pointInTargetSpace.y),
		}

		this.editor.createBinding({
			type: 'sticker',
			fromId: sticker.id,
			toId: target.id,
			props: { anchor },
		})
	}

	override component(shape: StickerShape) {
		return (
			<HTMLContainer
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: Math.min(shape.props.w, shape.props.h) * 0.8,
					lineHeight: 1,
					userSelect: 'none',
					pointerEvents: 'all',
				}}
			>
				{shape.props.emoji}
			</HTMLContainer>
		)
	}

	override getIndicatorPath(shape: StickerShape): Path2D {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

// [5]
class StickerBindingUtil extends BindingUtil<StickerBinding> {
	static override type = 'sticker' as const
	static override props: RecordProps<StickerBinding> = {
		anchor: T.object({ x: T.number, y: T.number }),
	}

	override getDefaultProps() {
		return { anchor: { x: 0.5, y: 0.5 } }
	}

	// when the shape we're stuck to changes, move the sticker along with it
	override onAfterChangeToShape({
		binding,
		shapeAfter,
	}: BindingOnShapeChangeOptions<StickerBinding>) {
		const sticker = this.editor.getShape<StickerShape>(binding.fromId)
		if (!sticker) return

		const targetBounds = Box.ZeroFix(this.editor.getShapeGeometry(shapeAfter).bounds)
		const pointInTargetSpace = {
			x: lerp(targetBounds.minX, targetBounds.maxX, binding.props.anchor.x),
			y: lerp(targetBounds.minY, targetBounds.maxY, binding.props.anchor.y),
		}
		const pageAnchor = this.editor
			.getShapePageTransform(shapeAfter)
			.applyToPoint(pointInTargetSpace)

		const stickerParentAnchor = this.editor
			.getShapeParentTransform(sticker)
			.invert()
			.applyToPoint(pageAnchor)

		this.editor.updateShape({
			id: sticker.id,
			type: 'sticker',
			x: stickerParentAnchor.x - sticker.props.w / 2,
			y: stickerParentAnchor.y - sticker.props.h / 2,
		})
	}
}

// [6]
class StickerIdle extends StateNode {
	static override id = 'idle'

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown(info: TLPointerEventInfo) {
		this.parent.transition('pointing', info)
	}

	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}

// [7]
class StickerPointing extends StateNode {
	static override id = 'pointing'

	shapeId = '' as TLShapeId
	markId = ''

	override onEnter() {
		const { editor } = this

		this.shapeId = createShapeId()
		this.markId = editor.markHistoryStoppingPoint(`creating_sticker:${this.shapeId}`)

		// center the sticker on the point where the user pressed
		const origin = editor.inputs.getOriginPagePoint()
		const point = maybeSnapToGrid(
			new Vec(origin.x - STICKER_SIZE / 2, origin.y - STICKER_SIZE / 2),
			editor
		)

		editor.createShape<StickerShape>({
			id: this.shapeId,
			type: 'sticker',
			x: point.x,
			y: point.y,
		})

		editor.select(this.shapeId)
	}

	// [a]
	override onPointerMove(info: TLPointerEventInfo) {
		if (this.editor.inputs.getIsDragging()) {
			this.editor.setCurrentTool('select.translating', {
				...info,
				target: 'shape',
				shape: this.editor.getShape(this.shapeId),
				isCreating: true,
				creatingMarkId: this.markId,
				onInteractionEnd: 'sticker',
			})
		}
	}

	override onPointerUp() {
		this.complete()
	}

	override onComplete() {
		this.complete()
	}

	override onCancel() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	private complete() {
		if (this.editor.getInstanceState().isToolLocked) {
			this.parent.transition('idle')
		} else {
			this.editor.setCurrentTool('select')
		}
	}

	private cancel() {
		this.editor.bailToMark(this.markId)
		this.parent.transition('idle')
	}
}

class StickerTool extends StateNode {
	static override id = 'sticker'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [StickerIdle, StickerPointing]
	}
	override shapeType = 'sticker'
}

// [8]
const overrides: TLUiOverrides = {
	tools(editor, schema) {
		schema['sticker'] = {
			id: 'sticker',
			label: 'Sticker',
			icon: 'heart-icon',
			kbd: 'p',
			onSelect: () => {
				editor.setCurrentTool('sticker')
			},
		}
		return schema
	},
}

const components: TLUiComponents = {
	Toolbar: (props) => {
		const sticker = useTools().sticker
		const isStickerSelected = useIsToolSelected(sticker)
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...sticker} isSelected={isStickerSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
}

export default function StickerExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={[StickerShapeUtil]}
				bindingUtils={[StickerBindingUtil]}
				tools={[StickerTool]}
				overrides={overrides}
				components={components}
			/>
		</div>
	)
}

/*
Introduction:

This example shows how to build a sticker: a custom shape with its own tool that
can be stuck onto other shapes. When a sticker is dropped on another shape, a
binding is created between them, so the sticker follows the shape around the
canvas. It brings together three of the main ways to extend tldraw: a custom
shape (ShapeUtil), a custom tool (StateNode), and a custom binding (BindingUtil).

[1]
Custom shape and binding props are registered by augmenting the
TLGlobalShapePropsMap and TLGlobalBindingPropsMap interfaces. This gives us
fully typed TLShape<'sticker'> and TLBinding<'sticker'> types. The binding
stores an anchor: the sticker's position on the target shape, normalized to the
range 0-1 in both dimensions, so it stays in the same relative place when the
target resizes.

[2]
The sticker shape is a simple box shape that renders an emoji. BaseBoxShapeUtil
gives us geometry and resizing behavior for free; we lock the aspect ratio so
stickers stay square. `canBind` lets stickers take part in bindings with any
other shape.

[3]
When a sticker starts being dragged, we remove any existing sticker bindings.
This detaches it from its current target so that dragging it off a shape (or
onto a different one) behaves as expected.

[4]
When the drag ends, we look for a shape under the center of the sticker. We use
`getShapeAtPoint` with `hitInside` so that hovering anywhere over a filled or
hollow shape counts, and we filter out other stickers and anything we can't
bind to. If we find a target, we compute the anchor point in the target's
coordinate space and create the binding.

[5]
The binding util's `onAfterChangeToShape` runs whenever the bound-to shape
changes: moving, resizing, or rotating it. We compute the anchor's position in
page space, convert it into the sticker's parent space, and move the sticker so
it stays centered on its anchor point.

[6]
The sticker tool is a state machine with two child states, idle and pointing.
The idle state waits with a crosshair cursor and transitions to pointing on
pointer down.

[7]
The pointing state creates the sticker immediately, centered on the pointer
(snapped to the grid if grid mode is on). We mark a history stopping point
first so the whole interaction can be undone (or cancelled) as one step.

	[a] If the user drags before releasing, we hand off to the select tool's
	translating state, so the new sticker can be dragged into place in one
	continuous gesture. `onInteractionEnd` returns us to the sticker tool when
	the drag finishes, and dropping the sticker on a shape triggers
	`onTranslateEnd`, binding it to its target.

[8]
Finally, we add the sticker tool to the toolbar: an override registers the tool
so the UI knows about it, and a custom Toolbar component renders it alongside
the default toolbar content.
*/
