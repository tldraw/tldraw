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

					// [4a]
					const container = editor.getContainer()
					const getToolbar = () => container.querySelector<HTMLElement>('.tlui-contextual-toolbar')

					// [4b]
					function enableFocusRing() {
						container.classList.remove('tl-container__no-focus-ring')
					}

					function handleKeyDown(e: KeyboardEvent) {
						const toolbarEl = getToolbar()
						const isInToolbar = toolbarEl?.contains(document.activeElement)

						// [5]
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

						// [6]
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

						// [7]
						if (e.key === 'Escape' && isInToolbar) {
							e.preventDefault()
							e.stopImmediatePropagation()
							container.focus()
						}
					}

					// [8]
					container.addEventListener('keydown', handleKeyDown, { capture: true })
					return () => container.removeEventListener('keydown', handleKeyDown, { capture: true })
				}}
			/>
		</div>
	)
}

/*
[1]
The ShapeToolbar component renders a contextual toolbar above the selected shape.
It uses `track()` so it re-renders when editor state changes (e.g. selection).

[2]
handleReturn moves focus back to the canvas container. Once focus leaves the toolbar
buttons, tldraw's shape navigation takes over Tab again.

[3]
We position the toolbar above the selected shape using getSelectionBounds, the same
pattern used in the contextual toolbar example.

[4a]
All keyboard interception is registered here in onMount via a capture-phase listener.

[4b]
stopImmediatePropagation blocks FocusManager's handler (on document.body) from seeing
the Tab key, so it never removes the tl-container__no-focus-ring class itself. We do
it manually here so that focus-visible outlines appear on the toolbar buttons.

[5]
When Tab is pressed and focus is on the canvas (not in the toolbar), intercept it to
focus the first toolbar button instead of cycling to the next shape.

[6]
When Tab is pressed inside the toolbar, cycle between toolbar buttons. Shift+Tab on the
first button or Tab on the last button returns focus to the canvas. This prevents Tab
from escaping to the SkipToMainContent or other UI elements outside the toolbar.

[7]
Pressing Escape while focused in the toolbar returns focus to the canvas.

[8]
Using { capture: true } ensures our handler runs in the capture phase, before
tldraw's bubble-phase handler in useDocumentEvents. This lets us call
stopImmediatePropagation() to prevent tldraw from also handling the key.
*/
