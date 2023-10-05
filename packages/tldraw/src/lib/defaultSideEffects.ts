import { Editor } from '@tldraw/editor'

export function registerDefaultSideEffects(editor: Editor) {
	return [
		editor.sideEffects.registerAfterChangeHandler('instance', (prev, next) => {
			if (prev.isFocused !== next.isFocused) {
				if (next.isFocused) {
					editor.getContainer().focus()
					editor.updateViewportScreenBounds()
				} else {
					editor.complete() // stop any interaction
					editor.getContainer().blur() // blur the container
					editor.updateViewportScreenBounds()
				}
			}
		}),
		editor.sideEffects.registerAfterChangeHandler('instance_page_state', (prev, next) => {
			if (prev.croppingShapeId !== next.croppingShapeId) {
				const isInCroppingState = editor.isInAny(
					'select.crop',
					'select.pointing_crop_handle',
					'select.cropping'
				)
				if (!prev.croppingShapeId && next.croppingShapeId) {
					if (!isInCroppingState) {
						editor.setCurrentTool('select.crop.idle')
					}
				} else if (prev.croppingShapeId && !next.croppingShapeId) {
					if (isInCroppingState) {
						editor.setCurrentTool('select.idle')
					}
				}
			}

			if (prev.editingShapeId !== next.editingShapeId) {
				if (!prev.editingShapeId && next.editingShapeId) {
					if (!editor.isIn('select.editing_shape')) {
						editor.setCurrentTool('select.editing_shape')
					}
				} else if (prev.editingShapeId && !next.editingShapeId) {
					if (editor.isIn('select.editing_shape')) {
						editor.setCurrentTool('select.idle')
					}
				}
			}
		}),
	]
}
