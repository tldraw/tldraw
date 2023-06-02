import { TLShapeId } from '@tldraw/tlschema'
import { useValue } from 'signia-react'
import { useEditor } from './useEditor'

export function useIsEditing(shapeId: TLShapeId) {
	const app = useEditor()
	return useValue('isEditing', () => app.editingId === shapeId, [app, shapeId])
}
