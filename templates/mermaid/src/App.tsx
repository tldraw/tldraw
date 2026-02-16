/**
 * Mermaid starter kit - Two-way converter between Mermaid code and tldraw shapes
 */

import { createShapeId, Tldraw, TLUiOverrides, Vec } from 'tldraw'
import 'tldraw/tldraw.css'
import { CODE_BLOCK_SHAPE_TYPE } from './shapes/CodeBlockShape'
import { CodeBlockShapeUtil } from './shapes/CodeBlockShapeUtil'
import { CodeBlockTool } from './tools/CodeBlockTool'
import { convertShapesToCode } from './utils/convertShapesToCode'
import { createOrUpdateLinkFrame } from './utils/createLinkFrame'

// Custom UI overrides to add code block tool and convert actions
const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools['code-block'] = {
			id: 'code-block',
			icon: 'code',
			label: 'Code Block',
			kbd: 'c',
			onSelect: () => {
				editor.setCurrentTool('code-block')
			},
		}
		return tools
	},
	actions(editor, actions) {
		actions['convert-to-code'] = {
			id: 'convert-to-code',
			label: () => {
				const selectedShapeIds = editor.getSelectedShapeIds()
				// Check if any selected shape is linked to a code block
				const hasLinkedCodeBlock = selectedShapeIds.some((id) => {
					const shape = editor.getShape(id)
					return shape?.meta.codeBlockId && editor.getShape(shape.meta.codeBlockId as string)
				})
				return hasLinkedCodeBlock ? '↻ Update Code Block' : '◀ Convert to Mermaid Code'
			},
			icon: 'code',
			kbd: 'shift+m',
			readonlyOk: true,
			onSelect: async () => {
				const selectedShapeIds = editor.getSelectedShapeIds()
				if (selectedShapeIds.length === 0) {
					window.alert('Please select shapes to convert to code')
					return
				}

				try {
					console.log('Convert to code action - selected shapes:', selectedShapeIds)

					// Convert shapes to code
					const result = await convertShapesToCode(editor, selectedShapeIds)

					console.log('Convert result:', result)

					// If a code block was updated, select it
					if (result.codeBlockId) {
						console.log('Updated existing code block:', result.codeBlockId)
						editor.select(result.codeBlockId)
					} else {
						console.log('Creating new code block')

						// Create a new code block with the generated code
						const bounds = editor.getSelectionPageBounds()
						const position = bounds ? new Vec(bounds.maxX + 100, bounds.minY) : new Vec(0, 0)

						const shapeId = createShapeId()
						editor.createShape({
							id: shapeId,
							type: CODE_BLOCK_SHAPE_TYPE,
							x: position.x,
							y: position.y,
							props: {
								code: result.code,
								language: 'mermaid',
								w: 400,
								h: 300,
							},
							meta: {
								linkedShapeIds: selectedShapeIds,
							},
						})

						// Filter out code block shapes from linking
						const diagramShapeIds = selectedShapeIds.filter((id) => {
							const shape = editor.getShape(id)
							return shape && shape.type !== CODE_BLOCK_SHAPE_TYPE
						})

						// Update the shapes to link back to the code block
						for (const selectedId of diagramShapeIds) {
							const shape = editor.getShape(selectedId)
							if (shape) {
								editor.updateShape({
									id: selectedId,
									type: shape.type,
									meta: {
										...shape.meta,
										codeBlockId: shapeId,
									},
								})
							}
						}

						// Create a frame around the linked diagram shapes
						if (diagramShapeIds.length > 0) {
							createOrUpdateLinkFrame(editor, diagramShapeIds, shapeId)
						}

						// Select the new code block
						editor.select(shapeId)
					}
				} catch (error) {
					console.error('Failed to convert shapes to code:', error)
					window.alert(`Failed to convert: ${error.message}`)
				}
			},
		}
		return actions
	},
	contextMenu(editor, contextMenu, { actions }) {
		// Add convert to code to context menu when shapes are selected
		const selectedShapeIds = editor.getSelectedShapeIds()
		if (selectedShapeIds.length > 0) {
			// Add at the beginning of the context menu
			contextMenu.unshift({
				id: 'mermaid-convert',
				type: 'group',
				children: [
					{
						id: 'convert-to-code',
						type: 'item',
						actionItem: actions['convert-to-code'],
					},
				],
			})
		}
		return contextMenu
	},
	menu(editor, menu, { actions }) {
		// Add to the main menu
		menu.unshift({
			id: 'mermaid',
			type: 'group',
			children: [
				{
					id: 'convert-to-code',
					type: 'item',
					actionItem: actions['convert-to-code'],
				},
			],
		})
		return menu
	},
}

// Custom shape utilities
const customShapeUtils = [CodeBlockShapeUtil]

// Custom tools
const customTools = [CodeBlockTool]

export default function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				shapeUtils={customShapeUtils}
				tools={customTools}
				overrides={uiOverrides}
				persistenceKey={null}
			/>
		</div>
	)
}
