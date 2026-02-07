import { T, useEditor } from 'tldraw'
import { LoadImageIcon } from '../../components/icons/LoadImageIcon'
import {
	NODE_HEADER_HEIGHT_PX,
	NODE_IMAGE_PREVIEW_HEIGHT_PX,
	NODE_ROW_HEIGHT_PX,
	NODE_WIDTH_PX,
} from '../../constants'
import { ShapePort } from '../../ports/Port'
import { sleep } from '../../utils/sleep'
import { NodeShape } from '../NodeShapeUtil'
import {
	ExecutionResult,
	InfoValues,
	NodeComponentProps,
	NodeDefinition,
	NodeRow,
	updateNode,
} from './shared'

/**
 * Generate a placeholder "loaded" image.
 */
function makePlaceholderLoadedImage(index: number): string {
	const hues = [200, 280, 340, 30, 160]
	const hue = hues[index % hues.length]
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
		<rect width="512" height="512" fill="hsl(${hue}, 50%, 85%)"/>
		<rect x="80" y="80" width="352" height="352" rx="20" fill="hsl(${hue}, 40%, 70%)"/>
		<circle cx="200" cy="200" r="40" fill="hsl(${hue}, 50%, 90%)"/>
		<polygon points="160,360 256,200 352,360" fill="hsl(${hue}, 45%, 60%)"/>
		<polygon points="240,360 320,260 400,360" fill="hsl(${hue}, 40%, 55%)"/>
		<text x="256" y="480" text-anchor="middle" fill="hsl(${hue},30%,50%)" font-family="sans-serif" font-size="14">loaded image</text>
	</svg>`
	return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const SAMPLE_IMAGES = [
	{ id: 'sample-1', label: 'Sample landscape' },
	{ id: 'sample-2', label: 'Sample portrait' },
	{ id: 'sample-3', label: 'Sample abstract' },
	{ id: 'sample-4', label: 'Sample texture' },
] as const

export type LoadImageNode = T.TypeOf<typeof LoadImageNode>
export const LoadImageNode = T.object({
	type: T.literal('load_image'),
	selectedImage: T.string,
	imageUrl: T.string.nullable(),
})

export class LoadImageNodeDefinition extends NodeDefinition<LoadImageNode> {
	static type = 'load_image'
	static validator = LoadImageNode
	title = 'Load image'
	heading = 'Image'
	icon = (<LoadImageIcon />)
	category = 'input'
	getDefault(): LoadImageNode {
		return {
			type: 'load_image',
			selectedImage: 'sample-1',
			imageUrl: makePlaceholderLoadedImage(0),
		}
	}
	getBodyHeightPx() {
		return NODE_ROW_HEIGHT_PX + NODE_IMAGE_PREVIEW_HEIGHT_PX
	}
	getPorts(): Record<string, ShapePort> {
		return {
			output: {
				id: 'output',
				x: NODE_WIDTH_PX,
				y: NODE_HEADER_HEIGHT_PX / 2,
				terminal: 'start',
				dataType: 'image',
			},
		}
	}
	async execute(_shape: NodeShape, node: LoadImageNode): Promise<ExecutionResult> {
		await sleep(300)
		return { output: node.imageUrl }
	}
	getOutputInfo(shape: NodeShape, node: LoadImageNode): InfoValues {
		return {
			output: {
				value: node.imageUrl,
				isOutOfDate: shape.props.isOutOfDate,
				dataType: 'image',
			},
		}
	}
	Component = LoadImageNodeComponent
}

function LoadImageNodeComponent({ shape, node }: NodeComponentProps<LoadImageNode>) {
	const editor = useEditor()
	return (
		<>
			<NodeRow>
				<select
					value={node.selectedImage}
					onChange={(e) => {
						const idx = SAMPLE_IMAGES.findIndex((s) => s.id === e.target.value)
						updateNode<LoadImageNode>(editor, shape, (n) => ({
							...n,
							selectedImage: e.target.value,
							imageUrl: makePlaceholderLoadedImage(idx >= 0 ? idx : 0),
						}))
					}}
				>
					{SAMPLE_IMAGES.map((img) => (
						<option key={img.id} value={img.id}>
							{img.label}
						</option>
					))}
				</select>
			</NodeRow>
			<div className="NodeImagePreview">
				{node.imageUrl ? (
					<img src={node.imageUrl} alt="Loaded" />
				) : (
					<div className="NodeImagePreview-empty">
						<span>No image loaded</span>
					</div>
				)}
			</div>
		</>
	)
}
