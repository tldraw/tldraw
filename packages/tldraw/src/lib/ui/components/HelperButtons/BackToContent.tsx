import { Editor, EditorAtom, useEditor, useQuickReactor } from '@tldraw/editor'
import { useRef, useState } from 'react'
import { useActions } from '../../context/actions'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'

const backToContentSuppressed = new EditorAtom('backToContentSuppressed', () => false)

/**
 * Hide the "back to content" helper button right away, regardless of where the
 * camera currently is. This is used when the user has explicitly chosen to
 * navigate back to the content (e.g. via the "move focus to canvas" button): the
 * button should disappear on intent rather than waiting for the camera animation
 * to physically bring a shape back into the viewport. The button falls back to
 * its normal reactive logic after `durationMs`, by which point the camera has
 * arrived and the content is visible.
 * @internal
 */
export function suppressBackToContent(editor: Editor, durationMs: number) {
	backToContentSuppressed.set(editor, true)
	editor.timers.setTimeout(() => backToContentSuppressed.set(editor, false), durationMs)
}

export function BackToContent() {
	const editor = useEditor()

	const actions = useActions()

	const [showBackToContent, setShowBackToContent] = useState(false)
	const rIsShowing = useRef(false)

	useQuickReactor(
		'toggle showback to content',
		() => {
			const showBackToContentPrev = rIsShowing.current
			let showBackToContentNow = false
			if (!backToContentSuppressed.get(editor)) {
				const shapeIds = editor.getCurrentPageShapeIds()
				if (shapeIds.size) {
					showBackToContentNow = shapeIds.size === editor.getNotVisibleShapes().size
				}
			}

			if (showBackToContentPrev !== showBackToContentNow) {
				setShowBackToContent(showBackToContentNow)
				rIsShowing.current = showBackToContentNow
			}
		},
		[editor]
	)

	if (!showBackToContent) return null

	return (
		<TldrawUiMenuActionItem
			actionId="back-to-content"
			onSelect={() => {
				actions['back-to-content'].onSelect('helper-buttons')
				setShowBackToContent(false)
			}}
		/>
	)
}
