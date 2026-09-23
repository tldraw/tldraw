import { useCallback } from 'react'
import {
	Box,
	Tldraw,
	TldrawUiButtonIcon,
	TldrawUiContextualToolbar,
	TldrawUiToolbarButton,
	TLEditorComponents,
	track,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
const ShapeToolbar = track(() => {
	const editor = useEditor()
	const showToolbar = editor.isIn('select.idle') && editor.getOnlySelectedShapeId()

	// [2]
	const handleReturn = useCallback(() => {
		editor.getContainer().focus()
	}, [editor])

	if (!showToolbar) return null

	// [3]
	const getSelectionBounds = () => {
		const fullBounds = editor.getSelectionRotatedScreenBounds()
		if (!fullBounds) return undefined
		return new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0)
	}

	return (
		<TldrawUiContextualToolbar getSelectionBounds={getSelectionBounds} label="Shape actions">
			<TldrawUiToolbarButton
				type="icon"
				title="Duplicate"
				onClick={() => {
					editor.duplicateShapes(editor.getSelectedShapes())
					handleReturn()
				}}
			>
				<TldrawUiButtonIcon small icon="duplicate" />
			</TldrawUiToolbarButton>
			<TldrawUiToolbarButton
				type="icon"
				title="Delete"
				onClick={() => {
					editor.deleteShapes(editor.getSelectedShapeIds())
					handleReturn()
				}}
			>
				<TldrawUiButtonIcon small icon="trash" />
			</TldrawUiToolbarButton>
		</TldrawUiContextualToolbar>
	)
})

const components: TLEditorComponents = {
	InFrontOfTheCanvas: ShapeToolbar,
}

export default function EscapeShapeFocusTrapExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				components={components}
				onMount={(editor) => {
					editor.createShape({ type: 'geo', x: 400, y: 200 })

					// [4]
					const container = editor.getContainer()
					const getToolbar = () => container.querySelector<HTMLElement>('.tlui-contextual-toolbar')

					// [5]
					function enableFocusRing() {
						container.classList.remove('tl-container__no-focus-ring')
					}

					function handleKeyDown(e: KeyboardEvent) {
						const toolbarEl = getToolbar()
						const isInToolbar = toolbarEl?.contains(document.activeElement)

						// [6]
						if (e.key === 'Tab' && !isInToolbar) {
							const hasSelected = editor.getOnlySelectedShapeId() !== null
							const isOnCanvas =
								document.activeElement === container ||
								document.activeElement?.classList.contains('tl-container')

							if (hasSelected && isOnCanvas && !e.shiftKey) {
								e.preventDefault()
								e.stopImmediatePropagation()
								const btn = toolbarEl?.querySelector<HTMLElement>('button')
								if (btn) {
									btn.focus()
									enableFocusRing()
								}
							}
							return
						}

						// [7]
						if (e.key === 'Tab' && isInToolbar && toolbarEl) {
							const buttons = Array.from(toolbarEl.querySelectorAll<HTMLElement>('button'))
							const currentIndex = buttons.indexOf(document.activeElement as HTMLElement)
							if (currentIndex === -1) return

							e.preventDefault()
							e.stopImmediatePropagation()

							if (e.shiftKey) {
								if (currentIndex === 0) {
									container.focus()
								} else {
									buttons[currentIndex - 1].focus()
								}
							} else {
								if (currentIndex === buttons.length - 1) {
									container.focus()
								} else {
									buttons[currentIndex + 1].focus()
								}
							}
							enableFocusRing()
							return
						}

						// [8]
						if (e.key === 'Escape' && isInToolbar) {
							e.preventDefault()
							e.stopImmediatePropagation()
							container.focus()
						}
					}

					// [9]
					container.addEventListener('keydown', handleKeyDown, { capture: true })
					return () => container.removeEventListener('keydown', handleKeyDown, { capture: true })
				}}
			/>
		</div>
	)
}

/*
[1]
A contextual toolbar that appears above the selected shape. `track()` re-renders it
whenever the editor state it reads (the tool state and the selection) changes.

[2]
Moving focus back to the container hands Tab back to tldraw's built-in shape navigation.

[3]
Position the toolbar on the top edge of the selection, the same pattern used in the
contextual toolbar example.

[4]
The keyboard interception is registered in `onMount` so its cleanup runs when the editor
unmounts.

[5]
Because we call `stopImmediatePropagation()` in [6] and [7], the editor's `FocusManager`
(which listens on `document.body`) never sees the Tab key and so never removes
`tl-container__no-focus-ring`. Removing it ourselves keeps the focus outline visible on
the toolbar buttons.

[6]
Tab with focus on the canvas and one shape selected: focus the first toolbar button
instead of letting tldraw cycle to the next shape.

[7]
Tab inside the toolbar cycles between its buttons. Tab on the last button or Shift+Tab on
the first returns focus to the canvas, so focus can't leak into unrelated UI.

[8]
Escape inside the toolbar returns focus to the canvas.

[9]
The listener is registered with `capture: true` so it runs before tldraw's own bubble-phase
handler in `useDocumentEvents`, which is what makes `stopImmediatePropagation()` effective.
*/
