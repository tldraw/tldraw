import { useValue } from 'signia-react'
import { TLShapeId } from '../schema/records/TLShape'
import { useEditor } from './useEditor'

export function useIsCropping(shapeId: TLShapeId) {
	const editor = useEditor()
	return useValue('isCropping', () => editor.croppingId === shapeId, [editor, shapeId])
}
