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
	TLShapeId,
	TLUiOverrides,
	ToolbarItem,
	TriangleToolbarItem,
	Vec,
	XBoxToolbarItem,
} from 'tldraw'
import { NodeShape } from '../nodes/NodeShapeUtil'
import { getNodeDefinitions, NodeType } from '../nodes/nodeTypes'
import { MATH_MENU_ID, MathematicalToolbarItem } from './MathematicalToolbarItem'

function createNodeShape(editor: Editor, shapeId: TLShapeId, center: Vec, node: NodeType) {
	// Mark a history stopping point for undo/redo
	const markId = editor.markHistoryStoppingPoint('create node')

	editor.run(() => {
		// Create the shape with the node definition
		editor.createShape<NodeShape>({
			id: shapeId,
			type: 'node',
			props: { node },
		})

		// Get the created shape and its bounds
		const shape = editor.getShape<NodeShape>(shapeId)!
		const shapeBounds = editor.getShapePageBounds(shapeId)!

		// Position the shape so its center aligns with the drop point
		const x = center.x - shapeBounds.width / 2
		const y = center.y - shapeBounds.height / 2
		editor.updateShape({ ...shape, x, y })

		// Select the newly created shape
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
					tlmenus.deleteOpenMenu(MATH_MENU_ID, editor.contextId)
				},
				onDragStart: (_, info) => {
					onDragFromToolbarToCreateShape(editor, info, {
						createShape: (id) => {
							editor.createShape<NodeShape>({
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
