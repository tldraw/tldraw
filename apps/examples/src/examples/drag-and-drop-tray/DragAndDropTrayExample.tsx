import React, { useCallback, useEffect, useRef } from 'react'
import {
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
			startPosition: { x: number; y: number }
	  }
	| {
			name: 'dragging'
			item: TrayItem
			startPosition: { x: number; y: number }
			currentPosition: { x: number; y: number }
	  }

function useDragAndDrop() {
	const editor = useEditor()

	const dragState = useAtom<DragState>('dragState', () => ({
		name: 'idle',
	}))

	const handlePointerMove = useCallback(
		(e: PointerEvent) => {
			const current = dragState.get()
			const viewport = editor.getViewportScreenBounds()
			const canvasPoint = editor.screenToPage({
				x: e.clientX - viewport.x,
				y: e.clientY - viewport.y,
			})
			switch (current.name) {
				case 'idle': {
					break
				}
				case 'pointing_item': {
					const dist = Vec.Dist(canvasPoint, current.startPosition)
					if (dist > 10) {
						dragState.set({
							name: 'dragging',
							item: current.item,
							startPosition: { x: canvasPoint.x, y: canvasPoint.y },
							currentPosition: canvasPoint,
						})
					}
					break
				}
				case 'dragging': {
					dragState.set({
						...current,
						currentPosition: canvasPoint,
					})
					break
				}
			}
		},
		[dragState, editor]
	)

	const handlePointerUp = useCallback(
		(e: PointerEvent) => {
			const current = dragState.get()
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
					const viewport = editor.getViewportScreenBounds()
					const canvasPoint = editor.screenToPage({
						x: e.clientX - viewport.x,
						y: e.clientY - viewport.y,
					})

					editor.createShape({
						type: current.item.shapeType,
						x: canvasPoint.x - 50, // center on cursor at 100x100
						y: canvasPoint.y - 50,
						props: current.item.shapeProps,
					})

					dragState.set({
						name: 'idle',
					})
					break
				}
			}
		},
		[dragState, editor]
	)

	const handlePointerCancel = useCallback(() => {
		dragState.set({
			name: 'idle',
		})
	}, [dragState])

	const removeEventListeners = useCallback(() => {
		document.removeEventListener('pointermove', handlePointerMove)
		document.removeEventListener('pointerup', handlePointerUp)
		document.removeEventListener('pointercancel', handlePointerCancel)
	}, [handlePointerMove, handlePointerUp, handlePointerCancel])

	const handlePointerDown = useCallback(
		(e: React.PointerEvent, item: TrayItem) => {
			e.preventDefault()

			if (!item) return

			const startPosition = { x: e.clientX, y: e.clientY }

			dragState.set({
				name: 'pointing_item',
				item,
				startPosition,
			})

			document.addEventListener('pointermove', handlePointerMove)
			document.addEventListener('pointerup', handlePointerUp)
			document.addEventListener('pointercancel', handlePointerCancel)
		},
		[handlePointerMove, handlePointerUp, handlePointerCancel, dragState]
	)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const current = dragState.get()
			if (e.key === 'Escape' && current.name === 'dragging') {
				dragState.set({
					name: 'idle',
				})
				removeEventListeners()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('keydown', handleKeyDown)
			removeEventListeners()
		}
	}, [dragState, removeEventListeners])

	return {
		dragState,
		handlePointerDown,
	}
}

const DragAndDropTray = () => {
	const { dragState, handlePointerDown: handlePointerDownOverItem } = useDragAndDrop()

	const dragImageRef = useRef<HTMLDivElement>(null)
	const state = useValue('dragState', () => dragState.get(), [dragState])

	useQuickReactor(
		'drag-image-style',
		() => {
			const current = dragState.get()
			const imageRef = dragImageRef.current
			if (!imageRef) return

			switch (current.name) {
				case 'idle':
				case 'pointing_item': {
					imageRef.style.display = 'none'
					break
				}
				case 'dragging': {
					imageRef.style.display = 'block'
					imageRef.style.position = 'absolute'
					imageRef.style.pointerEvents = 'none'
					imageRef.style.left = '0px'
					imageRef.style.top = '0px'
					imageRef.style.transform = `translate(${current.currentPosition.x - 25}px, ${current.currentPosition.y - 25}px)`
					imageRef.style.width = '50px'
					imageRef.style.height = '50px'
					imageRef.style.fontSize = '40px'
					imageRef.style.display = 'flex'
					imageRef.style.alignItems = 'center'
				}
			}
		},
		[dragState]
	)

	return (
		<>
			<div className="drag-tray">
				<div className="drag-tray-header">
					<h3>Drag & Drop Tray</h3>
					<p>Drag items onto the canvas</p>
				</div>
				<div className="drag-tray-items">
					{TRAY_ITEMS.map((item) => (
						<div
							key={item.id}
							className={`drag-tray-item ${state.name === 'dragging' && state.item?.id === item.id ? 'dragging' : ''}`}
							onPointerDown={(e) => handlePointerDownOverItem(e, item)}
						>
							<span className="drag-tray-item-emoji">{item.emoji}</span>
							<span className="drag-tray-item-label">{item.label}</span>
						</div>
					))}
				</div>
				{state.name === 'dragging' && (
					<div className="drag-tray-help">
						<p>Release to drop • Press ESC to cancel</p>
					</div>
				)}
			</div>
			{state.name === 'dragging' && state.item && <div ref={dragImageRef}>{state.item.emoji}</div>}
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
