import { useEffect } from 'react'
import { useEditor } from 'tldraw'

export function SneakyUndoRedoWhileEditing() {
	const editor = useEditor()

	useEffect(() => {
		function handleKeydown(e: KeyboardEvent) {
			if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
				const editingShape = editor.getEditingShape()
				if (!editingShape) return

				if (e.shiftKey) {
					editor.redo()
					editor.setEditingShape(editingShape)
				} else {
					editor.undo()
					editor.setEditingShape(editingShape)
				}
			}
		}

		window.addEventListener('keydown', handleKeydown)
		return () => {
			window.removeEventListener('keydown', handleKeydown)
		}
	}, [editor])

	return null
}
