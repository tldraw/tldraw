import { useValue } from '@tldraw/state'
import { TLShapeId } from '@tldraw/tlschema'
import { useEditor } from './useEditor'

/** @public */
export function useIsEditing(shapeId: TLShapeId) {
	const editor = useEditor()
	return useValue('isEditing', () => editor.editingShapeId === shapeId, [editor, shapeId])
}
