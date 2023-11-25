import { useValue } from '@tldraw/state'
import { TLShapeId } from '@tldraw/tlschema'
import { useEditor } from './useEditor'

/** @public */
export function useIsCropping(shapeId: TLShapeId) {
	const editor = useEditor()
	return useValue('isCropping', () => editor.getCroppingShapeId() === shapeId, [editor, shapeId])
}
