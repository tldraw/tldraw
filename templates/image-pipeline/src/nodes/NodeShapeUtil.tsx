import classNames from 'classnames'
import { useCallback } from 'react'
import {
	Circle2d,
	Group2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	resizeBox,
	ShapeUtil,
	T,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuGroup,
	TldrawUiDropdownMenuItem,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TLResizeInfo,
	TLShape,
	useEditor,
	useUniqueSafeId,
	useValue,
} from 'tldraw'
import { PlayIcon } from '../components/icons/PlayIcon'
import { StopIcon } from '../components/icons/StopIcon'
import { NODE_WIDTH_PX, PORT_RADIUS_PX, PORT_TYPE_COLORS } from '../constants'
import { executionState, startExecution, stopExecution } from '../execution/executionState'
import { Port, ShapePort } from '../ports/Port'
import { getNodeOutputPortInfo, getNodePorts } from './nodePorts'
import { getNodeDefinition, getNodeHeightPx, NodeBody, NodeType } from './nodeTypes'
import { NodeValue, STOP_EXECUTION } from './types/shared'

const NODE_TYPE = 'node'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[NODE_TYPE]: { node: NodeType; isOutOfDate: boolean }
	}
}

export type NodeShape = TLShape<typeof NODE_TYPE>

export class NodeShapeUtil extends ShapeUtil<NodeShape> {
	static override type = NODE_TYPE
	static override props: RecordProps<NodeShape> = {
		node: NodeType,
		isOutOfDate: T.boolean,
	}

	getDefaultProps(): NodeShape['props'] {
		return {
			node: getNodeDefinition(this.editor, 'prompt').getDefault(),
			isOutOfDate: false,
		}
	}

	override canEdit() {
		return false
	}
	override canResize() {
		return false
	}
	override hideResizeHandles() {
		return true
	}
	override hideRotateHandle() {
		return true
	}
	override hideSelectionBoundsBg() {
		return true
	}
	override hideSelectionBoundsFg() {
		return true
	}
	override isAspectRatioLocked() {
		return false
	}
	override getBoundsSnapGeometry(_shape: NodeShape) {
		return {
			points: [{ x: 0, y: 0 }],
		}
	}

	getGeometry(shape: NodeShape) {
		const ports = getNodePorts(this.editor, shape)

		const portGeometries = Object.values(ports).map(
			(port) =>
				new Circle2d({
					x: port.x - PORT_RADIUS_PX,
					y: port.y - PORT_RADIUS_PX,
					radius: PORT_RADIUS_PX,
					isFilled: true,
					isLabel: true,
					excludeFromShapeBounds: true,
				})
		)

		const bodyGeometry = new Rectangle2d({
			width: NODE_WIDTH_PX,
			height: getNodeHeightPx(this.editor, shape),
			isFilled: true,
		})

		return new Group2d({
			children: [bodyGeometry, ...portGeometries],
		})
	}

	override onResize(shape: any, info: TLResizeInfo<any>) {
		return resizeBox(shape, info)
	}

	component(shape: NodeShape) {
		return <NodeShapeComponent shape={shape} />
	}

	indicator(shape: NodeShape) {
		const ports = Object.values(getNodePorts(this.editor, shape))
		return <NodeShapeIndicator shape={shape} ports={ports} />
	}
}

function NodeShapeIndicator({ shape, ports }: { shape: NodeShape; ports: ShapePort[] }) {
	const id = useUniqueSafeId()
	const editor = useEditor()

	return (
		<>
			<mask id={id}>
				<rect
					width={NODE_WIDTH_PX + 10}
					height={getNodeHeightPx(editor, shape) + 10}
					fill="white"
					x={-5}
					y={-5}
				/>
				{ports.map((port) => (
					<circle
						key={port.id}
						cx={port.x}
						cy={port.y}
						r={PORT_RADIUS_PX}
						fill="black"
						strokeWidth={0}
					/>
				))}
			</mask>
			<rect
				rx={9}
				width={NODE_WIDTH_PX}
				height={getNodeHeightPx(editor, shape)}
				mask={`url(#${id})`}
			/>
			{ports.map((port) => (
				<circle
					key={port.id}
					cx={port.x}
					cy={port.y}
					r={PORT_RADIUS_PX}
					style={{ stroke: PORT_TYPE_COLORS[port.dataType] }}
				/>
			))}
		</>
	)
}

function NodeShapeComponent({ shape }: { shape: NodeShape }) {
	const editor = useEditor()

	const output = useValue(
		'output',
		() => getNodeOutputPortInfo(editor, shape.id)?.output ?? undefined,
		[editor, shape.id]
	)

	const isExecuting = useValue(
		'is executing',
		() => executionState.get(editor).runningGraph?.getNodeStatus(shape.id) === 'executing',
		[editor, shape.id]
	)

	const isGraphRunning = useValue(
		'is graph running',
		() => executionState.get(editor).runningGraph !== null,
		[editor]
	)

	const nodeDefinition = getNodeDefinition(editor, shape.props.node)

	return (
		<HTMLContainer
			className={classNames('NodeShape', {
				NodeShape_executing: isExecuting,
			})}
		>
			<div className="NodeShape-heading">
				<div className="NodeShape-icon">{nodeDefinition.icon}</div>
				<div className="NodeShape-label">{nodeDefinition.heading ?? nodeDefinition.title}</div>
				{output !== undefined && (
					<>
						<div className="NodeShape-output">
							<NodeValue value={output.isOutOfDate ? STOP_EXECUTION : output.value} />
						</div>
						<Port shapeId={shape.id} portId="output" />
					</>
				)}
			</div>
			<NodeBody shape={shape} />
			<div className="NodeShape-footer">
				<button
					className={classNames('NodeShape-footer-action', {
						'NodeShape-footer-action_executing': isExecuting,
					})}
					onPointerDown={(e) => e.stopPropagation()}
					onClick={() => {
						if (isGraphRunning) {
							stopExecution(editor)
						} else {
							startExecution(editor, new Set([shape.id]))
						}
					}}
				>
					{isExecuting ? <StopIcon /> : <PlayIcon />}
					<span>{isExecuting ? 'Stop' : 'Play from here'}</span>
				</button>
				<NodeFooterMenu shape={shape} />
			</div>
		</HTMLContainer>
	)
}

function NodeFooterMenu({ shape }: { shape: NodeShape }) {
	const editor = useEditor()

	const outputInfo = useValue('output info', () => getNodeOutputPortInfo(editor, shape.id), [
		editor,
		shape.id,
	])

	// Find any image output that has a valid URL
	const imageUrl = Object.values(outputInfo).find(
		(info) =>
			info.dataType === 'image' && typeof info.value === 'string' && info.value && info.value !== ''
	)?.value as string | undefined

	const node = shape.props.node as Record<string, unknown>
	const hasResult = typeof node.lastResultUrl === 'string' && node.lastResultUrl !== ''

	const handleDuplicate = useCallback(() => {
		editor.markHistoryStoppingPoint('duplicate node')
		editor.duplicateShapes([shape.id])
	}, [editor, shape.id])

	const handleDownloadImage = useCallback(async () => {
		if (!imageUrl) return
		const response = await fetch(imageUrl)
		const blob = await response.blob()
		const ext = blob.type.split('/')[1] ?? 'png'
		const blobUrl = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = blobUrl
		a.download = `image.${ext}`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(blobUrl)
	}, [imageUrl])

	const handleClearResult = useCallback(() => {
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			props: {
				node: { ...(shape.props.node as any), lastResultUrl: null },
				isOutOfDate: true,
			},
		})
	}, [editor, shape])

	return (
		<div className="NodeFooterMenu" onPointerDown={(e) => e.stopPropagation()}>
			<TldrawUiDropdownMenuRoot id={`node-menu-${shape.id}`}>
				<TldrawUiDropdownMenuTrigger>
					<TldrawUiButton type="icon" title="More options" className="NodeFooterMenu-trigger">
						<svg width="12" height="12" viewBox="0 0 12 12">
							<circle cx="6" cy="2" r="1.2" fill="currentColor" />
							<circle cx="6" cy="6" r="1.2" fill="currentColor" />
							<circle cx="6" cy="10" r="1.2" fill="currentColor" />
						</svg>
					</TldrawUiButton>
				</TldrawUiDropdownMenuTrigger>
				<TldrawUiDropdownMenuContent side="top" align="end" sideOffset={4} alignOffset={0}>
					<TldrawUiDropdownMenuGroup>
						<TldrawUiDropdownMenuItem>
							<TldrawUiButton type="menu" onClick={handleDuplicate}>
								<TldrawUiButtonLabel>Duplicate</TldrawUiButtonLabel>
							</TldrawUiButton>
						</TldrawUiDropdownMenuItem>
						{imageUrl && (
							<TldrawUiDropdownMenuItem>
								<TldrawUiButton type="menu" onClick={handleDownloadImage}>
									<TldrawUiButtonLabel>Download image</TldrawUiButtonLabel>
								</TldrawUiButton>
							</TldrawUiDropdownMenuItem>
						)}
						{hasResult && (
							<TldrawUiDropdownMenuItem>
								<TldrawUiButton type="menu" onClick={handleClearResult}>
									<TldrawUiButtonLabel>Clear result</TldrawUiButtonLabel>
								</TldrawUiButton>
							</TldrawUiDropdownMenuItem>
						)}
					</TldrawUiDropdownMenuGroup>
				</TldrawUiDropdownMenuContent>
			</TldrawUiDropdownMenuRoot>
		</div>
	)
}
