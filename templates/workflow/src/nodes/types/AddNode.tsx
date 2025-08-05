import { Editor, getIndexAbove, getIndicesBetween, IndexKey, T, useEditor } from 'tldraw'
import { AddIcon } from '../../components/icons/AddIcon'
import { NODE_HEADER_HEIGHT_PX, NODE_ROW_HEADER_GAP_PX, NODE_ROW_HEIGHT_PX } from '../../constants'
import { indexList, indexListEntries, indexListLength } from '../../utils'
import { getNodePortConnections } from '../nodePorts'
import { NodeShape } from '../NodeShapeUtil'
import { NodeDefinition, NodeInputRow, outputPort, updateNode } from './shared'

/**
 * The add node adds together all of its inputs. It has a variable number of inputs.
 *
 * The items in the node are stored in an index list - a list where the keys are fractional indexes,
 * to allow for elements to be inserted in the middle of the list, and to make sure the indexes of
 * other items don't change when item are removed.
 */
export type AddNode = T.TypeOf<typeof AddNodeType>
export const AddNodeType = T.object({
	type: T.literal('add'),
	items: T.dict(T.indexKey, T.number),
})

export const AddNode: NodeDefinition<AddNode> = {
	type: 'add',
	validator: AddNodeType,
	title: 'Add',
	icon: <AddIcon />,
	getDefault: () => ({
		type: 'add',
		items: indexList([0, 0]),
	}),
	// The height of the node is the number of items times the height of a row.
	getBodyHeightPx: (node) => NODE_ROW_HEIGHT_PX * indexListLength(node.items),
	getPorts: (node) => ({
		// The add node has a single output port...
		output: outputPort,
		// ...and one input port for each item.
		...Object.fromEntries(
			Object.keys(node.items)
				.sort()
				.map((idx, i) => [
					`item_${idx}`,
					{
						id: `item_${idx}`,
						x: 0,
						y:
							NODE_HEADER_HEIGHT_PX +
							NODE_ROW_HEADER_GAP_PX +
							NODE_ROW_HEIGHT_PX * i +
							NODE_ROW_HEIGHT_PX / 2,
						terminal: 'end',
					},
				])
		),
	}),
	// The output of the add node is the sum of all of its inputs.
	computeOutput: (node, inputs) => ({
		output: Object.entries(node.items).reduce((acc, [idx, value]) => {
			const currentValue = inputs[`item_${idx}`] ?? value
			return acc + currentValue
		}, 0),
	}),

	// When a port is connected, we need to ensure that the node has an item for that port, and that
	// there's a spare empty port at the end for adding more items.
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

	// when a port is disconnected, we can clean up unused items.
	onPortDisconnect: (editor, shape) => {
		updateNode<AddNode>(editor, shape, (node) => ({
			...node,
			items: ensureFinalEmptyItem(editor, shape, node.items, { removeUnused: true }),
		}))
	},

	// The component for the add node is a list of input rows, one for each item.
	Component: ({ shape, node }) => {
		const editor = useEditor()
		return (
			<>
				{indexListEntries(node.items).map(([idx, value]) => (
					<NodeInputRow
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
				))}
			</>
		)
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
	const connectedPortIds = new Set(connections.map((c) => c.ownPortId))

	if (removeUnused) {
		entriesToKeep = entriesToKeep.filter(([idx, value], i) => {
			const portId = `item_${idx}`
			return (
				i === 0 || i === entriesToKeep.length - 1 || value !== 0 || connectedPortIds.has(portId)
			)
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
	if (lastEntry[1] !== 0 || connectedPortIds.has(`item_${lastEntry[0]}`)) {
		entriesToKeep.push([getIndexAbove(lastEntry[0]), 0])
	}

	return Object.fromEntries(entriesToKeep)
}
