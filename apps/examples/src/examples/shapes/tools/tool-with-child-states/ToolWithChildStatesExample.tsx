import {
	StateNode,
	TLClickEventInfo,
	TLPointerEventInfo,
	TLShape,
	TLShapeId,
	Tldraw,
	createShapeId,
	toRichText,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const OFFSET = -12
const EMOJIS = ['❤️', '🔥', '👍', '👎', '😭', '🤣']

// [1]
class StickerTool extends StateNode {
	static override id = 'sticker'
	static override initial = 'idle'
	static override children() {
		return [Idle, Pointing, Dragging]
	}
}

// [2]
class Idle extends StateNode {
	static override id = 'idle'
	// [a]
	override onEnter() {
		this.editor.setCursor({ type: 'cross' })
	}
	// [b]
	override onPointerDown(info: TLPointerEventInfo) {
		const { editor } = this
		switch (info.target) {
			case 'canvas': {
				const hitShape = editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint())
				if (hitShape) {
					this.onPointerDown({
						...info,
						shape: hitShape,
						target: 'shape',
					})
					return
				}
				this.parent.transition('pointing', { shape: null })
				break
			}
			case 'shape': {
				if (editor.inputs.getShiftKey()) {
					editor.updateShape({
						id: info.shape.id,
						type: 'text',
						props: { richText: toRichText('👻 boo!') },
					})
				} else {
					this.parent.transition('pointing', { shape: info.shape })
				}
				break
			}
		}
	}
	// [c]
	override onDoubleClick(info: TLClickEventInfo) {
		const { editor } = this
		if (info.phase !== 'up') return
		switch (info.target) {
			case 'canvas': {
				const hitShape = editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint())

				if (hitShape) {
					this.onDoubleClick({
						...info,
						shape: hitShape,
						target: 'shape',
					})
					return
				}
				const currentPagePoint = editor.inputs.getCurrentPagePoint()
				editor.createShape({
					type: 'text',
					x: currentPagePoint.x + OFFSET,
					y: currentPagePoint.y + OFFSET,
					props: { richText: toRichText('❤️') },
				})
				break
			}
			case 'shape': {
				editor.deleteShapes([info.shape.id])
				break
			}
		}
	}
}

// [3]
class Pointing extends StateNode {
	static override id = 'pointing'
	private shape: TLShape | null = null

	// [a]
	override onEnter(info: { shape: TLShape | null }) {
		this.shape = info.shape
	}
	// [b]
	override onPointerUp() {
		this.parent.transition('idle')
	}
	// [c]
	override onPointerMove() {
		if (this.editor.inputs.getIsDragging()) {
			this.parent.transition('dragging', { shape: this.shape })
		}
	}
}

// [4]
class Dragging extends StateNode {
	static override id = 'dragging'
	private shapeId: TLShapeId | null = null

	// [a]
	override onEnter(info: { shape: TLShape | null }) {
		if (info.shape) {
			this.shapeId = info.shape.id
			return
		}
		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()
		this.shapeId = createShapeId()
		this.editor.createShape({
			id: this.shapeId,
			type: 'text',
			x: currentPagePoint.x + OFFSET,
			y: currentPagePoint.y + OFFSET,
			props: { richText: toRichText('❤️') },
		})
	}
	// [b]
	override onPointerUp() {
		this.parent.transition('idle')
	}
	// [c]
	override onPointerMove() {
		if (!this.shapeId) return
		const originPagePoint = this.editor.inputs.getOriginPagePoint()
		const currentPagePoint = this.editor.inputs.getCurrentPagePoint()
		const distance = originPagePoint.dist(currentPagePoint)
		this.editor.updateShape({
			id: this.shapeId,
			type: 'text',
			props: {
				richText: toRichText(EMOJIS[Math.floor(distance / 20) % EMOJIS.length]),
			},
		})
	}
}

// [5]
const customTools = [StickerTool]
export default function ToolWithChildStatesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={customTools}
				initialState="sticker"
				hideUi
				onMount={(editor) => {
					editor.createShape({
						type: 'text',
						x: 50,
						y: 50,
						props: {
							richText: toRichText(
								'-Double click the canvas to add a sticker\n-Double click a sticker to delete it\n-Click and drag on a sticker to change it\n-Click and drag on the canvas to create a sticker\n-Shift click a sticker for a surprise!'
							),
							size: 's',
							textAlign: 'start',
						},
					})
				}}
			/>
		</div>
	)
}

/*
Tools are nodes in tldraw's state machine and handle user input. A tool with a single state
quickly turns into a tangle of flags once it has to tell clicks apart from drags. Child states
solve that: each state handles the events that matter to it and transitions to the next. This
example expands on the sticker tool from the custom tool example.

[1]
The tool declares its child states with `children()` and which one to start in with
`initial`. Events are delivered to the current child state, not to the tool itself.

[2]
Idle is the initial state. Its job is to work out what the user is trying to do and hand off
to the right state. `this.parent.transition(id, info)` switches states; `info` is passed to
the new state's `onEnter`.

	[a] Set the cursor on entering. Every child state receives `onEnter`.

	[b] Because this tool has no shape-level hit testing of its own, the pointer event's
	target is always 'canvas'. We use `editor.getShapeAtPoint` to check for a shape under
	the pointer and re-dispatch the event with `target: 'shape'` so one switch handles both
	cases. Shift-clicking a shape updates it in place; otherwise we go to Pointing.

	[c] Double clicks arrive with a `phase`; we only act on 'up' so the action runs once.
	Double-clicking empty canvas creates a sticker; double-clicking a sticker deletes it.

[3]
Pointing is a transitional state between pointer down and either pointer up (a click) or a
drag.

	[a] Remember which shape (if any) was under the pointer.

	[b] Pointer up without dragging means it was a click; go back to Idle.

	[c] `editor.inputs.getIsDragging()` becomes true once the pointer has moved past the drag
	threshold, so we don't start dragging on a tiny wobble.

[4]
Dragging updates the sticker while the pointer moves.

	[a] If we're dragging an existing sticker, keep its id. Otherwise create a new one at the
	pointer. We store the id rather than the shape record so we always read fresh data.

	[b] Pointer up ends the drag; back to Idle.

	[c] Cycle through the emojis based on how far the pointer has moved from where the drag
	started (`getOriginPagePoint`).

[5]
Pass the tool to `Tldraw` and start in it with `initialState`. For this demo we hide the UI
and put some instructions on the canvas.
*/
