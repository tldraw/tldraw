import { useState } from 'react'
import {
	DefaultToolbar,
	DefaultToolbarContent,
	StateNode,
	TLComponents,
	Tldraw,
	TldrawUiButtonIcon,
	TldrawUiMenuItem,
	TldrawUiPopover,
	TldrawUiPopoverContent,
	TldrawUiPopoverTrigger,
	TldrawUiToolbar,
	TldrawUiToolbarButton,
	TLKeyboardEventInfo,
	tlmenus,
	TLPointerEventInfo,
	TLShape,
	TLShapeId,
	TLUiAssetUrlOverrides,
	TLUiOverrides,
	track,
	useEditor,
	useTools,
	useValue,
} from 'tldraw'
import { CustomHandles } from './CustomHandles'
import { GlobBinding, GlobBindingUtil } from './GlobBindingUtil'
import { GlobShape, GlobShapeUtil } from './GlobShapeUtil'
import { GlobTool } from './GlobTool/GlobTool'
import { NodeShape, NodeShapeUtil } from './NodeShapeUtil'

const customAssetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'glob-icon': '/glob-icon.svg',
		'node-icon': '/node-icon.svg',
		'connect-node-icon': '/connect-node.svg',
	},
}

const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools['glob.node'] = {
			id: 'glob.node',
			icon: 'node-icon',
			label: 'Node',
			kbd: 'n',
			meta: { variant: 'node' },
			onSelect: () => {
				editor.setCurrentTool('glob.node')
			},
		}

		tools['glob.connect'] = {
			id: 'glob.connect',
			icon: 'connect-node-icon',
			label: 'Connect Nodes',
			kbd: 'c',
			meta: { variant: 'connect' },
			onSelect: () => {
				// Only allow connecting if nodes are selected
				const selectedShapes = editor.getSelectedShapes()
				const hasNodesSelected =
					selectedShapes.length > 0 &&
					selectedShapes.every((shape) => editor.isShapeOfType<NodeShape>(shape, 'node'))
				if (hasNodesSelected) {
					editor.setCurrentTool('glob.connect')
				}
			},
		}

		return tools
	},
}

const GlobToolWithPopover = track(() => {
	const tools = useTools()

	const editor = useEditor()
	const [isOpen, setIsOpen] = useState(false)

	const currentGlobTool = useValue(
		'current glob tool',
		() => {
			const tool = editor.getPath()
			if (tool === 'glob.connect') return 'glob.connect'
			return 'glob.node'
		},
		[editor]
	)

	// Check if any nodes are selected
	const hasNodesSelected = useValue(
		'has nodes selected',
		() => {
			const selectedShapes = editor.getSelectedShapes()
			return (
				selectedShapes.length > 0 &&
				selectedShapes.every((shape) => editor.isShapeOfType<NodeShape>(shape, 'node'))
			)
		},
		[editor]
	)

	const isSelected = editor.getPath() === currentGlobTool
	const popoverId = 'glob-tool-popover'

	const handleToolSelect = (id: string) => {
		if (id === 'glob.connect' && !hasNodesSelected) return
		editor.setCurrentTool(id)
		tlmenus.deleteOpenMenu(popoverId, editor.contextId)
		setIsOpen(false)
	}

	return (
		<>
			<TldrawUiPopover id={popoverId} open={isOpen} onOpenChange={setIsOpen}>
				<TldrawUiPopoverTrigger>
					<TldrawUiToolbarButton title="Glob" type="tool">
						<TldrawUiButtonIcon icon="glob-icon" />
					</TldrawUiToolbarButton>
				</TldrawUiPopoverTrigger>
				<TldrawUiPopoverContent side="top" align="center">
					<TldrawUiToolbar label="Glob">
						<TldrawUiToolbarButton
							title="Add Node"
							type="tool"
							onClick={() => handleToolSelect('glob.node')}
						>
							<TldrawUiButtonIcon icon="node-icon" />
						</TldrawUiToolbarButton>
						<TldrawUiToolbarButton
							title="Connect Nodes"
							type="tool"
							onClick={() => handleToolSelect('glob.connect')}
							disabled={!hasNodesSelected}
						>
							<TldrawUiButtonIcon icon="connect-node-icon" />
						</TldrawUiToolbarButton>
					</TldrawUiToolbar>
				</TldrawUiPopoverContent>
				<TldrawUiMenuItem {...tools[currentGlobTool]} isSelected={isSelected} />
			</TldrawUiPopover>
		</>
	)
})

const components: TLComponents = {
	Toolbar: (props) => {
		return (
			<DefaultToolbar {...props}>
				<GlobToolWithPopover />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	Handles: CustomHandles,
}

const shapes = [NodeShapeUtil, GlobShapeUtil]
const tools = [GlobTool]
const bindings = [GlobBindingUtil]

export default function GlobsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				options={{
					spacebarPanning: false,
				}}
				onMount={(editor) => {
					editor.updateInstanceState({ isDebugMode: true })

					// Override dragging_handle state to prevent space from interrupting handle dragging
					const draggingHandleState = editor.getStateDescendant<StateNode>('select.dragging_handle')

					if (draggingHandleState) {
						const originalOnKeyDown = draggingHandleState.onKeyDown?.bind(draggingHandleState)

						draggingHandleState.onKeyDown = (info: TLKeyboardEventInfo) => {
							originalOnKeyDown?.(info)
						}
					}

					// Override pointing_handle state to allow handle dragging with modifier keys, otherwise
					// it starts brushing instead
					const pointingHandleState = editor.getStateDescendant<StateNode>('select.pointing_handle')

					if (!pointingHandleState) {
						throw new Error('SelectTool pointing_handle state not found')
					}

					// Store original handlers with proper binding
					const originalOnPointerMove = pointingHandleState.onPointerMove?.bind(pointingHandleState)

					// Return to idle state after dragging a handle
					pointingHandleState.onPointerMove = (info: TLPointerEventInfo) => {
						if (!info.shape) return

						if (editor.isShapeOfType<GlobShape>(info.shape, 'glob')) {
							editor.updateInstanceState({ isToolLocked: true })
							editor.setCurrentTool('select.dragging_handle', {
								...info,
							})
							return
						}

						originalOnPointerMove?.(info)
					}

					// if we have a just a glob selected, expand the selection to include the nodes it's connected to
					const originalGetContent = editor.getContentFromCurrentPage.bind(editor)
					editor.getContentFromCurrentPage = (shapes) => {
						// Extract shape IDs
						const ids =
							typeof shapes[0] === 'string'
								? (shapes as TLShapeId[])
								: (shapes as TLShape[]).map((s) => s.id)

						// Expand selection to include bound nodes for any globs
						const expandedIds = new Set(ids)

						for (const id of ids) {
							const shape = editor.getShape(id)
							if (shape && editor.isShapeOfType<GlobShape>(shape, 'glob')) {
								const bindings = editor.getBindingsFromShape<GlobBinding>(id, 'glob')
								for (const binding of bindings) {
									expandedIds.add(binding.toId)
								}
							}
						}

						// Call original with expanded selection
						return originalGetContent(Array.from(expandedIds))
					}
				}}
				shapeUtils={shapes}
				tools={tools}
				bindingUtils={bindings}
				overrides={uiOverrides}
				assetUrls={customAssetUrls}
				components={components}
			/>
		</div>
	)
}
