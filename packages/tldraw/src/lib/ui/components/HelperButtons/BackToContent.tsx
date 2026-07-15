import { Editor, EditorAtom, useEditor, useQuickReactor } from '@tldraw/editor'
import { useEffect, useRef, useState } from 'react'
import { useActions } from '../../context/actions'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'

const backToContentSuppressed = new EditorAtom('backToContentSuppressed', () => false)
const suppressTimeout = new EditorAtom<number | null>('backToContentSuppressTimeout', () => null)

/**
 * How long all content must stay off-screen before the "back to content" button
 * appears. Delaying the appearance stops the button from flickering during brief
 * off-screen moments while panning or zooming.
 * @internal
 */
export const BACK_TO_CONTENT_APPEAR_DELAY_MS = 1000

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
	// Cancel any pending timeout so an earlier (shorter) timer can't clear the
	// suppression while a newer camera animation is still running.
	const pending = suppressTimeout.get(editor)
	if (pending !== null) clearTimeout(pending)
	const id = editor.timers.setTimeout(() => {
		backToContentSuppressed.set(editor, false)
		suppressTimeout.set(editor, null)
	}, durationMs)
	suppressTimeout.set(editor, id)
}

export function BackToContent() {
	const editor = useEditor()

	const actions = useActions()

	const [showBackToContent, setShowBackToContent] = useState(false)
	const rIsShowing = useRef(false)
	const rAppearTimeout = useRef<number | null>(null)

	useQuickReactor(
		'toggle showback to content',
		() => {
			let showBackToContentNow = false
			if (!backToContentSuppressed.get(editor)) {
				const shapeIds = editor.getCurrentPageShapeIds()
				if (shapeIds.size) {
					showBackToContentNow = shapeIds.size === editor.getNotVisibleShapes().size
				}
			}

			if (showBackToContentNow === rIsShowing.current) {
				// Already in the desired state. Cancel any pending appearance timer
				// that's no longer needed (e.g. content came back into view before
				// the delay elapsed).
				if (rAppearTimeout.current !== null) {
					clearTimeout(rAppearTimeout.current)
					rAppearTimeout.current = null
				}
				return
			}

			if (showBackToContentNow) {
				// Delay the appearance so the button doesn't flicker during brief
				// off-screen moments. The timer cancels above if content returns.
				if (rAppearTimeout.current === null) {
					rAppearTimeout.current = editor.timers.setTimeout(() => {
						rAppearTimeout.current = null
						rIsShowing.current = true
						setShowBackToContent(true)
					}, BACK_TO_CONTENT_APPEAR_DELAY_MS)
				}
			} else {
				// Hiding stays immediate.
				if (rAppearTimeout.current !== null) {
					clearTimeout(rAppearTimeout.current)
					rAppearTimeout.current = null
				}
				rIsShowing.current = false
				setShowBackToContent(false)
			}
		},
		[editor]
	)

	// Clear any pending appearance timer if we unmount before it fires.
	useEffect(() => {
		return () => {
			if (rAppearTimeout.current !== null) {
				clearTimeout(rAppearTimeout.current)
				rAppearTimeout.current = null
			}
		}
	}, [])

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
