import { useEffect, useState } from 'react'
import {
	Circle2d,
	Editor,
	getColorValue,
	getIndicesAbove,
	RecordProps,
	ShapeUtil,
	SVGContainer,
	T,
	TLHandle,
	TLHandleDragInfo,
	TLResizeInfo,
	TLShape,
	useDefaultColorTheme,
	useValue,
	Vec,
	ZERO_INDEX_KEY,
} from 'tldraw'

export interface NodeProps {
	opacity: number
	radius: number
}

const NODE_TYPE = 'node'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[NODE_TYPE]: NodeProps
	}
}

export type NodeShape = TLShape<'node'>

export class NodeShapeUtil extends ShapeUtil<NodeShape> {
	static override type = 'node' as const
	static override props: RecordProps<NodeShape> = {
		opacity: T.number,
		radius: T.number,
	}

	override getDefaultProps(): NodeShape['props'] {
		return {
			opacity: 1,
			radius: 50,
		}
	}

	override hideResizeHandles(_shape: NodeShape): boolean {
		return true
	}

	override hideRotateHandle(_shape: NodeShape): boolean {
		return true
	}

	override hideSelectionBoundsBg(_shape: NodeShape): boolean {
		return true
	}

	override hideSelectionBoundsFg(_shape: NodeShape): boolean {
		return true
	}

	override getGeometry(shape: NodeShape) {
		return new Circle2d({
			x: -shape.props.radius,
			y: -shape.props.radius,
			radius: shape.props.radius,
			isFilled: true,
		})
	}

	override onResize(_shape: NodeShape, info: TLResizeInfo<NodeShape>) {
		const { scaleX, scaleY, initialShape } = info
		const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2

		return {
			props: {
				radius: initialShape.props.radius * avgScale,
			},
		}
	}

	override getHandles(shape: NodeShape): TLHandle[] {
		const east = Vec.Uni({ x: -1, y: 0 }).mul(shape.props.radius)
		const west = Vec.Uni({ x: 1, y: 0 }).mul(shape.props.radius)

		const indices = getIndicesAbove(ZERO_INDEX_KEY, 2)

		return [
			{
				id: 'east',
				type: 'vertex',
				index: indices[0],
				x: east.x,
				y: east.y,
			},
			{
				id: 'west',
				type: 'vertex',
				index: indices[1],
				x: west.x,
				y: west.y,
			},
		]
	}

	override onHandleDrag(shape: NodeShape, info: TLHandleDragInfo<NodeShape>) {
		const { handle, initial } = info
		if (!initial) return shape

		const mag = Vec.Len(handle) - initial.props.radius

		return {
			...shape,
			props: {
				...shape.props,
				radius: initial.props.radius + mag,
			},
		}
	}

	override indicator(shape: NodeShape) {
		const zoom = this.editor.getZoomLevel()

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useDefaultColorTheme()
		const blue = getColorValue(theme, 'blue', 'solid')

		return <circle r={shape.props.radius} strokeWidth={1 / zoom} stroke={blue} fill="none" />
	}

	override component(shape: NodeShape) {
		const isSingleNode = this.editor.getBindingsToShape(shape.id, 'glob').length === 0

		return <NodeComponent shape={shape} editor={this.editor} isSingleNode={isSingleNode} />
	}
}

function NodeComponent({
	shape,
	editor,
	isSingleNode,
}: {
	shape: NodeShape
	editor: Editor
	isSingleNode: boolean
}) {
	const zoom = useValue('zoom', () => editor.getZoomLevel(), [editor])
	const { radius } = shape.props
	const dashArray = `${3 / zoom} ${3 / zoom}`

	const [isSpacePressed, setIsSpacePressed] = useState(false)

	// a small hack because editor inputs are not reactive, we need to use a keyboard event to fill the node
	// when space is pressed, fill the node
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === 'Space') {
				setIsSpacePressed(true)
			}
		}

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.code === 'Space') {
				setIsSpacePressed(false)
			}
		}

		const container = editor.getContainer()
		const doc = container.ownerDocument

		doc.addEventListener('keydown', handleKeyDown)
		doc.addEventListener('keyup', handleKeyUp)

		return () => {
			doc.removeEventListener('keydown', handleKeyDown)
			doc.removeEventListener('keyup', handleKeyUp)
		}
	}, [editor])

	const fillNode = isSingleNode && isSpacePressed
	if (!isSingleNode && isSpacePressed) return null

	return (
		<SVGContainer>
			<g opacity={shape.props.opacity}>
				<circle
					r={radius}
					stroke={'black'}
					strokeDasharray={isSingleNode ? 'none' : dashArray}
					strokeWidth={1 / zoom}
					fill={fillNode ? 'black' : 'white'}
				/>
				<circle x={0} y={0} r={1 / zoom} stroke="black" strokeWidth={1 / zoom} fill="black" />
			</g>
		</SVGContainer>
	)
}
