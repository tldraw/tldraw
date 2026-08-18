import { Editor, getIndexAbove, getIndicesBetween, IndexKey, sleep, T, useEditor } from 'tldraw'
import { AddIcon } from '../../components/icons/AddIcon'
import { NODE_ROW_HEIGHT_PX } from '../../constants'
import { ShapePort } from '../../ports/Port'
import { indexList, indexListEntries, indexListLength } from '../../utils'
import { getNodePortConnections } from '../nodePorts'
import { NodeShape } from '../NodeShapeUtil'
import {
	areAnyInputsOutOfDate,
	ExecutionResult,
	InfoValues,
	InputValues,
	NodeComponentProps,
	NodeDefinition,
	NodeInputRow,
	outputPort,
	rowPort,
	updateNode,
} from './shared'

/**
 * The add node adds together all of its inputs. It has a variable number of inputs.
 *
 * The items in the node are stored in an index list - a list where the keys are fractional indexes,
 * to allow for elements to be inserted in the middle of the list, and to make sure the indexes of
 * other items don't change when item are removed.
 */
export type AddNode = T.TypeOf<typeof AddNode>
export const AddNode = T.object({
	type: T.literal('add'),
	items: T.dict(T.indexKey, T.number),
	lastResult: T.number.nullable(),
})

export class AddNodeDefinition extends NodeDefinition<AddNode> {
	static type = 'add'
	static validator = AddNode
	title = 'Add'
	heading = 'Add'
	icon = <AddIcon />
	getDefault(): AddNode {
		return {
			type: 'add',
			items: indexList([0, 0]),
			lastResult: null,
		}
	}
	getBodyHeightPx(_shape: NodeShape, node: AddNode) {
		return NODE_ROW_HEIGHT_PX * indexListLength(node.items)
	}
	// One output port, plus one input port per item.
	getPorts(_shape: NodeShape, node: AddNode): Record<string, ShapePort> {
		return {
			output: outputPort,
			...Object.fromEntries(
				indexListEntries(node.items).map(([idx], i) => [`item_${idx}`, rowPort(`item_${idx}`, i)])
			),
		}
	}
	async execute(shape: NodeShape, node: AddNode, inputs: InputValues): Promise<ExecutionResult> {
		await sleep(1000)

		const result = Object.entries(node.items).reduce(
			(acc, [idx, value]) => acc + (inputs[`item_${idx}`] ?? value),
			0
		)
		updateNode<AddNode>(this.editor, shape, (node) => ({
			...node,
			lastResult: result,
		}))
		return {
			output: result,
		}
	}

	getOutputInfo(shape: NodeShape, node: AddNode, inputs: InfoValues): InfoValues {
		return {
			output: {
				value: node.lastResult ?? 0,
				isOutOfDate: areAnyInputsOutOfDate(inputs) || shape.props.isOutOfDate,
			},
		}
	}

	// When a port is connected, we need to ensure that the node has an item for that port, and that
	// there's a spare empty port at the end for adding more items.
	onPortConnect(shape: NodeShape, _node: AddNode, portId: string): void {
		if (!portId.startsWith('item_')) return
		const idx = portId.slice(5) as IndexKey
		updateNode<AddNode>(this.editor, shape, (node) => ({
			...node,
			items: ensureFinalEmptyItem(
				this.editor,
				shape,
				{ ...node.items, [idx]: node.items[idx] ?? 0 },
				{ removeUnused: true }
			),
		}))
	}

	// when a port is disconnected, we can clean up unused items.
	onPortDisconnect(shape: NodeShape, _node: AddNode, _portId: string): void {
		updateNode<AddNode>(this.editor, shape, (node) => ({
			...node,
			items: ensureFinalEmptyItem(this.editor, shape, node.items, { removeUnused: true }),
		}))
	}

	Component = AddNodeComponent
}

export function AddNodeComponent({ shape, node }: NodeComponentProps<AddNode>) {
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
