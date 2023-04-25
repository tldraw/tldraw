import { TLShapeId } from '@tldraw/tlschema'
import { useValue } from 'signia-react'
import { useApp } from './useApp'

export function useIsEditing(shapeId: TLShapeId) {
	const app = useApp()
	return useValue('isEditing', () => app.editingId === shapeId, [app, shapeId])
}
