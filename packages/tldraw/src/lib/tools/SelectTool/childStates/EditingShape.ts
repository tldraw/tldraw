import {
	StateNode,
	TLCancelEventInfo,
	TLCompleteEventInfo,
	tlenv,
	TLPointerEventInfo,
	TLShape,
} from '@tldraw/editor'
import { getTextLabels } from '../../../utils/shapes/shapes'
import { renderPlaintextFromRichText } from '../../../utils/text/richText'
import { getHitShapeOnCanvasPointerDown } from '../../selection-logic/getHitShapeOnCanvasPointerDown'
import { updateHoveredShapeId } from '../../selection-logic/updateHoveredShapeId'

interface EditingShapeInfo {
	isCreatingTextWhileToolLocked?: boolean
}

export class EditingShape extends StateNode {
	static override id = 'editing_shape'

	hitLabelOnShapeForPointerUp: TLShape | null = null
	private info = {} as EditingShapeInfo
	private didPointerDownOnEditingShape = false

	private isTextInputFocused(): boolean {
		const container = this.editor.getContainer()
		return (
			container.contains(document.activeElement) &&
			(document.activeElement?.nodeName === 'INPUT' ||
				document.activeElement?.nodeName === 'TEXTAREA' ||
				(document.activeElement as HTMLElement)?.isContentEditable)
		)
	}

	override onEnter(info: EditingShapeInfo) {
		const editingShape = this.editor.getEditingShape()
		if (!editingShape) throw Error('Entered editing state without an editing shape')
		this.hitLabelOnShapeForPointerUp = null
		this.didPointerDownOnEditingShape = false

		this.info = info

		if (info.isCreatingTextWhileToolLocked) {
			this.parent.setCurrentToolIdMask('text')
		}

		updateHoveredShapeId(this.editor)
		this.editor.select(editingShape)
	}

	override onExit() {
		const { editingShapeId } = this.editor.getCurrentPageState()
		if (!editingShapeId) return

		// Clear the editing shape
		this.editor.setEditingShape(null)

		updateHoveredShapeId.cancel()

		if (this.info.isCreatingTextWhileToolLocked) {
			this.parent.setCurrentToolIdMask(undefined)
			this.editor.setCurrentTool('text', {})
		}
	}

	override onPointerMove(info: TLPointerEventInfo) {
		// In the case where on pointer down we hit a shape's label, we need to check if the user is dragging.
		// and if they are, we need to transition to translating instead.
		if (this.hitLabelOnShapeForPointerUp && this.editor.inputs.getIsDragging()) {
			if (this.editor.getIsReadonly()) return
			if (this.hitLabelOnShapeForPointerUp.isLocked) return

			this.editor.select(this.hitLabelOnShapeForPointerUp)
			this.parent.transition('translating', info)
			this.hitLabelOnShapeForPointerUp = null
			return
		}

		// Check if dragging from editing shape with blurred input
		if (this.didPointerDownOnEditingShape && this.editor.inputs.isDragging) {
			if (this.editor.getIsReadonly()) return

			const editingShape = this.editor.getEditingShape()
			if (!editingShape || editingShape.isLocked) return

			if (!this.isTextInputFocused()) {
				// Input blurred during drag - exit edit mode and start translating
				this.editor.select(editingShape)
				this.parent.transition('translating', info)
				this.didPointerDownOnEditingShape = false
				return
			}
			// Input still focused - user is selecting text, stay in edit mode
			this.didPointerDownOnEditingShape = false
		}

		switch (info.target) {
			case 'shape':
			case 'canvas': {
				updateHoveredShapeId(this.editor)
				return
			}
		}
	}

	override onPointerDown(info: TLPointerEventInfo) {
		this.hitLabelOnShapeForPointerUp = null
		this.didPointerDownOnEditingShape = false

		switch (info.target) {
			// N.B. This bit of logic has a bit of history to it.
			// There was a PR that got rid of this logic: https://github.com/tldraw/tldraw/pull/4237
			// But here we bring it back to help support the new rich text world.
			// The original issue which is visible in the video attachments in the PR now seem
			// to have been resolved anyway via some other layer.
			case 'canvas': {
				const hitShape = getHitShapeOnCanvasPointerDown(this.editor, true /* hitLabels */)
				if (hitShape) {
					this.onPointerDown({
						...info,
						shape: hitShape,
						target: 'shape',
					})
					return
				}
				break
			}
			case 'shape': {
				const { shape: selectingShape } = info
				const editingShape = this.editor.getEditingShape()

				if (!editingShape) {
					throw Error('Expected an editing shape!')
				}

				// for shapes with labels, check to see if the click was inside of the shape's label
				const geometry = this.editor.getShapeUtil(selectingShape).getGeometry(selectingShape)
				const textLabels = getTextLabels(geometry)
				const textLabel = textLabels.length === 1 ? textLabels[0] : undefined
				// N.B. One nuance here is that we want empty text fields to be removed from the canvas when the user clicks away from them.
				const isEmptyTextShape =
					this.editor.isShapeOfType(editingShape, 'text') &&
					renderPlaintextFromRichText(this.editor, editingShape.props.richText).trim() === ''
				if (textLabel && !isEmptyTextShape) {
					const pointInShapeSpace = this.editor.getPointInShapeSpace(
						selectingShape,
						this.editor.inputs.getCurrentPagePoint()
					)
					if (
						textLabel.bounds.containsPoint(pointInShapeSpace, 0) &&
						textLabel.hitTestPoint(pointInShapeSpace)
					) {
						// it's a hit to the label!
						if (selectingShape.id === editingShape.id) {
							// Track click on editing shape for drag detection
							this.didPointerDownOnEditingShape = true
							return
						} else {
							this.hitLabelOnShapeForPointerUp = selectingShape

							this.editor.markHistoryStoppingPoint('editing on pointer up')
							this.editor.select(selectingShape.id)
							return
						}
					}
				} else {
					if (selectingShape.id === editingShape.id) {
						// If we clicked on a frame, while editing its heading, cancel editing
						if (this.editor.isShapeOfType(selectingShape, 'frame')) {
							this.editor.setEditingShape(null)
							this.parent.transition('idle', info)
						}
						// If we clicked on the editing shape (which isn't a shape with a label), do nothing
					} else {
						// But if we clicked on a different shape of the same type, transition to pointing_shape instead
						this.parent.transition('pointing_shape', info)
						return
					}
					return
				}
				break
			}
		}

		// still here? Cancel editing and transition back to select idle
		this.parent.transition('idle', info)
		// then feed the pointer down event back into the state chart as if it happened in that state
		this.editor.root.handleEvent(info)
	}

	override onPointerUp(info: TLPointerEventInfo) {
		if (this.didPointerDownOnEditingShape) {
			this.didPointerDownOnEditingShape = false
			if (!this.isTextInputFocused()) {
				// We clicked on the text label, which blured the input.
				// We want to stay in edit mode and select all the text.
				this.editor.getRichTextEditor()?.commands.focus('all')
				return
			}
		}

		// If we're not dragging, and it's a hit to the label, begin editing the shape.
		const hitShape = this.hitLabelOnShapeForPointerUp
		if (!hitShape) return
		this.hitLabelOnShapeForPointerUp = null

		// Stay in edit mode to maintain flow of editing.
		const util = this.editor.getShapeUtil(hitShape)
		if (hitShape.isLocked) return

		if (this.editor.getIsReadonly()) {
			if (!util.canEditInReadonly(hitShape)) {
				this.parent.transition('pointing_shape', info)
				return
			}
		}

		this.editor.select(hitShape.id)

		const currentEditingShape = this.editor.getEditingShape()
		const isEditToEditAction = currentEditingShape && currentEditingShape.id !== hitShape.id
		this.editor.setEditingShape(hitShape.id)

		const isMobile = tlenv.isIos || tlenv.isAndroid
		if (!isMobile || !isEditToEditAction) {
			this.editor.emit('place-caret', { shapeId: hitShape.id, point: info.point })
		} else if (isMobile && isEditToEditAction) {
			this.editor.emit('select-all-text', { shapeId: hitShape.id })
		}
		updateHoveredShapeId(this.editor)
	}

	override onComplete(info: TLCompleteEventInfo) {
		this.editor.getContainer().focus()
		this.parent.transition('idle', info)
	}

	override onCancel(info: TLCancelEventInfo) {
		this.editor.getContainer().focus()
		this.parent.transition('idle', info)
	}
}
