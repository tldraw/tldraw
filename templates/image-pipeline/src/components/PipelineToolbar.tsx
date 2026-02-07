import {
	AssetToolbarItem,
	createShapeId,
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
	Vec,
} from 'tldraw'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { getNodeDefinitions, NodeType } from '../nodes/nodeTypes'

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
	return (
		<DefaultToolbar orientation="vertical" maxItems={18}>
			<TldrawUiMenuGroup id="selection">
				<SelectToolbarItem />
				<HandToolbarItem />
			</TldrawUiMenuGroup>

			<TldrawUiMenuGroup id="inputs">
				<ToolbarItem tool="node-model" />
				<ToolbarItem tool="node-prompt" />
				<ToolbarItem tool="node-prompt_concat" />
				<ToolbarItem tool="node-load_image" />
				<ToolbarItem tool="node-number" />
			</TldrawUiMenuGroup>

			<TldrawUiMenuGroup id="process">
				<ToolbarItem tool="node-generate" />
				<ToolbarItem tool="node-controlnet" />
				<ToolbarItem tool="node-blend" />
				<ToolbarItem tool="node-adjust" />
				<ToolbarItem tool="node-upscale" />
			</TldrawUiMenuGroup>

			<TldrawUiMenuGroup id="output">
				<ToolbarItem tool="node-preview" />
			</TldrawUiMenuGroup>

			<TldrawUiMenuGroup id="utility">
				<ToolbarItem tool="node-router" />
				<ToolbarItem tool="node-iterator" />
			</TldrawUiMenuGroup>

			<TldrawUiMenuGroup id="shapes">
				<DrawToolbarItem />
				<NoteToolbarItem />
				<RectangleToolbarItem />
				<TextToolbarItem />
				<AssetToolbarItem />
			</TldrawUiMenuGroup>
		</DefaultToolbar>
	)
}
