import { useEffect } from 'react'
import { useEditor } from 'tldraw'

export function SneakyHandToolEmptyPage() {
	const editor = useEditor()

	useEffect(() => {
		if (editor.getInstanceState().isCoarsePointer && editor.getCurrentPageShapeIds().size > 0) {
			editor.setCurrentTool('hand')
		}
	}, [editor])

	return null
}
