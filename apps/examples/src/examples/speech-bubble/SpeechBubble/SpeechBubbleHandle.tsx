import { HandleControl, StateNode, Vec, track, useEditor } from '@tldraw/tldraw'
import { SpeechBubbleShape } from './SpeechBubbleUtil'

export const SpeechBubbleHandle = track(function SpeechBubbleHandle() {
	const editor = useEditor()

	if (!editor.isInAny('select.idle')) {
		return null
	}

	const shape = editor.getOnlySelectedShape()
	if (!shape || !editor.isShapeOfType<SpeechBubbleShape>(shape, 'speech-bubble')) {
		return null
	}

	const transform = editor.getShapePageTransform(shape)
	const localPosition = new Vec(
		shape.props.tail.x * shape.props.w,
		shape.props.tail.y * shape.props.h
	)

	return (
		<HandleControl
			position={transform.applyToPoint(localPosition)}
			onPointerDown={(e) => {
				e.preventDefault()
				e.stopPropagation()

				editor.root.transition('select.draggingSpeechBubble')
			}}
		/>
	)
})

// missing from here:
// - tool masks (what even is this?)
// - snapping/modifiers
// - triggering updates on key presses?
// - pointer capture
//
// drawbacks:
// - need to manually handle cancellation, undo-redo, etc
// - kinda funky with typescript to have properties on the state node
// - how to pass data into this?
// - feels pretty unfamiliar to devs - why do i have to do something special to add this to the state tree?
// - gesture recognition (can't transition this into a pinch because it never reached our state chart)
export class DraggingSpeechBubble extends StateNode {
	override id = 'draggingSpeechBubble'

	initialShape!: SpeechBubbleShape
	initialPageTailPoint!: Vec
	initialPageCursorPoint!: Vec
	markId!: string

	// you can pass stuff to this i think? but it doesn't get typed. kinda tricky imo.
	override onEnter = () => {
		const shape = this.editor.getOnlySelectedShape()
		if (!shape || !this.editor.isShapeOfType<SpeechBubbleShape>(shape, 'speech-bubble')) {
			throw new Error('wrong shape')
		}

		this.editor.mark('draggingSpeechBubbleTail')
		this.initialShape = shape
		const transform = this.editor.getShapePageTransform(shape)
		this.initialPageCursorPoint = this.editor.inputs.currentPagePoint.clone()
		this.initialPageTailPoint = transform.applyToPoint({
			x: shape.props.tail.x * shape.props.w,
			y: shape.props.tail.y * shape.props.h,
		})
	}

	override onPointerMove = () => {
		const currentShape = this.editor.getShape<SpeechBubbleShape>(this.initialShape.id)
		if (!currentShape) return

		const delta = Vec.Sub(this.editor.inputs.currentPagePoint, this.initialPageCursorPoint)
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
