import { Box, T, useEditor, useValue } from 'tldraw'
import { CaptureIcon } from '../../components/icons/CaptureIcon'
import {
	NODE_FOOTER_HEIGHT_PX,
	NODE_HEADER_HEIGHT_PX,
	NODE_ROW_BOTTOM_PADDING_PX,
	NODE_ROW_HEADER_GAP_PX,
} from '../../constants'
import { ShapePort } from '../../ports/Port'
import { NodeShape } from '../NodeShapeUtil'
import {
	ExecutionResult,
	InfoValues,
	NodeComponentProps,
	NodeDefinition,
	blobToDataUrl,
	updateNode,
} from './shared'

export type CaptureNode = T.TypeOf<typeof CaptureNode>
export const CaptureNode = T.object({
	type: T.literal('capture'),
	w: T.number,
	h: T.number,
	lastCaptureUrl: T.string.nullable(),
})

export class CaptureNodeDefinition extends NodeDefinition<CaptureNode> {
	static type = 'capture'
	static validator = CaptureNode
	title = 'Capture'
	heading = 'Capture'
	icon = (<CaptureIcon />)
	category = 'input'
	resultKeys = ['lastCaptureUrl'] as const
	override canResizeNode = true

	getDefault(): CaptureNode {
		return {
			type: 'capture',
			w: 400,
			h: 300,
			lastCaptureUrl: null,
		}
	}

	override getWidthPx(_shape: NodeShape, node: CaptureNode): number {
		return node.w
	}

	getBodyHeightPx(_shape: NodeShape, node: CaptureNode): number {
		return (
			node.h -
			NODE_HEADER_HEIGHT_PX -
			NODE_ROW_HEADER_GAP_PX -
			NODE_ROW_BOTTOM_PADDING_PX -
			NODE_FOOTER_HEIGHT_PX
		)
	}

	getPorts(_shape: NodeShape, node: CaptureNode): Record<string, ShapePort> {
		return {
			output: {
				id: 'output',
				x: node.w,
				y: NODE_HEADER_HEIGHT_PX / 2,
				terminal: 'start',
				dataType: 'image',
			},
		}
	}

	async execute(shape: NodeShape, _node: CaptureNode): Promise<ExecutionResult> {
		const bounds = this.editor.getShapePageBounds(shape.id)
		if (!bounds) return { output: null }

		const allIds = this.editor.getShapeIdsInsideBounds(bounds)

		// Filter out the capture node itself, all node shapes, and connection shapes
		const filtered = [...allIds].filter((id) => {
			if (id === shape.id) return false
			const s = this.editor.getShape(id)
			if (!s) return false
			return s.type !== 'node' && s.type !== 'connection'
		})

		if (filtered.length === 0) {
			updateNode<CaptureNode>(this.editor, shape, (n) => ({
				...n,
				lastCaptureUrl: null,
			}))
			return { output: null }
		}

		const captureBox = new Box(bounds.x, bounds.y, bounds.w, bounds.h)
		const result = await this.editor.toImage(filtered, {
			bounds: captureBox,
			padding: 0,
			background: true,
			format: 'png',
		})

		const url = await blobToDataUrl(result.blob)

		updateNode<CaptureNode>(this.editor, shape, (n) => ({
			...n,
			lastCaptureUrl: url,
		}))

		return { output: url }
	}

	getOutputInfo(shape: NodeShape, node: CaptureNode): InfoValues {
		return {
			output: {
				value: node.lastCaptureUrl,
				isOutOfDate: shape.props.isOutOfDate,
				dataType: 'image',
			},
		}
	}

	Component = CaptureNodeComponent
}

function CaptureNodeComponent(props: NodeComponentProps<CaptureNode>) {
	const editor = useEditor()
	const { shape } = props
	const geometry = useValue('geometry', () => editor.getShapeGeometry(shape.id), [editor, shape.id])
	return (
		<div
			className="CaptureNode-body"
			style={{
				width: geometry.bounds.w,
				height:
					geometry.bounds.h -
					NODE_HEADER_HEIGHT_PX -
					NODE_ROW_HEADER_GAP_PX -
					NODE_ROW_BOTTOM_PADDING_PX -
					NODE_FOOTER_HEIGHT_PX,
			}}
		/>
	)
}
