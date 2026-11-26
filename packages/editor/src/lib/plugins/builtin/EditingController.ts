// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { atom, computed } from '@tldraw/state'
import { TLShape, TLShapeId } from '@tldraw/tlschema'
import type { Editor } from '../../editor/Editor'
import { TLEditStartInfo } from '../../editor/shapes/ShapeUtil'
import { TiptapEditor } from '../../utils/richText'

/**
 * Starts and stops editing and cropping a shape, and holds the rich text editor of the shape that
 * is being edited. The editor's methods of the same names use it. The ids of the editing and
 * cropping shapes are page state that the editor keeps.
 *
 * @public
 */
export class EditingController {
	constructor(private readonly editor: Editor) {}

	/**
	 * Whether the shape can be edited.
	 *
	 * @param shape - The shape (or shape id) to check if it can be edited.
	 * @param info - The info about the edit start.
	 *
	 * @public
	 * @returns true if the shape can be edited, false otherwise.
	 */
	canEditShape<T extends TLShape | TLShapeId>(shape: T | null, info?: TLEditStartInfo): shape is T {
		const id = typeof shape === 'string' ? shape : (shape?.id ?? null)
		if (!id) return false // no shape
		if (id === this.editor.getEditingShapeId()) return false // already editing this shape
		const _shape = this.editor.getShape(id)
		if (!_shape) return false // no shape
		const util = this.editor.getShapeUtil(_shape)
		const _info: TLEditStartInfo = info ?? { type: 'unknown' }
		if (!util.canEdit(_shape, _info)) return false // shape is not editable
		if (this.editor.getIsReadonly() && !util.canEditInReadonly(_shape)) return false // readonly and no exception
		if (this.editor.isShapeOrAncestorLocked(_shape) && !util.canEditWhileLocked(_shape))
			return false // locked and no exception. Note here: we're not distinguishing between a locked shape and a shape that is the descendant of a locked shape.
		return true // shape is editable
	}

	/**
	 * Set the current editing shape.
	 *
	 * @example
	 * ```ts
	 * editor.setEditingShape(myShape)
	 * editor.setEditingShape(myShape.id)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to set as editing.
	 *
	 * @public
	 */
	setEditingShape(shape: TLShapeId | TLShape | null): Editor {
		const id = typeof shape === 'string' ? shape : (shape?.id ?? null)

		// id was provided but the next editing shape was not editable or didn't exist, so do nothing
		if (id && !this.editor.canEditShape(id)) return this.editor

		this.editor.run(() => {
			// Clean up the previous editing shape. This runs outside the history-ignored batch below,
			// otherwise document changes made by onEditEnd (e.g. deleting an empty text shape) are
			// never recorded and leave a phantom undo entry whose redo resurrects the shape.
			const prevEditingShapeId = this.editor.getEditingShapeId()
			if (prevEditingShapeId) {
				const prevEditingShape = this.editor.getShape(prevEditingShapeId)
				if (prevEditingShape) {
					this.editor.getShapeUtil(prevEditingShape).onEditEnd?.(prevEditingShape)
				}
			}

			this.editor.run(
				() => {
					// Clean up the editing shape state and rich text editor
					this.editor._updateCurrentPageState({ editingShapeId: null })
					this._currentRichTextEditor.set(null)

					if (!id) return

					this.editor.select(id)
					this.editor._updateCurrentPageState({ editingShapeId: id })

					const nextEditingShape = this.editor.getShape(id)! // shape should be there because canEditShape checked it. Possible small chance that onEditEnd deleted it?
					this.editor.getShapeUtil(nextEditingShape).onEditStart?.(nextEditingShape)
				},
				{ history: 'ignore' }
			)
		})

		return this.editor
	}

	// Rich text editor

	private _currentRichTextEditor = atom('rich text editor', null as TiptapEditor | null)

	/**
	 * The current editing shape's text editor.
	 *
	 * @public
	 */
	@computed getRichTextEditor(): TiptapEditor | null {
		return this._currentRichTextEditor.get()
	}

	/**
	 * Set the current editing shape's rich text editor.
	 *
	 * @example
	 * ```ts
	 * editor.setRichTextEditor(richTextEditorView)
	 * ```
	 *
	 * @param textEditor - The text editor to set as the current editing shape's text editor.
	 *
	 * @public
	 */
	setRichTextEditor(textEditor: TiptapEditor | null) {
		this._currentRichTextEditor.set(textEditor)
		return this.editor
	}

	/**
	 * Whether the shape can be cropped.
	 *
	 * @param shape - The shape (or shape id) to check if it can be cropped.
	 *
	 * @public
	 * @returns true if the shape can be cropped, false otherwise.
	 */
	canCropShape<T extends TLShape | TLShapeId>(shape: T | null): shape is T {
		if (!shape) return false
		const id = typeof shape === 'string' ? shape : (shape?.id ?? null)
		if (!id) return false
		const _shape = this.editor.getShape(id)
		if (!_shape) return false
		const util = this.editor.getShapeUtil(_shape)
		if (!util.canCrop(_shape)) return false
		if (this.editor.getIsReadonly()) return false
		if (this.editor.isShapeOrAncestorLocked(_shape)) return false
		return true
	}

	/**
	 * Set the current cropping shape.
	 *
	 * @example
	 * ```ts
	 * editor.setCroppingShape(myShape)
	 * editor.setCroppingShape(myShape.id)
	 * ```
	 *
	 *
	 * @param shape - The shape (or shape id) to set as cropping.
	 *
	 * @public
	 */
	setCroppingShape(shape: TLShapeId | TLShape | null): Editor {
		const id = typeof shape === 'string' ? shape : (shape?.id ?? null)
		if (id !== this.editor.getCroppingShapeId()) {
			this.editor.run(
				() => {
					if (!id) {
						this.editor.updateCurrentPageState({ croppingShapeId: null })
					} else if (this.editor.canCropShape(id)) {
						this.editor.updateCurrentPageState({ croppingShapeId: id })
					}
				},
				{ history: 'ignore' }
			)
		}
		return this.editor
	}
}
