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
							editor.setCurrentTool('select.editing_shape')
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
