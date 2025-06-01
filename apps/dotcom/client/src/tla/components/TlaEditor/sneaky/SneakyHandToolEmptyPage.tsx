import { useEffect } from 'react'
import { useEditor } from 'tldraw'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'

export function SneakyHandToolEmptyPage() {
	const editor = useEditor()

	useEffect(() => {
		if (getIsCoarsePointer() && editor.getCurrentPageShapeIds().size > 0) {
			editor.setCurrentTool('hand')
		}
	}, [editor])

	return null
}
