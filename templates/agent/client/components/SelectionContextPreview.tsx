import { useCallback } from 'react'
import { Editor, useValue } from 'tldraw'
import { CursorIcon } from './icons/CursorIcon'

export function SelectionContextPreview({ editor }: { editor: Editor }) {
	const shapes = useValue('shapes', () => editor.getSelectedShapes(), [editor])

	const handleClick = useCallback(() => {
		editor.selectNone()
	}, [editor])

	if (shapes.length === 0) {
		return null
	}

	return (
		<button type="button" className="context-item-preview" onClick={handleClick}>
			<CursorIcon /> Selection {shapes.length > 1 && `(${shapes.length})`}
		</button>
	)
}
