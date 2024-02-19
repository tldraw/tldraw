import { useEditor } from '@tldraw/editor'
import { useEffect, useState } from 'react'
import { useActions } from '../../context/actions'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

export function BackToContent() {
	const editor = useEditor()

	const actions = useActions()

	const [showBackToContent, setShowBackToContent] = useState(false)

	useEffect(() => {
		let showBackToContentPrev = false

		const interval = setInterval(() => {
			const renderingShapes = editor.getRenderingShapes()
			const renderingBounds = editor.getRenderingBounds()

			// renderingShapes will also include shapes that have the canUnmount flag
			// set to true. These shapes will be on the canvas but may not be in the
			// viewport... so we also need to narrow down the list to only shapes that
			// are ALSO in the viewport.
			const visibleShapes = renderingShapes.filter(
				(s) => s.maskedPageBounds && renderingBounds.includes(s.maskedPageBounds)
			)
			const showBackToContentNow =
				visibleShapes.length === 0 && editor.getCurrentPageShapes().length > 0

			if (showBackToContentPrev !== showBackToContentNow) {
				setShowBackToContent(showBackToContentNow)
				showBackToContentPrev = showBackToContentNow
			}
		}, 1000)

		return () => {
			clearInterval(interval)
		}
	}, [editor])

	if (!showBackToContent) return null

	return (
		<TldrawUiMenuItem
			{...actions['back-to-content']}
			onSelect={() => {
				actions['back-to-content'].onSelect('helper-buttons')
				setShowBackToContent(false)
			}}
		/>
	)
}
