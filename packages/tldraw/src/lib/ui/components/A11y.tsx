import { useEditor } from '@tldraw/editor'
import { useCallback, useRef } from 'react'
import { useTranslation } from '../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from './primitives/Button/TldrawUiButton'

export function SkipToMainContent() {
	const editor = useEditor()
	const msg = useTranslation()
	const button = useRef<HTMLButtonElement>(null)

	const handleNavigateToFirstShape = useCallback(() => {
		button.current?.blur()
		const shapes = editor.getCurrentPageShapesInReadingOrder()
		if (!shapes.length) return
		editor.setSelectedShapes([shapes[0].id])
		editor.zoomToSelectionIfOffscreen(256)

		// N.B. If we don't do this, then we go into editing mode for some reason...
		// Not sure of a better solution at the moment...
		editor.timers.setTimeout(() => editor.getContainer().focus(), 100)
	}, [editor])

	return (
		<TldrawUiButton
			ref={button}
			type="normal"
			tabIndex={1}
			className="tl-skip-to-main-content"
			onClick={handleNavigateToFirstShape}
		>
			{msg('a11y.skip-to-main-content')}
		</TldrawUiButton>
	)
}
