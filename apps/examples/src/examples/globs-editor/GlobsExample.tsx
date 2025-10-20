import { useState } from 'react'
import {
	DefaultToolbar,
	DefaultToolbarContent,
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
	TLUiAssetUrlOverrides,
	TLUiOverrides,
	track,
	useEditor,
	useTools,
	useValue,
} from 'tldraw'
import { NodeShapeUtil } from './Node'
import { GlobTool } from './glob-tools/GlobTool'

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
				editor.setCurrentTool('glob.connect')
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
			return selectedShapes.length > 0 && selectedShapes.every((shape) => shape.type === 'node')
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
}

const shapes = [NodeShapeUtil]
const tools = [GlobTool]

export default function GlobsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapes}
				tools={tools}
				overrides={uiOverrides}
				assetUrls={customAssetUrls}
				components={components}
			/>
		</div>
	)
}
