import {
	AssetToolbarItem,
	createShapeId,
	DefaultActionsMenu,
	DefaultQuickActions,
	DefaultToolbar,
	DrawToolbarItem,
	Editor,
	HandToolbarItem,
	NoteToolbarItem,
	onDragFromToolbarToCreateShape,
	RectangleToolbarItem,
	SelectToolbarItem,
	TextToolbarItem,
	TldrawUiMenuGroup,
	TLShapeId,
	TLUiOverrides,
	ToolbarItem,
	useEditor,
	Vec,
} from 'tldraw'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { getNodeDefinitions, NodeType } from '../nodes/nodeTypes'
import { TemplatePicker } from './TemplatePicker'

function createNodeShape(editor: Editor, shapeId: TLShapeId, center: Vec, node: NodeType) {
	const markId = editor.markHistoryStoppingPoint('create node')

	editor.run(() => {
		editor.createShape({
			id: shapeId,
			type: 'node',
			props: { node },
		})

		const shape = editor.getShape<NodeShape>(shapeId)!
		const shapeBounds = editor.getShapePageBounds(shapeId)!

		const x = center.x - shapeBounds.width / 2
		const y = center.y - shapeBounds.height / 2
		editor.updateShape({ ...shape, x, y })

		editor.select(shapeId)
	})

	return markId
}

export const overrides: TLUiOverrides = {
	tools: (editor, tools, _) => {
		for (const nodeDef of Object.values(getNodeDefinitions(editor))) {
			if (nodeDef.hidden) continue
			tools[`node-${nodeDef.type}`] = {
				id: `node-${nodeDef.type}`,
				label: nodeDef.title,
				icon: nodeDef.icon,
				onSelect: () => {
					createNodeShape(
						editor,
						createShapeId(),
						editor.getViewportPageBounds().center,
						nodeDef.getDefault()
					)
				},
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
