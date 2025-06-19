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

const DragAndDropTray = () => {
	const rTrayContainer = useRef<HTMLDivElement>(null)
	const rDraggingImage = useRef<HTMLDivElement>(null)

	const editor = useEditor()

	const dragState = useAtom<DragState>('dragState', () => ({
		name: 'idle',
	}))

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
						dragState.set({
							name: 'dragging',
							item: current.item,
							currentPosition: screenPoint,
						})
					}
					break
				}
				case 'dragging': {
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
		}

		function handlePointerDown(e: React.PointerEvent) {
			e.preventDefault()
			target = e.currentTarget as HTMLDivElement
			target.setPointerCapture(e.pointerId)

			const itemIndex = target.dataset.drag_item_index!
			const item = TRAY_ITEMS[+itemIndex]

			if (!item) return

			const startPosition = new Vec(e.clientX, e.clientY)

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
				cancel()
			}
		}

		function cancel() {
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
						imageRef.style.transform = `translate(${current.currentPosition.x - viewportScreenBounds.x - 25}px, ${current.currentPosition.y - -viewportScreenBounds.y - 25}px)`
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
			<div ref={rDraggingImage}>{state.name === 'dragging' && state.item.emoji}</div>
		</>
	)
}

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
