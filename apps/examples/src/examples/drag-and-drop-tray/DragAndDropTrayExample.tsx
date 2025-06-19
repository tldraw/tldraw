import { useMemo, useRef } from 'react'
import {
	Box,
	TLEditorComponents,
	Tldraw,
	Vec,
	useAtom,
	useEditor,
	useQuickReactor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './drag-and-drop-tray.css'
import { TRAY_ITEMS, TrayItem } from './trayitems'

// There's a guide at the bottom of this file!

// [1]
type DragState =
	| {
			name: 'idle'
	  }
	| {
			name: 'pointing_item'
			item: TrayItem
			startPosition: Vec
	  }
	| {
			name: 'dragging'
			item: TrayItem
			currentPosition: Vec
	  }

// [2]
const DragAndDropTray = () => {
	const rTrayContainer = useRef<HTMLDivElement>(null)
	const rDraggingImage = useRef<HTMLDivElement>(null)

	const editor = useEditor()

	// [3]
	const dragState = useAtom<DragState>('dragState', () => ({
		name: 'idle',
	}))

	// [4]
	const { handlePointerUp, handlePointerDown } = useMemo(() => {
		let target: HTMLDivElement | null = null

		function handlePointerMove(e: PointerEvent) {
			const current = dragState.get()
			const screenPoint = new Vec(e.clientX, e.clientY)

			switch (current.name) {
				case 'idle': {
					break
				}
				case 'pointing_item': {
					const dist = Vec.Dist(screenPoint, current.startPosition)
					if (dist > 10) {
						// [a]
						dragState.set({
							name: 'dragging',
							item: current.item,
							currentPosition: screenPoint,
						})
					}
					break
				}
				case 'dragging': {
					// [b]
					dragState.set({
						...current,
						currentPosition: screenPoint,
					})
					break
				}
			}
		}

		function handlePointerUp(e: React.PointerEvent) {
			const current = dragState.get()

			target = e.currentTarget as HTMLDivElement
			target.releasePointerCapture(e.pointerId)

			switch (current.name) {
				case 'idle': {
					break
				}
				case 'pointing_item': {
					dragState.set({
						name: 'idle',
					})
					break
				}
				case 'dragging': {
					// [c]
					const screenPoint = new Vec(e.clientX, e.clientY)
					const pagePoint = editor.screenToPage(screenPoint)

					editor.markHistoryStoppingPoint('create shape from tray')

					editor.createShape({
						type: current.item.shapeType,
						x: pagePoint.x - 50, // center on cursor at 100x100
						y: pagePoint.y - 50,
						props: current.item.shapeProps,
					})

					dragState.set({
						name: 'idle',
					})

					break
				}
			}

			removeEventListeners()
		}

		function handlePointerDown(e: React.PointerEvent) {
			e.preventDefault()
			target = e.currentTarget as HTMLDivElement
			target.setPointerCapture(e.pointerId)

			const itemIndex = target.dataset.drag_item_index!
			const item = TRAY_ITEMS[+itemIndex]

			if (!item) return

			const startPosition = new Vec(e.clientX, e.clientY)

			// [d]
			dragState.set({
				name: 'pointing_item',
				item,
				startPosition,
			})

			target.addEventListener('pointermove', handlePointerMove)
			document.addEventListener('keydown', handleKeyDown)
		}

		function handleKeyDown(e: KeyboardEvent) {
			const current = dragState.get()
			if (e.key === 'Escape' && current.name === 'dragging') {
				removeEventListeners()
			}
		}

		function removeEventListeners() {
			if (target) {
				target.removeEventListener('pointermove', handlePointerMove)
				document.removeEventListener('keydown', handleKeyDown)
			}

			dragState.set({
				name: 'idle',
			})
		}

		return {
			handlePointerDown,
			handlePointerUp,
		}
	}, [dragState, editor])

	const state = useValue('dragState', () => dragState.get(), [dragState])

	// [5]
	useQuickReactor(
		'drag-image-style',
		() => {
			const current = dragState.get()
			const imageRef = rDraggingImage.current
			const trayContainerRef = rTrayContainer.current
			if (!imageRef || !trayContainerRef) return

			switch (current.name) {
				case 'idle':
				case 'pointing_item': {
					imageRef.style.display = 'none'
					break
				}
				case 'dragging': {
					const trayContainerRect = trayContainerRef.getBoundingClientRect()
					const box = new Box(
						trayContainerRect.x,
						trayContainerRect.y,
						trayContainerRect.width,
						trayContainerRect.height
					)
					const viewportScreenBounds = editor.getViewportScreenBounds()
					const isInside = Box.ContainsPoint(box, current.currentPosition)
					if (isInside) {
						imageRef.style.display = 'none'
					} else {
						imageRef.style.display = 'block'
						imageRef.style.position = 'absolute'
						imageRef.style.pointerEvents = 'none'
						imageRef.style.left = '0px'
						imageRef.style.top = '0px'
						imageRef.style.transform = `translate(${current.currentPosition.x - viewportScreenBounds.x - 25}px, ${current.currentPosition.y - viewportScreenBounds.y - 25}px)`
						imageRef.style.width = '50px'
						imageRef.style.height = '50px'
						imageRef.style.fontSize = '40px'
						imageRef.style.display = 'flex'
						imageRef.style.alignItems = 'center'
					}
				}
			}
		},
		[dragState]
	)

	return (
		<>
			{/* [6] */}
			<div className="drag-tray" ref={rTrayContainer}>
				<div className="drag-tray-items">
					{TRAY_ITEMS.map((item, index) => (
						<div
							key={item.id}
							className="drag-tray-item"
							data-drag_item_index={index}
							onPointerDown={handlePointerDown}
							onPointerUp={handlePointerUp}
						>
							{item.emoji}
						</div>
					))}
				</div>
			</div>
			{/* [7] */}
			<div ref={rDraggingImage}>{state.name === 'dragging' && state.item.emoji}</div>
		</>
	)
}

// [8]
const components: TLEditorComponents = {
	InFrontOfTheCanvas: DragAndDropTray,
}

export default function DragAndDropTrayExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="drag-and-drop-tray-example" components={components} />
		</div>
	)
}

/*
Introduction:

This example demonstrates how to create a drag-and-drop tray component that allows users
to drag items from a custom UI tray and drop them onto the canvas as tldraw shapes. The
example uses a state machine pattern to manage the drag interaction states and creates
a custom UI component that renders in front of the canvas.

[1]
We define a union type `DragState` to represent the different states of our drag interaction:
- `idle`: Nothing is being dragged
- `pointing_item`: User has pressed down on an item but hasn't started dragging yet
- `dragging`: User is actively dragging an item

This state machine pattern helps us handle the complex drag interaction logic cleanly.

[2]
The main `DragAndDropTray` component uses two refs:
- `rTrayContainer`: References the tray container div for bounds checking
- `rDraggingImage`: References the dragging preview image that follows the cursor

We also get access to the tldraw editor instance to create shapes and handle coordinate
transformations.

[3]
We use tldraw's `useAtom` hook to create reactive state that can be observed and updated.
The `dragState` atom holds our current drag state and automatically triggers re-renders
when it changes.

[4]
The event handlers are memoized using `useMemo` to avoid recreating them on every render.
The main logic handles the drag interaction:

	[a] When transitioning from `pointing_item` to `dragging`, we check if the user has
	moved their pointer more than 10 pixels from the start position to avoid accidental
	drags from simple clicks.

	[b] During dragging, we continuously update the current position to track the cursor.

	[c] When the drag ends (pointer up during dragging), we convert the screen coordinates
	to page coordinates and create a new shape at that position using the editor API.

	[d] When starting a drag (pointer down), we capture the pointer, get the item data
	from the DOM, and transition to the `pointing_item` state.

[5]
The `useQuickReactor` hook efficiently manages the drag preview image styling. It:
- Hides the preview when not dragging
- Shows/hides the preview based on whether the cursor is inside the tray bounds
- Positions the preview image to follow the cursor during dragging
- Applies appropriate styling for the drag preview

[6]
The tray UI renders each item from `TRAY_ITEMS` with pointer event handlers attached.
We use `data-drag_item_index` to identify which item was clicked, allowing us to retrieve
the correct item data during drag operations.

[7]
The drag preview image is a separate div that shows the emoji being dragged. It's only
visible during the dragging state and follows the cursor position.

[8]
We configure the tldraw editor to include our custom tray component using the `components`
prop. The `InFrontOfTheCanvas` component renders on top of the canvas, making it perfect
for UI elements like our drag tray.
*/
