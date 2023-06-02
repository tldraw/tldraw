import { TLShapeId } from '@tldraw/tlschema'
import { useValue } from 'signia-react'
import { useApp } from './useEditor'

export function useIsCropping(shapeId: TLShapeId) {
	const app = useApp()
	return useValue('isCropping', () => app.croppingId === shapeId, [app, shapeId])
}
