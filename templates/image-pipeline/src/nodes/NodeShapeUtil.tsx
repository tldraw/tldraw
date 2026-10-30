import classNames from 'classnames'
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
	useValue,
} from 'tldraw'
import { PlayIcon } from '../components/icons/PlayIcon'
import { StopIcon } from '../components/icons/StopIcon'
import {
	NODE_FOOTER_HEIGHT_PX,
	NODE_HEADER_HEIGHT_PX,
	NODE_ROW_BOTTOM_PADDING_PX,
	NODE_ROW_HEADER_GAP_PX,
	PORT_RADIUS_PX,
	PortDataType,
} from '../constants'
import { executionState, startExecution, stopExecution } from '../execution/executionState'
import { Port } from '../ports/Port'
import { getNodeOutputPortInfo, getNodePorts } from './nodePorts'
import { getNodeDefinition, getNodeHeightPx, getNodeWidthPx, NodeBody, NodeType } from './nodeTypes'
import { resizeNode } from './resizeNode'
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

	override canEdit(_shape: NodeShape) {
		return false
	}
	override canResize(shape: NodeShape) {
		return getNodeDefinition(this.editor, shape.props.node).canResizeNode
	}
	override hideResizeHandles(shape: NodeShape) {
		return !this.canResize(shape)
	}
	override hideRotateHandle(_shape: NodeShape) {
		return true
	}
	override hideSelectionBoundsBg(shape: NodeShape) {
		return !this.canResize(shape)
	}
	override hideSelectionBoundsFg(shape: NodeShape) {
		return !this.canResize(shape)
	}
	override isAspectRatioLocked(_shape: NodeShape) {
		return false
	}
	override getBoundsSnapGeometry(_shape: NodeShape) {
		return {
			points: [{ x: 0, y: 0 }],
		}
	}

	getGeometry(shape: NodeShape) {
		const ports = getNodePorts(this.editor, shape)
		const width = getNodeWidthPx(this.editor, shape)

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
			width,
			height: getNodeHeightPx(this.editor, shape),
			isFilled: true,
		})

		return new Group2d({
			children: [bodyGeometry, ...portGeometries],
		})
	}

	override onResize(shape: any, info: TLResizeInfo<any>) {
		const definition = getNodeDefinition(this.editor, shape.props.node)
		if (!definition.canResizeNode) return resizeBox(shape, info)

		const node = shape.props.node as { w: number; h: number; type: string }
		const prevW = getNodeWidthPx(this.editor, shape)
		const prevH = getNodeHeightPx(this.editor, shape)
		const chromeH =
			NODE_HEADER_HEIGHT_PX +
			NODE_ROW_HEADER_GAP_PX +
			NODE_ROW_BOTTOM_PADDING_PX +
			NODE_FOOTER_HEIGHT_PX

		return {
			...resizeNode(shape, info),
			props: {
				...shape.props,
				node: {
					...node,
					w: Math.max(200, Math.round(prevW * info.scaleX)),
					// The body can shrink to zero, but the header/footer chrome can't
					h: Math.max(chromeH, 120, Math.round(prevH * info.scaleY)),
				},
			},
		}
	}

	component(shape: NodeShape) {
		return <NodeShapeComponent shape={shape} />
	}

	getIndicatorPath(shape: NodeShape) {
		const width = getNodeWidthPx(this.editor, shape)
		const height = getNodeHeightPx(this.editor, shape)
		const path = new Path2D()
		path.rect(0, 0, width, height)
		const ports = Object.values(getNodePorts(this.editor, shape))
		for (const port of ports) {
			path.moveTo(port.x + PORT_RADIUS_PX, port.y)
			path.arc(port.x, port.y, PORT_RADIUS_PX, 0, Math.PI * 2)
		}
		return path
	}
}

function NodeShapeComponent({ shape }: { shape: NodeShape }) {
	const editor = useEditor()

	const output = useValue('output', () => getNodeOutputPortInfo(editor, shape.id).output, [
		editor,
		shape.id,
	])

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
				NodeShape_capture: shape.props.node.type === 'capture',
			})}
			onContextMenu={(e) => {
				const target = e.target as HTMLElement
				const tag = target.tagName
				if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
					e.stopPropagation()
				}
			}}
		>
			<div className="NodeShape-heading">
				<div className="NodeShape-icon">{nodeDefinition.icon}</div>
				<div className="NodeShape-label">{nodeDefinition.heading ?? nodeDefinition.title}</div>
				{output !== undefined && (
					<>
						<div className="NodeShape-output">
							<NodeValue
								value={
									output.isOutOfDate
										? STOP_EXECUTION
										: output.multi
											? output.value[0]
											: output.value
								}
							/>
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

	const findStringOutput = (dataType: PortDataType) =>
		Object.values(outputInfo).find(
			(info) => info.dataType === dataType && typeof info.value === 'string' && info.value !== ''
		)?.value as string | undefined

	// Find any image output that has a valid URL
	const imageUrl = findStringOutput('image')

	const node = shape.props.node as Record<string, unknown>
	const definition = getNodeDefinition(editor, shape.props.node)
	const resultKeys = definition.resultKeys
	const defaults = definition.getDefault() as Record<string, unknown>
	const hasResult = resultKeys?.some((key) => node[key] !== defaults[key]) ?? false
	const textResult =
		findStringOutput('text') ??
		(typeof node.lastResultText === 'string' && node.lastResultText !== ''
			? node.lastResultText
			: null)

	const handleDuplicate = () => {
		editor.markHistoryStoppingPoint('duplicate node')
		editor.duplicateShapes([shape.id])
	}

	const handleDownloadImage = async () => {
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
	}

	const handleCopyText = async () => {
		if (!textResult) return
		await navigator.clipboard.writeText(textResult)
	}

	const handleClearResult = () => {
		if (!resultKeys?.length) return
		const updates = Object.fromEntries(resultKeys.map((key) => [key, defaults[key]]))
		editor.updateShape({
			id: shape.id,
			type: shape.type,
			props: {
				node: { ...(shape.props.node as any), ...updates },
				isOutOfDate: true,
			},
		})
	}

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
						{textResult && (
							<TldrawUiDropdownMenuItem>
								<TldrawUiButton type="menu" onClick={handleCopyText}>
									<TldrawUiButtonLabel>Copy text</TldrawUiButtonLabel>
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
