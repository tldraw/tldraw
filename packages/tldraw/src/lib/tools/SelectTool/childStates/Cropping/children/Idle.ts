import { StateNode, TLEventHandlers, TLGroupShape } from '@tldraw/editor'
import { getHitShapeOnCanvasPointerDown } from '../../../../selection-logic/getHitShapeOnCanvasPointerDown'

export class Idle extends StateNode {
	static override id = 'idle'

	override onEnter = () => {
		const { editor } = this
		editor.setCursor({ type: 'default', rotation: 0 })

		const onlySelectedShape = editor.getOnlySelectedShape()

		// well this fucking sucks. what the fuck.
		// it's possible for a user to enter cropping, then undo
		// (which clears the cropping id) but still remain in this state.
		editor.on('change-history', this.cleanupCroppingState)

		if (onlySelectedShape) {
			editor.mark('cropping')
			editor.setCroppingShape(onlySelectedShape.id)
		}
	}

	override onExit = () => {
		const { editor } = this
		editor.setCursor({ type: 'default', rotation: 0 })
		editor.off('change-history', this.cleanupCroppingState)
	}

	override onPointerDown: TLEventHandlers['onPointerDown'] = (info) => {
		const { editor } = this
		if (editor.getIsMenuOpen()) return

		if (info.ctrlKey) {
			this.cancel()
			// feed the event back into the statechart
			editor.root.handleEvent(info)
			return
		}

		switch (info.target) {
			case 'canvas': {
				const hitShape = getHitShapeOnCanvasPointerDown(editor)
				if (hitShape && !editor.isShapeOfType<TLGroupShape>(hitShape, 'group')) {
					this.onPointerDown({
						...info,
						shape: hitShape,
						target: 'shape',
					})
					return
				}

				this.cancel()
				editor.root.handleEvent(info)
				break
			}
			case 'shape': {
				if (info.shape.id === editor.getCroppingShapeId()) {
					this.parent.transition('pointing_crop', info)
					return
				} else {
					if (editor.getShapeUtil(info.shape)?.canCrop(info.shape)) {
						editor.setCroppingShape(info.shape.id)
						editor.setSelectedShapes([info.shape.id])
						this.parent.transition('pointing_crop', info)
					} else {
						this.cancel()
						editor.root.handleEvent(info)
					}
				}
				break
			}
			case 'selection': {
				switch (info.handle) {
					case 'mobile_rotate':
					case 'top_left_rotate':
					case 'top_right_rotate':
					case 'bottom_left_rotate':
					case 'bottom_right_rotate': {
						this.parent.transition('pointing_rotate_handle', info)
						break
					}
					case 'top':
					case 'right':
					case 'bottom':
					case 'left':
					case 'top_left':
					case 'top_right':
					case 'bottom_left':
					case 'bottom_right': {
						this.parent.transition('pointing_crop_handle', info)
						break
					}
					default: {
						this.cancel()
					}
				}
				break
			}
		}
	}

	override onDoubleClick: TLEventHandlers['onDoubleClick'] = (info) => {
		const { editor } = this
		// Without this, the double click's "settle" would trigger the reset
		// after the user double clicked the edge to begin cropping
		if (editor.inputs.shiftKey || info.phase !== 'up') return

		const croppingShapeId = editor.getCroppingShapeId()
		if (!croppingShapeId) return
		const shape = editor.getShape(croppingShapeId)
		if (!shape) return
		const util = editor.getShapeUtil(shape)
		if (!util) return

		if (info.target === 'selection') {
			const change = util.onDoubleClickEdge?.(shape)
			if (change) {
				editor.mark('double clicked edge in crop')
				editor.updateShape(change)
			}
		}
	}

	override onKeyDown: TLEventHandlers['onKeyDown'] = (info) => {
		switch (info.key) {
			case 'ArrowLeft':
			case 'ArrowRight':
			case 'ArrowUp':
			case 'ArrowDown': {
				this.parent.transition('nudging_crop')
				break
			}
		}
	}

	override onKeyUp: TLEventHandlers['onKeyUp'] = (info) => {
		switch (info.key) {
			case 'Enter': {
				this.cancel()
			}
		}
	}

	override onCancel = () => {
		this.cancel()
	}

	override onComplete = () => {
		this.cancel()
	}

	private cancel() {
		const { editor } = this
		editor.setCroppingShape(null)
		editor.setCurrentTool('select.idle', {})
	}

	private cleanupCroppingState = () => {
		const { editor } = this
		if (!editor.getCroppingShapeId()) {
			editor.setCurrentTool('select.idle', {})
		}
	}
}
