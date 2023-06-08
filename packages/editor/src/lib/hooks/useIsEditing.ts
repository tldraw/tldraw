import { useValue } from 'signia-react'
import { TLShapeId } from '../schema/records/TLShape'
import { useEditor } from './useEditor'

export function useIsEditing(shapeId: TLShapeId) {
	const editor = useEditor()
	return useValue('isEditing', () => editor.editingId === shapeId, [editor, shapeId])
}
