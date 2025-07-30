import classNames from 'classnames'
import { useLayoutEffect, useState } from 'react'
import { IndexKey, T, useEditor, useValue } from 'tldraw'
import { AddIcon } from '../../components/icons/AddIcon'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_ROW_HEADER_GAP_PX,
	NODE_ROW_HEIGHT_PX,
	NODE_WIDTH_PX,
} from '../../constants'
import { indexList, indexListEntries, indexListLength } from '../../utils'
import { createIndicatorHolePunch } from '../indicatorHolePunch'
import { NodeShape } from '../NodeShapeUtil'
import { getNodeHeightPx } from '../nodeTypes'
import { NodeDefinition, NodeInputRow, outputPort, updateNode } from './shared'

export const AddNodeType = T.object({
	type: T.literal('add'),
	items: T.dict(T.indexKey, T.number),
})
export type AddNode = T.TypeOf<typeof AddNodeType>

export const AddNode: NodeDefinition<AddNode> = {
	type: 'add',
	validator: AddNodeType,
	title: 'Add',
	icon: <AddIcon />,
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
			items: { ...node.items, [idx]: node.items[idx] ?? 0 },
		}))
	},
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
								items: { ...node.items, [idx]: newValue },
							}))
						}}
					/>
				))}
				<AddNodeRowButton shape={shape} />
			</>
		)
	},
}

const holePunchX = NODE_WIDTH_PX / 2
const holePunchRadius = 10

function AddNodeRowButton({ shape }: { shape: NodeShape }) {
	const editor = useEditor()
	const forceShow = useValue(
		'forceShow',
		() => {
			return editor.getOnlySelectedShapeId() === shape.id
		},
		[shape.id, editor]
	)

	const [isHovered, setIsHovered] = useState(false)
	const holePunchY = getNodeHeightPx(shape.props.node)

	useLayoutEffect(() => {
		if (!forceShow && !isHovered) return

		const removeIndicatorHolePunch = createIndicatorHolePunch(
			editor,
			shape.id,
			holePunchX,
			holePunchY,
			holePunchRadius
		)
		return () => {
			removeIndicatorHolePunch()
		}
	}, [shape.id, editor, holePunchY, forceShow, isHovered])

	return (
		<div
			className={classNames('AddNodeRowButton', {
				AddNodeRowButton_forceShow: forceShow,
			})}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<button className="AddNodeRowButton-button" onClick={() => {}}>
				<div className="AddNodeRowButton-icon">
					<AddIcon />
				</div>
			</button>
		</div>
	)
}
