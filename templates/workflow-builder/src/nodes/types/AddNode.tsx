import { Editor, getIndexAbove, getIndicesBetween, IndexKey, T, useEditor } from 'tldraw'
import { NODE_HEADER_HEIGHT_PX, NODE_PORT_OFFSET_Y_PX, NODE_ROW_HEIGHT_PX } from '../../constants'
import { indexList, indexListEntries, indexListLength } from '../../utils'
import { getNodePortConnections } from '../nodePorts'
import { NodeShape } from '../NodeShapeUtil'
import { NodeBodyRow, NodeDefinition, outputPort, updateNode } from './shared'

export const AddNodeType = T.object({
	type: T.literal('add'),
	items: T.dict(T.indexKey, T.number),
})
export type AddNode = T.TypeOf<typeof AddNodeType>

export const AddNode: NodeDefinition<AddNode> = {
	type: 'add',
	validator: AddNodeType,
	title: 'Add',
	icon: '+',
	getDefault: () => ({
		type: 'add',
		items: indexList([0, 0]),
	}),
	getBodyHeightPx: (node) => NODE_ROW_HEIGHT_PX * indexListLength(node.items),
	getPorts: (node) => ({
		output: outputPort,
		...Object.fromEntries(
			Object.keys(node.items)
				.sort()
				.map((idx, i) => [
					`item_${idx}`,
					{
						id: `item_${idx}`,
						x: 0,
						y: NODE_HEADER_HEIGHT_PX + NODE_PORT_OFFSET_Y_PX + NODE_ROW_HEIGHT_PX * i,
						terminal: 'end',
					},
				])
		),
	}),
	computeOutput: (node, inputs) => ({
		output: Object.entries(node.items).reduce((acc, [idx, value]) => {
			const currentValue = inputs[`item_${idx}`] ?? value
			return acc + currentValue
		}, 0),
	}),
	onPortConnect: (editor, shape, _node, portId) => {
		if (!portId.startsWith('item_')) return
		const idx = portId.slice(5) as IndexKey
		updateNode<AddNode>(editor, shape, (node) => ({
			...node,
			items: ensureFinalEmptyItem(
				editor,
				shape,
				{ ...node.items, [idx]: node.items[idx] ?? 0 },
				{ removeUnused: true }
			),
		}))
	},
	onPortDisconnect: (editor, shape) => {
		updateNode<AddNode>(editor, shape, (node) => ({
			...node,
			items: ensureFinalEmptyItem(editor, shape, node.items, { removeUnused: true }),
		}))
	},
	Component: ({ shape, node }) => {
		const editor = useEditor()
		return indexListEntries(node.items).map(([idx, value]) => (
			<NodeBodyRow
				key={idx}
				shapeId={shape.id}
				portId={`item_${idx}`}
				value={value}
				onChange={(newValue) => {
					updateNode<AddNode>(editor, shape, (node) => ({
						...node,
						items: ensureFinalEmptyItem(editor, shape, { ...node.items, [idx]: newValue }),
					}))
				}}
				onBlur={() => {
					updateNode<AddNode>(editor, shape, (node) => ({
						...node,
						items: ensureFinalEmptyItem(editor, shape, node.items, { removeUnused: true }),
					}))
				}}
			/>
		))
	},
}

function ensureFinalEmptyItem(
	editor: Editor,
	shape: NodeShape,
	items: Record<IndexKey, number>,
	{ removeUnused = false } = {}
) {
	const connections = getNodePortConnections(editor, shape.id)

	let entriesToKeep = indexListEntries(items)

	if (removeUnused) {
		entriesToKeep = entriesToKeep.filter(([idx, value], i) => {
			const portId = `item_${idx}`
			return i === 0 || i === entriesToKeep.length - 1 || value !== 0 || connections[portId]
		})

		if (entriesToKeep.length < 2) {
			for (const index of getIndicesBetween(
				entriesToKeep[entriesToKeep.length - 1]?.[0],
				null,
				2 - entriesToKeep.length
			)) {
				entriesToKeep.push([index, 0])
			}
		}
	}

	const lastEntry = entriesToKeep[entriesToKeep.length - 1]!
	if (lastEntry[1] !== 0 || connections[`item_${lastEntry[0]}`]) {
		entriesToKeep.push([getIndexAbove(lastEntry[0]), 0])
	}

	return Object.fromEntries(entriesToKeep)
}
