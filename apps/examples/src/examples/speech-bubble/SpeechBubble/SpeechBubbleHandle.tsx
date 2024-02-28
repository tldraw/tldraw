import { COARSE_HANDLE_RADIUS, HANDLE_RADIUS } from '@tldraw/editor/src/lib/constants'
import {
	TLClickEventInfo,
	WithPreventDefault,
} from '@tldraw/editor/src/lib/editor/types/event-types'
import {
	Circle2d,
	Control,
	ControlProps,
	Editor,
	SVGContainer,
	StateNode,
	TLPointerEventInfo,
	Vec,
} from '@tldraw/tldraw'
import { SpeechBubbleShape } from './SpeechBubbleUtil'

export function speechBubbleControl(editor: Editor) {
	// we only show the control in select.idle
	if (!editor.isInAny('select.idle', 'select.pointingSpeechBubble')) return null

	// it's only relevant when we have a single speech bubble shape selected
	const shape = editor.getOnlySelectedShape()
	if (!shape || !editor.isShapeOfType<SpeechBubbleShape>(shape, 'speech-bubble')) {
		return null
	}

	// return the control - this handles the actual interaction.
	return new SpeechBubbleControl(editor, shape)
}

class SpeechBubbleControl extends Control {
	constructor(
		editor: Editor,
		readonly shape: SpeechBubbleShape
	) {
		super(editor, 'speech-bubble-handle')
	}

	override getGeometry() {
		const radius = this.editor.getIsCoarsePointer() ? COARSE_HANDLE_RADIUS : HANDLE_RADIUS
		const tailInShapeSpace = {
			x: this.shape.props.tail.x * this.shape.props.w,
			y: this.shape.props.tail.y * this.shape.props.h,
		}

		const tailInPageSpace = this.editor
			.getShapePageTransform(this.shape)
			.applyToPoint(tailInShapeSpace)

		return Circle2d.fromCenter({
			...tailInPageSpace,
			radius: radius / this.editor.getZoomLevel(),
			isFilled: true,
		})
	}

	override component({ isHovered }: ControlProps) {
		const geom = this.getGeometry()
		const zoom = this.editor.getZoomLevel()

		return (
			<SVGContainer style={{ zIndex: 'var(--layer-overlays)' }}>
				{isHovered && (
					<circle
						cx={geom.center.x}
						cy={geom.center.y}
						r={geom.radius}
						style={{
							fill: 'var(--color-selection-fill)',
							// is this how we should handle cursors? it's hard because this overlaps
							// with the selection fg which uses css, but i'd rather a `getCursor`
							// sort of API.
							pointerEvents: 'all',
							cursor: 'var(--tl-cursor-grab)',
						}}
					/>
				)}
				<circle className="tl-handle__fg" cx={geom.center.x} cy={geom.center.y} r={4 / zoom} />
			</SVGContainer>
		)
	}

	override onPointerDown(info: WithPreventDefault<TLPointerEventInfo>): void {
		info.preventDefault()
		this.editor.root.transition('select.pointingSpeechBubbleTail', this.shape)
	}

	override onDoubleClick(info: WithPreventDefault<TLClickEventInfo>): void {
		if (info.phase !== 'up') return

		info.preventDefault()
		this.editor.updateShape({
			id: this.shape.id,
			type: 'speech-bubble',
			props: {
				tail: { x: 0.5, y: 1.5 },
			},
		})
	}
}

export class PointingSpeechBubble extends StateNode {
	override id = 'pointingSpeechBubbleTail'

	shape!: SpeechBubbleShape

	override onEnter = (shape: SpeechBubbleShape) => {
		this.shape = shape
	}

	override onPointerMove = () => {
		if (this.editor.inputs.isDragging) {
			this.editor.root.transition('select.draggingSpeechBubbleTail', this.shape)
		}
	}

	override onPointerUp = () => {
		this.onCancel()
	}

	override onCancel = () => {
		this.editor.root.transition('select.idle')
	}
}

export class DraggingSpeechBubble extends StateNode {
	override id = 'draggingSpeechBubbleTail'

	initialShape!: SpeechBubbleShape
	initialPageTailPoint!: Vec
	markId!: string

	// you can pass stuff to this i think? but it doesn't get typed. kinda tricky imo.
	override onEnter = (shape: SpeechBubbleShape) => {
		this.editor.mark('draggingSpeechBubbleTail')
		this.initialShape = shape
		const transform = this.editor.getShapePageTransform(shape)
		this.initialPageTailPoint = transform.applyToPoint({
			x: shape.props.tail.x * shape.props.w,
			y: shape.props.tail.y * shape.props.h,
		})
	}

	override onPointerMove = () => {
		const currentShape = this.editor.getShape<SpeechBubbleShape>(this.initialShape.id)
		if (!currentShape) return

		const delta = Vec.Sub(this.editor.inputs.currentPagePoint, this.editor.inputs.originPagePoint)
		const pageTailPoint = Vec.Add(this.initialPageTailPoint, delta)
		const shapeTailPoint = this.editor.getPointInShapeSpace(this.initialShape.id, pageTailPoint)

		this.editor.updateShape<SpeechBubbleShape>({
			id: this.initialShape.id,
			type: 'speech-bubble',
			props: {
				tail: {
					x: shapeTailPoint.x / currentShape.props.w,
					y: shapeTailPoint.y / currentShape.props.h,
				},
			},
		})
	}

	override onPointerUp = () => {
		this.editor.root.transition('select.idle')
	}

	override onCancel = () => {
		this.editor.root.transition('select.idle')
		this.editor.bailToMark('draggingSpeechBubbleTail')
	}
}
