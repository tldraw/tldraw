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
import { GlobBinding, GlobBindingUtil } from './GlobBindingUtil'
import { GlobShape, GlobShapeUtil } from './GlobShapeUtil'
import { GlobTool } from './GlobTool/GlobTool'
import { NodeShape, NodeShapeUtil } from './NodeShapeUtil'

// There's a guide at the bottom of this file!

const customAssetUrls: TLUiAssetUrlOverrides = {
	icons: {
		'glob-icon': '/glob-icon.svg',
		'node-icon': '/node-icon.svg',
		'connect-node-icon': '/connect-node.svg',
	},
}

// [1]
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
			label: 'Connect nodes',
			kbd: 'c',
			meta: { variant: 'connect' },
			onSelect: () => {
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

// [2]
const GlobToolWithPopover = track(function GlobToolWithPopover() {
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
							title="Add node"
							type="tool"
							onClick={() => handleToolSelect('glob.node')}
						>
							<TldrawUiButtonIcon icon="node-icon" />
						</TldrawUiToolbarButton>
						<TldrawUiToolbarButton
							title="Connect nodes"
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
}

type PointingHandleState = StateNode & {
	info?: TLPointerEventInfo & { target: 'handle' }
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
					// [3]
					const pointingHandleState =
						editor.getStateDescendant<PointingHandleState>('select.pointing_handle')

					if (!pointingHandleState) {
						throw new Error('SelectTool pointing_handle state not found')
					}

					const originalOnPointerMove = pointingHandleState.onPointerMove?.bind(pointingHandleState)

					// The live move event has target 'canvas' (no shape/handle), so read the shape and
					// handle from the info the state stored when the user pointed down on the handle.
					pointingHandleState.onPointerMove = (info: TLPointerEventInfo) => {
						if (!editor.inputs.getIsDragging()) {
							originalOnPointerMove?.(info)
							return
						}

						const handleInfo = pointingHandleState.info
						if (handleInfo?.target !== 'handle') {
							originalOnPointerMove?.(info)
							return
						}

						if (editor.isShapeOfType<GlobShape>(handleInfo.shape, 'glob')) {
							editor.updateInstanceState({ isToolLocked: true })
							editor.setCurrentTool('select.dragging_handle', {
								...handleInfo,
							})
							return
						}

						originalOnPointerMove?.(info)
					}

					// [4]
					const originalGetContent = editor.getContentFromCurrentPage.bind(editor)
					editor.getContentFromCurrentPage = (shapes) => {
						const ids =
							typeof shapes[0] === 'string'
								? (shapes as TLShapeId[])
								: (shapes as TLShape[]).map((s) => s.id)

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

/*
Introduction:

A small vector editor built from globs, the shape primitive from the paper linked in the
README. A `node` is a circle; a `glob` is a skin stretched between two nodes, attached to them
with `glob` bindings so the glob follows when a node moves, and edited through handles on the
glob shape. See NodeShapeUtil.tsx, GlobShapeUtil.tsx, GlobBindingUtil.tsx, and GlobTool/ for
those pieces; this file wires the tool into the UI.

[1]
The glob tool has two child states, `glob.node` and `glob.connect`. Registering both in the
`tools` override gives them labels, icons, and shortcuts (N and C). Connect only makes sense
with nodes selected, so its `onSelect` checks the selection first.

[2]
A toolbar item that opens a popover with the two variants, built from `TldrawUiPopover` and
`TldrawUiToolbar`. The main item shows whichever glob state is current so the toolbar
highlights it while active.

[3]
Patching the select tool's `pointing_handle` state so dragging a glob handle starts the drag
immediately, even with modifier keys held (which would otherwise start brushing). This is
reaching into the SDK's internals and is fragile across versions; a custom select tool would be
the sturdier approach, but this is far less code for an example.

[4]
When globs are copied or duplicated, include the nodes they're bound to. Otherwise a pasted
glob has bindings to nodes that don't exist in the paste and gets cleaned up.
*/
