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

			// Rendering shapes includes all the shapes in the current page.
			// We have to filter them down to just the shapes that are inside the renderingBounds.
			const visibleShapes = renderingShapes.filter((s) => {
				const maskedPageBounds = editor.getShapeMaskedPageBounds(s.id)
				return maskedPageBounds && renderingBounds.includes(maskedPageBounds)
			})
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
