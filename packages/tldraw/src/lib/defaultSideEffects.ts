import { Editor } from '@tldraw/editor'

/** @public */
export function registerDefaultSideEffects(editor: Editor) {
	return editor.sideEffects.register({
		instance_page_state: {
			afterChange: (prev, next) => {
				if (prev.croppingShapeId !== next.croppingShapeId) {
					const isInCroppingState = editor.isIn('select.crop')
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
							// Here's where we handle the special tool locking case for text
							// If tool lock is enabled, and we just finished editing a text
							// shape and are setting that shape as the new editing shape,
							// then create the shape with a flag that will let it know to
							// go back to the text tool once the edit is complete.
							const shape = editor.getEditingShape()
							if (
								shape &&
								shape.type === 'text' &&
								editor.isInAny('text.pointing', 'select.resizing') &&
								editor.getInstanceState().isToolLocked
							) {
								editor.setCurrentTool('select.editing_shape', {
									isCreatingTextWhileToolLocked: true,
								})
							} else {
								editor.setCurrentTool('select.editing_shape')
							}
						}
					} else if (prev.editingShapeId && !next.editingShapeId) {
						if (editor.isIn('select.editing_shape')) {
							editor.setCurrentTool('select.idle')
						}
					}
				}
			},
		},
	})
}
