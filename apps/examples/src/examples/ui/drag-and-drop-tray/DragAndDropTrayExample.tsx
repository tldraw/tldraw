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
						...current.item.shapeBase,
						x: pagePoint.x - 50, // center on cursor at 100x100
						y: pagePoint.y - 50,
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
This example builds a tray of items that can be dragged onto the canvas to create shapes.
The tray is a custom `InFrontOfTheCanvas` component, so it renders over the canvas but
inside tldraw's UI layer, and it drives the interaction with its own small state machine.

[1]
`DragState` is a discriminated union: `idle`, `pointing_item` (pointer is down but hasn't
moved far enough to count as a drag), and `dragging`. Modelling it this way means each
handler only has to deal with the transitions that are valid from its current state.

[2]
`rTrayContainer` is used for bounds checking (we hide the preview while the pointer is
still over the tray) and `rDraggingImage` is the preview element that follows the cursor.

[3]
`useAtom` gives us a reactive atom that both the memoized event handlers and the
`useQuickReactor` below can read without being recreated when the state changes.

[4]
The handlers are created once in `useMemo` and read the atom directly, so they don't go
stale.
	[a] We only enter `dragging` after the pointer moves more than 10px, so a plain click
	on a tray item doesn't accidentally create a shape.
	[b] While dragging we just track the pointer position; the preview is positioned in [5].
	[c] On pointer up while dragging, convert the screen point to page space with
	`editor.screenToPage()` and create the shape there. `markHistoryStoppingPoint` makes
	each drop its own undo step.
	[d] On pointer down we capture the pointer on the item element, so we keep receiving
	move/up events even when the pointer leaves it. The item index comes from a `data-`
	attribute so one handler serves every item.

[5]
`useQuickReactor` runs synchronously whenever `dragState` changes and writes styles to the
preview element directly. Positioning via the DOM rather than React state avoids a React
render on every pointer move. The offset by `getViewportScreenBounds()` converts the
client coordinates to coordinates relative to the editor container, which is what an
`InFrontOfTheCanvas` component is positioned against.

[6]
Each tray item gets the shared pointer handlers and a `data-drag_item_index` attribute
that [4d] reads back.

[7]
The preview element only has content while dragging; [5] handles showing and hiding it.

[8]
`components` is defined at module level so `<Tldraw>` doesn't see a new object on every
render, which would remount the UI.
*/
