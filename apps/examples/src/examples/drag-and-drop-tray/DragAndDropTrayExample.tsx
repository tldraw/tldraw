import React, { useEffect, useRef, useState } from 'react'
import { TLEditorComponents, Tldraw, track, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './drag-and-drop-tray.css'

// There's a guide at the bottom of this file!

// [1]
interface TrayItem {
	id: string
	emoji: string
	label: string
	shapeType: 'geo' | 'text'
	shapeProps: any
}

const TRAY_ITEMS: TrayItem[] = [
	{
		id: 'snowman',
		emoji: '⛄',
		label: 'Snowman',
		shapeType: 'text',
		shapeProps: {
			text: '⛄',
			size: 'xl',
		},
	},
	{
		id: 'ice-cream',
		emoji: '🍦',
		label: 'Ice Cream',
		shapeType: 'text',
		shapeProps: {
			text: '🍦',
			size: 'xl',
		},
	},
	{
		id: 'smiley',
		emoji: '😊',
		label: 'Smiley',
		shapeType: 'text',
		shapeProps: {
			text: '😊',
			size: 'xl',
		},
	},
	{
		id: 'star',
		emoji: '⭐',
		label: 'Star',
		shapeType: 'text',
		shapeProps: {
			text: '⭐',
			size: 'xl',
		},
	},
	{
		id: 'heart',
		emoji: '❤️',
		label: 'Heart',
		shapeType: 'text',
		shapeProps: {
			text: '❤️',
			size: 'xl',
		},
	},
]

// [2]
interface DragState {
	isDragging: boolean
	item: TrayItem | null
	startPosition: { x: number; y: number } | null
	currentPosition: { x: number; y: number } | null
}

// [3]
const DragAndDropTray = track(() => {
	const editor = useEditor()
	const [dragState, setDragState] = useState<DragState>({
		isDragging: false,
		item: null,
		startPosition: null,
		currentPosition: null,
	})
	const dragImageRef = useRef<HTMLDivElement>(null)

	// [4]
	const handlePointerDown = (e: React.PointerEvent, item: TrayItem) => {
		e.preventDefault()
		const rect = e.currentTarget.getBoundingClientRect()
		const startPosition = { x: e.clientX, y: e.clientY }
		
		setDragState({
			isDragging: true,
			item,
			startPosition,
			currentPosition: startPosition,
		})

		// Capture pointer events on the document
		document.addEventListener('pointermove', handlePointerMove)
		document.addEventListener('pointerup', handlePointerUp)
		document.addEventListener('pointercancel', handlePointerCancel)
	}

	// [5]
	const handlePointerMove = (e: PointerEvent) => {
		if (!dragState.isDragging || !dragState.item) return

		setDragState((prev: DragState) => ({
			...prev,
			currentPosition: { x: e.clientX, y: e.clientY },
		}))
	}

	// [6]
	const handlePointerUp = (e: PointerEvent) => {
		if (!dragState.isDragging || !dragState.item) return

		// Convert screen coordinates to canvas coordinates
		const viewport = editor.getViewportScreenBounds()
		const canvasPoint = editor.screenToPage({
			x: e.clientX - viewport.x,
			y: e.clientY - viewport.y,
		})

		// Create the shape on the canvas
		const shapeId = editor.createShapeId()
		editor.createShape({
			id: shapeId,
			type: dragState.item.shapeType,
			x: canvasPoint.x,
			y: canvasPoint.y,
			props: dragState.item.shapeProps,
		})

		// Clean up
		cleanupDrag()
	}

	// [7]
	const handlePointerCancel = () => {
		cleanupDrag()
	}

	const cleanupDrag = () => {
		setDragState({
			isDragging: false,
			item: null,
			startPosition: null,
			currentPosition: null,
		})

		document.removeEventListener('pointermove', handlePointerMove)
		document.removeEventListener('pointerup', handlePointerUp)
		document.removeEventListener('pointercancel', handlePointerCancel)
	}

	// [8]
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && dragState.isDragging) {
				cleanupDrag()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('keydown', handleKeyDown)
			// Clean up pointer events if component unmounts during drag
			document.removeEventListener('pointermove', handlePointerMove)
			document.removeEventListener('pointerup', handlePointerUp)
			document.removeEventListener('pointercancel', handlePointerCancel)
		}
	}, [dragState.isDragging])

	// [9]
	const getDragImageStyle = (): React.CSSProperties => {
		if (!dragState.isDragging || !dragState.currentPosition || !dragState.startPosition) {
			return { display: 'none' }
		}

		return {
			position: 'fixed',
			left: dragState.currentPosition.x - 25,
			top: dragState.currentPosition.y - 25,
			width: 50,
			height: 50,
			fontSize: 40,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			pointerEvents: 'none',
			zIndex: 10000,
			opacity: 0.8,
		}
	}

	return (
		<>
			{/* [10] Main tray UI */}
			<div className="drag-tray">
				<div className="drag-tray-header">
					<h3>Drag & Drop Tray</h3>
					<p>Drag items onto the canvas</p>
				</div>
				<div className="drag-tray-items">
					{TRAY_ITEMS.map((item) => (
						<div
							key={item.id}
							className={`drag-tray-item ${dragState.isDragging && dragState.item?.id === item.id ? 'dragging' : ''}`}
							onPointerDown={(e) => handlePointerDown(e, item)}
						>
							<span className="drag-tray-item-emoji">{item.emoji}</span>
							<span className="drag-tray-item-label">{item.label}</span>
						</div>
					))}
				</div>
				{dragState.isDragging && (
					<div className="drag-tray-help">
						<p>Release to drop • Press ESC to cancel</p>
					</div>
				)}
			</div>

			{/* [11] Drag preview */}
			{dragState.isDragging && dragState.item && (
				<div ref={dragImageRef} style={getDragImageStyle()}>
					{dragState.item.emoji}
				</div>
			)}
		</>
	)
})

// [12]
const components: TLEditorComponents = {
	InFrontOfTheCanvas: DragAndDropTray,
}

export default function DragAndDropTrayExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				persistenceKey="drag-and-drop-tray-example"
				components={components}
			/>
		</div>
	)
}

/*

This example demonstrates how to create a drag and drop tray with items that can be 
dragged onto the canvas to create shapes.

[1] Define the tray items with their properties. Each item has an emoji, label, and 
shape configuration for when it's dropped on the canvas.

[2] Define the drag state interface to track the current drag operation.

[3] Create the main tray component using the track function to make it reactive to 
editor changes.

[4] Handle the start of a drag operation. We capture the pointer and set up event 
listeners on the document to track movement outside the tray.

[5] Handle pointer movement during drag. We update the current position to move the 
drag preview.

[6] Handle the end of a drag operation. We convert screen coordinates to canvas 
coordinates and create a shape at that position.

[7] Handle drag cancellation and cleanup.

[8] Add keyboard support to cancel drag operations with the Escape key.

[9] Calculate the position and style for the drag preview that follows the cursor.

[10] Render the main tray UI with draggable items.

[11] Render the drag preview that follows the cursor during drag operations.

[12] Define the components object and export the main example component.

*/