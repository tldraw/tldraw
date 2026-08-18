import {
	AssetToolbarItem,
	CheckBoxToolbarItem,
	CloudToolbarItem,
	createShapeId,
	DefaultToolbar,
	DiamondToolbarItem,
	DrawToolbarItem,
	Editor,
	EllipseToolbarItem,
	HandToolbarItem,
	HeartToolbarItem,
	HexagonToolbarItem,
	HighlightToolbarItem,
	LaserToolbarItem,
	NoteToolbarItem,
	onDragFromToolbarToCreateShape,
	OvalToolbarItem,
	RectangleToolbarItem,
	RhombusToolbarItem,
	SelectToolbarItem,
	StarToolbarItem,
	TextToolbarItem,
	TldrawUiMenuGroup,
	tlmenus,
	TLUiOverrides,
	ToolbarItem,
	TriangleToolbarItem,
	Vec,
	XBoxToolbarItem,
} from 'tldraw'
import { getNodeDefinitions, NodeType } from '../nodes/nodeTypes'
import { MATH_MENU_ID, MathematicalToolbarItem } from './MathematicalToolbarItem'

/** Create a node centered on `center` and select it. */
function createNodeShape(editor: Editor, center: Vec, node: NodeType) {
	editor.markHistoryStoppingPoint('create node')

	editor.run(() => {
		const shapeId = createShapeId()
		editor.createShape({ id: shapeId, type: 'node', props: { node } })

		const shapeBounds = editor.getShapePageBounds(shapeId)!
		editor.updateShape({
			id: shapeId,
			type: 'node',
			x: center.x - shapeBounds.width / 2,
			y: center.y - shapeBounds.height / 2,
		})
		editor.select(shapeId)
	})
}

export const overrides: TLUiOverrides = {
	tools: (editor, tools) => {
		for (const nodeDef of Object.values(getNodeDefinitions(editor))) {
			tools[`node-${nodeDef.type}`] = {
				id: `node-${nodeDef.type}`,
				label: nodeDef.title,
				icon: nodeDef.icon,
				onSelect: () => {
					createNodeShape(editor, editor.getViewportPageBounds().center, nodeDef.getDefault())
					tlmenus.deleteOpenMenu(MATH_MENU_ID, editor.contextId)
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
						onDragEnd: () => {
							tlmenus.deleteOpenMenu(MATH_MENU_ID, editor.contextId)
						},
					})
				},
			}
		}
		return tools
	},
}

export function WorkflowToolbar() {
	return (
		<DefaultToolbar orientation="vertical" maxItems={8}>
			<TldrawUiMenuGroup id="selection">
				<SelectToolbarItem />
				<HandToolbarItem />
				<DrawToolbarItem />
				<NoteToolbarItem />
			</TldrawUiMenuGroup>

			<TldrawUiMenuGroup id="nodes">
				<MathematicalToolbarItem />
				<ToolbarItem tool="node-slider" />
				<ToolbarItem tool="node-conditional" />
				<ToolbarItem tool="node-earthquake" />
			</TldrawUiMenuGroup>

			<TldrawUiMenuGroup id="shapes">
				<RectangleToolbarItem />
				<EllipseToolbarItem />
				<TriangleToolbarItem />
				<DiamondToolbarItem />

				<HexagonToolbarItem />
				<OvalToolbarItem />
				<RhombusToolbarItem />
				<StarToolbarItem />

				<CloudToolbarItem />
				<HeartToolbarItem />
				<XBoxToolbarItem />
				<CheckBoxToolbarItem />

				<TextToolbarItem />
				<AssetToolbarItem />
				<HighlightToolbarItem />
				<LaserToolbarItem />
			</TldrawUiMenuGroup>
		</DefaultToolbar>
	)
}
