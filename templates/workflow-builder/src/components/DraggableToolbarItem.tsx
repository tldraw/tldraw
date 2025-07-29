import React, { ReactElement } from 'react'
import { GeoShapeGeoStyle, TLGeoShapeGeoStyle, TLShapeId, useEditor, useTools, Vec } from 'tldraw'
import { useDragToCreate } from '../hooks/useDragToCreate'

export interface DraggableToolbarItemProps {
	children: ReactElement
	toolId: string
	// Optional: custom shape creation function
	createShape?: (shapeId: TLShapeId, center: Vec, toolId: string) => string
	// Optional: called when drag starts instead of creating a shape
	onDragStart?: (shapeId: TLShapeId, position: Vec, toolId: string) => void
}

export function DraggableToolbarItem({
	children,
	toolId,
	createShape,
	onDragStart,
}: DraggableToolbarItemProps) {
	const editor = useEditor()
	const tools = useTools()
	const tool = tools[toolId]

	// Default shape creation for basic tools
	const defaultCreateShape = (shapeId: TLShapeId, center: Vec, toolId: string) => {
		const markId = editor.markHistoryStoppingPoint(`create ${toolId}`)

		editor.run(() => {
			// Switch to the tool first
			if (tool?.onSelect) {
				tool.onSelect('toolbar')
			}

			// For geometry tools, create the shape directly
			if (GeoShapeGeoStyle.values.includes(toolId as TLGeoShapeGeoStyle)) {
				editor.createShape({
					id: shapeId,
					type: 'geo',
					x: center.x,
					y: center.y,
					props: {
						geo: toolId as any,
						w: toolId === 'oval' ? 50 : 100,
						h: 100,
					},
				})
				editor.select(shapeId)
			} else {
				editor.createShape({
					id: shapeId,
					type: toolId,
					x: center.x,
					y: center.y,
					props: {},
				})
				editor.select(shapeId)
				editor.setCurrentTool(toolId === 'note' ? 'select' : toolId)
			}

			const shapeBounds = editor.getShapePageBounds(shapeId)!
			const nudgeAmount = Vec.Sub(center, shapeBounds.center)
			editor.nudgeShapes([shapeId], nudgeAmount)
		})

		return markId
	}

	// Configure the drag hook
	const { handlePointerDown } = useDragToCreate<string>({
		createShapeOnDrag: !onDragStart, // Only create shape if no custom drag handler
		createShape: createShape || defaultCreateShape,
		onDragStart,
		onClick: (_center: Vec, _toolId: string) => {
			// On click (no drag), just activate the tool normally
			if (tool?.onSelect) {
				tool.onSelect('toolbar')
			}
		},
	})

	// Wrap the toolbar item in a div with drag functionality
	return (
		<div
			onPointerDown={(e: React.PointerEvent) => {
				// Check if it's a left click
				if (e.button === 0) {
					handlePointerDown(e, toolId)
				}
			}}
			style={{ cursor: 'grab' }}
		>
			{children}
		</div>
	)
}
