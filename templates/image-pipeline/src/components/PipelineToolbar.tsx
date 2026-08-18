import {
	AssetToolbarItem,
	DefaultActionsMenu,
	DefaultQuickActions,
	DefaultToolbar,
	DrawToolbarItem,
	HandToolbarItem,
	NoteToolbarItem,
	onDragFromToolbarToCreateShape,
	RectangleToolbarItem,
	SelectToolbarItem,
	TextToolbarItem,
	TldrawUiMenuGroup,
	TLUiOverrides,
	ToolbarItem,
	useEditor,
} from 'tldraw'
import { getNodeDefinitions } from '../nodes/nodeTypes'
import { createNodeAtCenter } from './ImagePipelineSidebar'
import { TemplatePicker } from './TemplatePicker'

export const overrides: TLUiOverrides = {
	tools: (editor, tools, _) => {
		for (const nodeDef of Object.values(getNodeDefinitions(editor))) {
			if (nodeDef.hidden) continue
			tools[`node-${nodeDef.type}`] = {
				id: `node-${nodeDef.type}`,
				label: nodeDef.title,
				icon: nodeDef.icon,
				onSelect: () => createNodeAtCenter(editor, nodeDef.getDefault()),
				onDragStart: (_, info) => {
					onDragFromToolbarToCreateShape(editor, info, {
						createShape: (id) => {
							editor.createShape({
								id,
								type: 'node',
								props: { node: nodeDef.getDefault() },
							})
						},
					})
				},
			}
		}
		return tools
	},
}

export function PipelineToolbar() {
	const editor = useEditor()
	const nodeDefs = Object.values(getNodeDefinitions(editor)).filter((d) => !d.hidden)

	return (
		<DefaultToolbar>
			<TldrawUiMenuGroup id="selection">
				<SelectToolbarItem />
				<HandToolbarItem />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="shapes">
				<DrawToolbarItem />
				<NoteToolbarItem />
				<RectangleToolbarItem />
				<TextToolbarItem />
				<AssetToolbarItem />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="nodes">
				{nodeDefs.map((nodeDef) => (
					<ToolbarItem key={nodeDef.type} tool={`node-${nodeDef.type}`} />
				))}
			</TldrawUiMenuGroup>
			<TemplatePicker />
			<DefaultQuickActions />
			<DefaultActionsMenu />
		</DefaultToolbar>
	)
}
