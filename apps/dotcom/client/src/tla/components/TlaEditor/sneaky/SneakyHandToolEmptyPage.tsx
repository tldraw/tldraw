import { useEffect } from 'react'
import { useEditor } from 'tldraw'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'

export function SneakyHandToolEmptyPage() {
	const editor = useEditor()

	useEffect(() => {
		// If the editor is in coarse pointer mode and there are no shapes on the current page,
		// start on the hand tool to avoid accidental selections / drags as the user tries to
		// orient themselves or move around the page
		if (getIsCoarsePointer() && editor.getCurrentPageShapeIds().size > 0) {
			editor.setCurrentTool('hand')
		}

		// todo: if the user has never been to this page before on this device (how?) and they're on an empty part of it, do a "back to content"  automatically
	}, [editor])

	return null
}
