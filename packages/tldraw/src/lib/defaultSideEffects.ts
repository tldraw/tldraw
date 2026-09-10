import { Editor, TLEmbedShape } from '@tldraw/editor'
import { EmbedShapeUtil } from './shapes/embed/EmbedShapeUtil'
import {
	cancelUpdateHoveredShapeId,
	updateHoveredShapeId,
} from './tools/selection-logic/updateHoveredShapeId'

/** @public */
export function registerDefaultSideEffects(editor: Editor) {
	const resolveEmbedAspectRatio = (shape: TLEmbedShape) => {
		// Resolving the embed's real aspect ratio is a document mutation, so it belongs here as a
		// store side effect rather than in the shape's render component — that way it runs once per
		// create/url-change and never during rendering (e.g. SVG export).
		;(editor.getShapeUtil('embed') as EmbedShapeUtil).resolveAspectRatio(shape)
	}

	const unsub = editor.sideEffects.register({
		shape: {
			afterCreate: (shape, source) => {
				// Only for local user actions: remote peers and document loads already carry the
				// resolved size, so we don't need to re-fetch.
				if (source !== 'user') return
				if (editor.isShapeOfType<TLEmbedShape>(shape, 'embed')) {
					resolveEmbedAspectRatio(shape)
				}
			},
			afterChange: (prev, next, source) => {
				if (source !== 'user') return
				if (
					editor.isShapeOfType<TLEmbedShape>(next, 'embed') &&
					(prev as TLEmbedShape).props.url !== next.props.url
				) {
					resolveEmbedAspectRatio(next)
				}
			},
		},
		instance: {
			afterChange: (prev, next) => {
				if (prev.cameraState !== next.cameraState && next.cameraState === 'idle') {
					updateHoveredShapeId(editor)
				}
			},
		},
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
									target: 'shape',
									shape: shape,
									isCreatingTextWhileToolLocked: true,
								})
							} else {
								editor.setCurrentTool('select.editing_shape', {
									target: 'shape',
									shape: shape,
								})
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
	return () => {
		unsub()
		cancelUpdateHoveredShapeId(editor)
	}
}
