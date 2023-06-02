import { TLShapeId } from '@tldraw/tlschema'
import { useValue } from 'signia-react'
import { useEditor } from './useEditor'

export function useIsCropping(shapeId: TLShapeId) {
	const app = useEditor()
	return useValue('isCropping', () => app.croppingId === shapeId, [app, shapeId])
}
