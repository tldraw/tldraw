import { T } from 'tldraw'
import { RouterIcon } from '../../components/icons/RouterIcon'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_ROW_HEADER_GAP_PX,
	NODE_ROW_HEIGHT_PX,
	NODE_WIDTH_PX,
} from '../../constants'
import { ShapePort } from '../../ports/Port'
import { NodeShape } from '../NodeShapeUtil'
import {
	ExecutionResult,
	InfoValues,
	InputValues,
	NodeComponentProps,
	NodeDefinition,
	NodePortLabel,
	NodeRow,
} from './shared'

export type RouterNode = T.TypeOf<typeof RouterNode>
export const RouterNode = T.object({
	type: T.literal('router'),
	outputCount: T.number,
})

export class RouterNodeDefinition extends NodeDefinition<RouterNode> {
	static type = 'router'
	static validator = RouterNode
	title = 'Router'
	heading = 'Router'
	hidden = true as const
	icon = (<RouterIcon />)
	category = 'utility'
	getDefault(): RouterNode {
		return {
			type: 'router',
			outputCount: 3,
		}
	}
	getBodyHeightPx(_shape: NodeShape, node: RouterNode) {
		// 1 input row + N output rows
		return NODE_ROW_HEIGHT_PX * (1 + node.outputCount)
	}
	getPorts(_shape: NodeShape, node: RouterNode): Record<string, ShapePort> {
		const baseY = NODE_HEADER_HEIGHT_PX + NODE_ROW_HEADER_GAP_PX
		const ports: Record<string, ShapePort> = {
			input: {
				id: 'input',
				x: 0,
				y: baseY + NODE_ROW_HEIGHT_PX * 0.5,
				terminal: 'end',
				dataType: 'any',
			},
		}
		for (let i = 0; i < node.outputCount; i++) {
			ports[`out_${i}`] = {
				id: `out_${i}`,
				x: NODE_WIDTH_PX,
				y: baseY + NODE_ROW_HEIGHT_PX * (1.5 + i),
				terminal: 'start',
				dataType: 'any',
			}
		}
		return ports
	}
	async execute(
		_shape: NodeShape,
		node: RouterNode,
		inputs: InputValues
	): Promise<ExecutionResult> {
		const value = (inputs.input as string | number | null) ?? null
		const result: ExecutionResult = {}
		for (let i = 0; i < node.outputCount; i++) {
			result[`out_${i}`] = value
		}
		return result
	}
	getOutputInfo(shape: NodeShape, node: RouterNode, inputs: InfoValues): InfoValues {
		const inputInfo = inputs.input
		const result: InfoValues = {}
		for (let i = 0; i < node.outputCount; i++) {
			if (inputInfo) {
				// Router input is always single; forward the value to each output.
				const singleValue = inputInfo.multi ? inputInfo.value[0] : inputInfo.value
				result[`out_${i}`] = {
					value: singleValue,
					isOutOfDate: inputInfo.isOutOfDate || shape.props.isOutOfDate,
					dataType: inputInfo.dataType,
				}
			} else {
				result[`out_${i}`] = {
					value: null,
					isOutOfDate: shape.props.isOutOfDate,
					dataType: 'any',
				}
			}
		}
		return result
	}
	Component = RouterNodeComponent
}

function RouterNodeComponent({ node }: NodeComponentProps<RouterNode>) {
	return (
		<>
			<NodeRow>
				<span
					className="Port Port_end"
					style={{ '--port-color': 'var(--port-color-any)' } as React.CSSProperties}
				/>
				<NodePortLabel dataType="any">Input</NodePortLabel>
				<span className="NodeRow-connected-value">{node.outputCount} outputs</span>
			</NodeRow>
			{Array.from({ length: node.outputCount }, (_, i) => (
				<NodeRow key={i}>
					<NodePortLabel dataType="any">Out {i + 1}</NodePortLabel>
				</NodeRow>
			))}
		</>
	)
}
