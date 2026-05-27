import { memo, useLayoutEffect, useRef } from 'react'
import {
	BaseFrameLikeShapeUtil,
	Box,
	Editor,
	Geometry2d,
	Group2d,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	T,
	TLDragShapesOutInfo,
	TLDropShapesOverInfo,
	TLShape,
	TLShapeId,
	TLShapePartial,
	Tldraw,
	TldrawUiButtonIcon,
	TldrawUiContextualToolbar,
	TldrawUiToolbarButton,
	canonicalizeRotation,
	clamp,
	createShapeId,
	getIndicesBetween,
	last,
	resizeBox,
	toDomPrecision,
	track,
	useEditor,
	useValue,
	type TLResizeInfo,
} from 'tldraw'
import {
	FLEX_CONTAINER_DEFAULT_LABEL,
	FLEX_CONTAINER_GAP,
	FLEX_CONTAINER_PADDING,
	getChildPositions,
	getDesiredSize,
	getDropInLineStyle,
	getDropOutLineStyle,
	getFlexContainerStyles,
	getMinimumContentSize,
	type FlexContainerLayoutProps,
	type FrameLabelBoxShape,
} from './FlexContainerHelpers'
import 'tldraw/tldraw.css'
import './flex-layout.css'

// There's a guide at the bottom of this file!

const FLEX_LAYOUT_SHAPE_TYPE = 'flex-layout'
const FLEX_LAYOUT_ID = createShapeId('flex-layout-example')

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[FLEX_LAYOUT_SHAPE_TYPE]: FlexContainerLayoutProps & {
			w: number
			h: number
		}
	}
}

// [2]
type FlexLayoutShape = TLShape<typeof FLEX_LAYOUT_SHAPE_TYPE>

// [4]
const FRAME_HEADING_EXTRA_WIDTH = 12
const FRAME_HEADING_MIN_WIDTH = 32
const FRAME_HEADING_NOCOLORS_OFFSET_X = -7
const FRAME_HEADING_OFFSET_Y = 4

function getContainerHeadingSide(editor: Editor, shape: FrameLabelBoxShape): 0 | 1 | 2 | 3 {
	const pageRotation = canonicalizeRotation(editor.getShapePageTransform(shape.id)!.rotation())
	const offsetRotation = pageRotation + Math.PI / 4
	const scaledRotation = (offsetRotation * (2 / Math.PI) + 4) % 4
	return Math.floor(scaledRotation) as 0 | 1 | 2 | 3
}

function getContainerHeadingOpts(width: number) {
	return {
		fontSize: 12,
		fontFamily: 'Inter, sans-serif',
		textAlign: 'start' as const,
		width,
		height: 24,
		padding: 0,
		lineHeight: 1,
		fontStyle: 'normal',
		fontWeight: 'normal',
		overflow: 'truncate-ellipsis' as const,
		verticalTextAlign: 'middle' as const,
		offsetY: -(32 + 2),
		offsetX: 0,
	}
}

function getContainerHeadingSize(
	editor: Editor,
	shape: FrameLabelBoxShape,
	opts: ReturnType<typeof getContainerHeadingOpts>,
	label: string
) {
	if (process.env.NODE_ENV === 'test') {
		return new Box(0, -opts.height, shape.props.w, opts.height)
	}

	const spans = editor.textMeasure.measureTextSpans(label, opts)
	const firstSpan = spans[0]
	const lastSpan = last(spans)!
	const width = lastSpan.box.w + lastSpan.box.x - firstSpan.box.x

	return new Box(0, -opts.height, width, opts.height)
}

function getContainerHeadingTranslation(shape: FrameLabelBoxShape, side: 0 | 1 | 2 | 3) {
	const u = 'px'
	const r = 'deg'
	switch (side) {
		case 0:
			return ''
		case 3:
			return `translate(${toDomPrecision(shape.props.w)}${u}, 0${u}) rotate(90${r})`
		case 2:
			return `translate(${toDomPrecision(shape.props.w)}${u}, ${toDomPrecision(shape.props.h)}${u}) rotate(180${r})`
		case 1:
			return `translate(0${u}, ${toDomPrecision(shape.props.h)}${u}) rotate(270${r})`
		default:
			throw Error('labelSide out of bounds')
	}
}

function getFlexContainerLabelGeometry(
	editor: Editor,
	shape: FrameLabelBoxShape,
	label = FLEX_CONTAINER_DEFAULT_LABEL
) {
	const z = editor.getEfficientZoomLevel()
	const labelSide = getContainerHeadingSide(editor, shape)
	const isVertical = labelSide % 2 === 1
	const rotatedTopEdgeWidth = isVertical ? shape.props.h : shape.props.w

	const opts = getContainerHeadingOpts(rotatedTopEdgeWidth)
	const headingSize = getContainerHeadingSize(editor, shape, opts, label)

	const extraWidth = FRAME_HEADING_EXTRA_WIDTH / z
	const minWidth = FRAME_HEADING_MIN_WIDTH / z
	const maxWidth = rotatedTopEdgeWidth + extraWidth

	const labelWidth = headingSize.w / z
	const labelHeight = headingSize.h / z
	const clampedLabelWidth = clamp(labelWidth + extraWidth, minWidth, maxWidth)

	const offsetX = FRAME_HEADING_NOCOLORS_OFFSET_X / z
	const offsetY = FRAME_HEADING_OFFSET_Y / z

	const width = isVertical ? labelHeight : clampedLabelWidth
	const height = isVertical ? clampedLabelWidth : labelHeight

	let x: number
	let y: number

	switch (labelSide) {
		case 0:
			x = offsetX
			y = -(labelHeight + offsetY)
			break
		case 1:
			x = -(labelHeight + offsetY)
			y = shape.props.h - (offsetX + clampedLabelWidth)
			break
		case 2:
			x = shape.props.w - (offsetX + clampedLabelWidth)
			y = shape.props.h + offsetY
			break
		case 3:
			x = shape.props.w + offsetY
			y = offsetX
			break
	}

	return new Rectangle2d({
		x,
		y,
		width,
		height,
		isFilled: true,
		isLabel: true,
		excludeFromShapeBounds: true,
	})
}

const FlexContainerHeading = memo(function FlexContainerHeading({
	shape,
	label = FLEX_CONTAINER_DEFAULT_LABEL,
}: {
	shape: FrameLabelBoxShape
	label?: string
}) {
	const editor = useEditor()
	const { side, translation } = useValue(
		'flex container heading',
		() => {
			const labelSide = getContainerHeadingSide(editor, shape)
			return {
				side: labelSide,
				translation: getContainerHeadingTranslation(shape, labelSide),
			}
		},
		[editor, shape]
	)

	return (
		<div
			className="tl-frame-heading"
			style={{
				overflow: 'hidden',
				maxWidth: `calc(var(--tl-zoom) * ${
					side === 0 || side === 2 ? Math.ceil(shape.props.w) : Math.ceil(shape.props.h)
				}px + var(--tl-frame-offset-width))`,
				bottom: '100%',
				transform: `${translation} scale(min(var(--tl-scale), 3.5)) translateX(-7px)`,
			}}
		>
			<div
				className="tl-frame-heading-hit-area flex-layout-heading__label"
				style={{
					color: 'var(--tl-color-text-1)',
					backgroundColor: '#fff',
					boxShadow: 'inset 0px 0px 0px 1px var(--tl-color-muted-1)',
				}}
			>
				{label}
			</div>
		</div>
	)
})

// [3]
class FlexLayoutShapeUtil extends BaseFrameLikeShapeUtil<FlexLayoutShape> {
	static override type = FLEX_LAYOUT_SHAPE_TYPE
	static override props: RecordProps<FlexLayoutShape> = {
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		direction: T.literalEnum('horizontal', 'vertical'),
		align: T.literalEnum('start', 'center', 'end'),
		justify: T.literalEnum('start', 'center', 'end', 'space-between'),
	}

	override canResize() {
		return true
	}

	override canResizeChildren() {
		return false
	}

	override getDefaultProps(): FlexLayoutShape['props'] {
		return {
			w: 420,
			h: 240,
			direction: 'horizontal',
			align: 'center',
			justify: 'center',
		}
	}

	override getGeometry(shape: FlexLayoutShape): Geometry2d {
		return new Group2d({
			children: [
				new Rectangle2d({
					width: shape.props.w,
					height: shape.props.h,
					isFilled: false,
				}),
				getFlexContainerLabelGeometry(this.editor, shape, FLEX_CONTAINER_DEFAULT_LABEL),
			],
		})
	}

	override getText(_shape: FlexLayoutShape) {
		return FLEX_CONTAINER_DEFAULT_LABEL
	}

	override getAriaDescriptor(_shape: FlexLayoutShape) {
		return FLEX_CONTAINER_DEFAULT_LABEL
	}

	override component(shape: FlexLayoutShape) {
		return (
			<>
				<FlexContainerHeading shape={shape} label={FLEX_CONTAINER_DEFAULT_LABEL} />
				<FlexLayoutShapeComponent shape={shape} />
			</>
		)
	}

	// [3a]
	override onResize(shape: FlexLayoutShape, info: TLResizeInfo<FlexLayoutShape>) {
		const children = getFlexLayoutChildren(this.editor, shape.id)
		const minimum = getMinimumContentSize(this.editor, shape, children)
		return resizeBox(shape, info, {
			minWidth: minimum.w,
			minHeight: minimum.h,
		})
	}

	override onResizeEnd(_initialShape: FlexLayoutShape, currentShape: FlexLayoutShape) {
		relayoutFlexLayoutChildren(this.editor, currentShape.id)
	}

	// [3b]
	override onDragShapesOut(shape: FlexLayoutShape, shapes: TLShape[], info: TLDragShapesOutInfo) {
		if (info.nextDraggingOverShapeId) return

		const childrenToMove = shapes.filter((movingShape) => movingShape.parentId === shape.id)
		if (!childrenToMove.length) return

		this.editor.reparentShapes(childrenToMove, this.editor.getCurrentPageId())
		resizeFlexLayoutToChildren(this.editor, shape.id)
	}

	// [3c]
	override onDropShapesOver(
		shape: FlexLayoutShape,
		shapes: TLShape[],
		_info: TLDropShapesOverInfo
	) {
		const dropIndex = getDropIndex(this.editor, shape, shapes)
		dropShapesIntoLayout(this.editor, shape, shapes, dropIndex)
	}

	// [3d]
	override onTranslateEnd(_initialShape: FlexLayoutShape, currentShape: FlexLayoutShape) {
		resizeFlexLayoutToChildren(this.editor, currentShape.id)
	}

	override getIndicatorPath(shape: FlexLayoutShape) {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}
}

const shapeUtils = [FlexLayoutShapeUtil]

// [5]
function FlexLayoutShapeComponent({ shape }: { shape: FlexLayoutShape }) {
	const editor = useEditor()
	const rMeasure = useRef<HTMLDivElement>(null)
	const children = useValue(
		'flex layout children',
		() =>
			editor
				.getSortedChildIdsForParent(shape.id)
				.map((id) => editor.getShape(id))
				.filter((child) => child !== undefined),
		[editor, shape.id]
	)
	const layoutKey = children
		.map((child) => {
			const bounds = editor.getShapeGeometry(child).bounds
			return `${child.id}:${child.x}:${child.y}:${bounds.width}:${bounds.height}`
		})
		.join('|')
	const dropIndicator = useValue(
		'flex layout drop indicator',
		() => getDropIndicator(editor, shape, children),
		[editor, shape.id, shape.props.direction, shape.props.align, shape.props.justify, layoutKey]
	)
	const isTranslatingSelectedChild = useValue(
		'flex layout is translating selected child',
		() => getIsTranslatingSelectedChild(editor, shape),
		[editor, shape.id]
	)

	useLayoutEffect(() => {
		if (isTranslatingSelectedChild) return

		const elm = rMeasure.current
		if (!elm) return
		const measureElm = elm

		resizeFlexLayoutToChildren(editor, shape.id)

		function updateChildrenFromFlexbox() {
			const updates: TLShapePartial[] = Array.from(
				measureElm.querySelectorAll<HTMLElement>('[data-shape-id]')
			).flatMap((childElm) => {
				const childId = childElm.dataset.shapeId as TLShapeId | undefined
				if (!childId) return []
				const child = editor.getShape(childId)
				if (!child || child.parentId !== shape.id) return []
				const x = childElm.offsetLeft
				const y = childElm.offsetTop
				if (Math.abs(child.x - x) < 0.5 && Math.abs(child.y - y) < 0.5) return []
				return [{ id: child.id, type: child.type, x, y } as TLShapePartial]
			})

			if (updates.length) {
				editor.updateShapes(updates)
			}
		}

		updateChildrenFromFlexbox()
		const observer = new ResizeObserver(updateChildrenFromFlexbox)
		observer.observe(measureElm)
		for (const childElm of measureElm.querySelectorAll<HTMLElement>('[data-shape-id]')) {
			observer.observe(childElm)
		}
		return () => observer.disconnect()
	}, [editor, shape, layoutKey, isTranslatingSelectedChild, shape.props.align, shape.props.justify])

	return (
		<HTMLContainer
			className="flex-layout-shape"
			data-drop-active={!!dropIndicator}
			style={{
				width: shape.props.w,
				height: shape.props.h,
			}}
		>
			<div
				ref={rMeasure}
				className="flex-layout-shape__measure"
				style={{
					width: shape.props.w,
					height: shape.props.h,
					padding: FLEX_CONTAINER_PADDING,
					gap: FLEX_CONTAINER_GAP,
					...getFlexContainerStyles(shape),
				}}
			>
				{children.map((child) => {
					const bounds = editor.getShapeGeometry(child).bounds
					return (
						<div
							key={child.id}
							data-shape-id={child.id}
							style={{
								width: bounds.width,
								height: bounds.height,
							}}
						/>
					)
				})}
			</div>
			{dropIndicator ? (
				<div
					className="flex-layout-shape__drop-line"
					data-direction={shape.props.direction}
					data-drop-type={dropIndicator.type}
					style={dropIndicator.style}
				/>
			) : null}
		</HTMLContainer>
	)
}

// [6]
const FlexLayoutToolbar = track(function FlexLayoutToolbar() {
	const editor = useEditor()
	const shape = useValue(
		'selected flex layout shape',
		() => {
			if (!editor.isIn('select.idle')) return null
			const onlySelectedShape = editor.getOnlySelectedShape()
			return onlySelectedShape?.type === FLEX_LAYOUT_SHAPE_TYPE
				? (onlySelectedShape as FlexLayoutShape)
				: null
		},
		[editor]
	)

	if (!shape) return null

	const updateLayoutProps = (props: Partial<FlexContainerLayoutProps>) => {
		editor.run(() => {
			editor.updateShapes([{ id: shape.id, type: shape.type, props } as TLShapePartial])
			relayoutFlexLayoutChildren(editor, shape.id)
		})
		editor.getContainer().focus()
	}

	const isHorizontal = shape.props.direction === 'horizontal'

	const getSelectionBounds = () => {
		const bounds = editor.getSelectionRotatedScreenBounds()
		if (!bounds) return undefined
		return new Box(bounds.x, bounds.y, bounds.width, 0)
	}

	return (
		<TldrawUiContextualToolbar getSelectionBounds={getSelectionBounds} label="Flex layout">
			<TldrawUiToolbarButton
				type="icon"
				title="Horizontal"
				data-testid="flex-layout.horizontal"
				data-isactive={shape.props.direction === 'horizontal'}
				onClick={() => updateLayoutProps({ direction: 'horizontal' })}
			>
				<TldrawUiButtonIcon small icon="stack-horizontal" />
			</TldrawUiToolbarButton>
			<TldrawUiToolbarButton
				type="icon"
				title="Vertical"
				data-testid="flex-layout.vertical"
				data-isactive={shape.props.direction === 'vertical'}
				onClick={() => updateLayoutProps({ direction: 'vertical' })}
			>
				<TldrawUiButtonIcon small icon="stack-vertical" />
			</TldrawUiToolbarButton>
			<TldrawUiToolbarButton
				type="icon"
				title={isHorizontal ? 'Align left' : 'Align top'}
				data-testid="flex-layout.justify-start"
				data-isactive={shape.props.justify === 'start'}
				onClick={() => updateLayoutProps({ justify: 'start' })}
			>
				<TldrawUiButtonIcon
					small
					icon={isHorizontal ? 'horizontal-align-start' : 'vertical-align-start'}
				/>
			</TldrawUiToolbarButton>
			<TldrawUiToolbarButton
				type="icon"
				title={isHorizontal ? 'Align center' : 'Align middle'}
				data-testid="flex-layout.justify-center"
				data-isactive={shape.props.justify === 'center'}
				onClick={() => updateLayoutProps({ justify: 'center' })}
			>
				<TldrawUiButtonIcon
					small
					icon={isHorizontal ? 'horizontal-align-middle' : 'vertical-align-middle'}
				/>
			</TldrawUiToolbarButton>
			<TldrawUiToolbarButton
				type="icon"
				title={isHorizontal ? 'Align right' : 'Align bottom'}
				data-testid="flex-layout.justify-end"
				data-isactive={shape.props.justify === 'end'}
				onClick={() => updateLayoutProps({ justify: 'end' })}
			>
				<TldrawUiButtonIcon
					small
					icon={isHorizontal ? 'horizontal-align-end' : 'vertical-align-end'}
				/>
			</TldrawUiToolbarButton>
			<TldrawUiToolbarButton
				type="icon"
				title={isHorizontal ? 'Distribute horizontally' : 'Distribute vertically'}
				data-testid="flex-layout.justify-space-between"
				data-isactive={shape.props.justify === 'space-between'}
				onClick={() => updateLayoutProps({ justify: 'space-between' })}
			>
				<TldrawUiButtonIcon
					small
					icon={isHorizontal ? 'distribute-horizontal' : 'distribute-vertical'}
				/>
			</TldrawUiToolbarButton>
			<TldrawUiToolbarButton
				type="icon"
				title={isHorizontal ? 'Align top' : 'Align left'}
				data-testid="flex-layout.align-start"
				data-isactive={shape.props.align === 'start'}
				onClick={() => updateLayoutProps({ align: 'start' })}
			>
				<TldrawUiButtonIcon
					small
					icon={isHorizontal ? 'vertical-align-start' : 'horizontal-align-start'}
				/>
			</TldrawUiToolbarButton>
			<TldrawUiToolbarButton
				type="icon"
				title={isHorizontal ? 'Align middle' : 'Align center'}
				data-testid="flex-layout.align-center"
				data-isactive={shape.props.align === 'center'}
				onClick={() => updateLayoutProps({ align: 'center' })}
			>
				<TldrawUiButtonIcon
					small
					icon={isHorizontal ? 'vertical-align-middle' : 'horizontal-align-middle'}
				/>
			</TldrawUiToolbarButton>
			<TldrawUiToolbarButton
				type="icon"
				title={isHorizontal ? 'Align bottom' : 'Align right'}
				data-testid="flex-layout.align-end"
				data-isactive={shape.props.align === 'end'}
				onClick={() => updateLayoutProps({ align: 'end' })}
			>
				<TldrawUiButtonIcon
					small
					icon={isHorizontal ? 'vertical-align-end' : 'horizontal-align-end'}
				/>
			</TldrawUiToolbarButton>
		</TldrawUiContextualToolbar>
	)
})

// [7]
function getFlexLayoutChildren(editor: Editor, shapeId: TLShapeId) {
	return editor
		.getSortedChildIdsForParent(shapeId)
		.map((id) => editor.getShape(id))
		.filter((child): child is TLShape => !!child)
}

function getIsTranslatingSelectedChild(editor: Editor, shape: FlexLayoutShape) {
	return (
		editor.getPath() === 'select.translating' &&
		editor.getSelectedShapes().some((selectedShape) => selectedShape.parentId === shape.id)
	)
}

function getDropIndex(editor: Editor, shape: FlexLayoutShape, movingShapes: TLShape[]) {
	const movingIds = new Set(movingShapes.map((movingShape) => movingShape.id))
	const children = editor
		.getSortedChildIdsForParent(shape.id)
		.map((id) => editor.getShape(id))
		.filter((child): child is TLShape => !!child && !movingIds.has(child.id))

	const point = editor.getPointInShapeSpace(shape, editor.inputs.getCurrentPagePoint())
	const axis = shape.props.direction === 'horizontal' ? 'x' : 'y'

	for (let i = 0; i < children.length; i++) {
		const child = children[i]
		const bounds = editor.getShapeGeometry(child).bounds
		const midpoint = child[axis] + (axis === 'x' ? bounds.width : bounds.height) / 2
		if (point[axis] < midpoint) return i
	}

	return children.length
}

function dropShapesIntoLayout(
	editor: Editor,
	shape: FlexLayoutShape,
	shapes: TLShape[],
	dropIndex: number
) {
	const shapesToDrop = shapes.filter((movingShape) => {
		if (movingShape.id === shape.id) return false
		return !editor.hasAncestor(shape, movingShape.id)
	})
	if (shapesToDrop.length === 0) return

	const movingIds = new Set(shapesToDrop.map((movingShape) => movingShape.id))
	const remainingChildren = editor
		.getSortedChildIdsForParent(shape.id)
		.map((id) => editor.getShape(id))
		.filter((child): child is TLShape => !!child && !movingIds.has(child.id))

	const nextChildren = [...remainingChildren]
	nextChildren.splice(dropIndex, 0, ...shapesToDrop)
	const indices = getIndicesBetween(undefined, undefined, nextChildren.length)
	const desiredSize = getDesiredSize(editor, shape, nextChildren)
	const childPositions = getChildPositions(editor, shape, nextChildren, desiredSize)

	editor.run(() => {
		editor.reparentShapes(shapesToDrop, shape.id)
		editor.updateShape<FlexLayoutShape>({
			id: shape.id,
			type: shape.type,
			props: desiredSize,
		})
		editor.updateShapes(
			nextChildren.map((child, index) => ({
				id: child.id,
				type: child.type,
				index: indices[index],
				...childPositions[index],
			})) as TLShapePartial[]
		)
	})
}

function relayoutFlexLayoutChildren(editor: Editor, shapeId: TLShapeId) {
	const shape = editor.getShape(shapeId) as FlexLayoutShape | undefined
	if (!shape) return

	const children = getFlexLayoutChildren(editor, shapeId)
	if (children.length === 0) return

	const childPositions = getChildPositions(editor, shape, children)

	editor.updateShapes(
		children.map((child, index) => ({
			id: child.id,
			type: child.type,
			...childPositions[index],
		})) as TLShapePartial[]
	)
}

function resizeFlexLayoutToChildren(editor: Editor, shapeId: TLShapeId) {
	const shape = editor.getShape(shapeId) as FlexLayoutShape | undefined
	if (!shape) return

	const children = getFlexLayoutChildren(editor, shapeId)
	const desiredSize = getDesiredSize(editor, shape, children)
	if (
		Math.abs(shape.props.w - desiredSize.w) < 0.5 &&
		Math.abs(shape.props.h - desiredSize.h) < 0.5
	) {
		return
	}

	editor.updateShape<FlexLayoutShape>({
		id: shape.id,
		type: shape.type,
		props: desiredSize,
	})
}

function getDropIndicator(editor: Editor, shape: FlexLayoutShape, children: TLShape[]) {
	if (editor.getPath() !== 'select.translating') return null

	const pagePoint = editor.inputs.getCurrentPagePoint()
	const point = editor.getPointInShapeSpace(shape, pagePoint)
	const isInside = editor.isPointInShape(shape.id, pagePoint, { hitInside: true })

	const selectedShapes = editor.getSelectedShapes()
	const isDraggingChild = selectedShapes.some(
		(selectedShape) => selectedShape.parentId === shape.id
	)
	const isDraggingOver = editor.getHintingShapeIds().includes(shape.id)

	if (isInside && (isDraggingOver || isDraggingChild)) {
		return {
			type: 'in',
			style: getDropInLineStyle(
				editor,
				shape,
				children,
				getDropIndex(editor, shape, selectedShapes)
			),
		} as const
	}

	if (isDraggingChild) {
		return {
			type: 'out',
			style: getDropOutLineStyle(shape, point),
		} as const
	}

	return null
}

// [8]
export default function FlexLayoutExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={shapeUtils}
				components={{ InFrontOfTheCanvas: FlexLayoutToolbar }}
				onMount={(editor) => {
					;(window as any).editor = editor
					const childA = createShapeId('flex-child-a')
					const childB = createShapeId('flex-child-b')
					const orphanC = createShapeId('flex-orphan-c')
					editor.createShapes([
						{
							id: FLEX_LAYOUT_ID,
							type: FLEX_LAYOUT_SHAPE_TYPE,
							x: 160,
							y: 160,
						},
						{
							id: childA,
							type: 'geo',
							x: FLEX_CONTAINER_PADDING,
							y: FLEX_CONTAINER_PADDING,
							parentId: FLEX_LAYOUT_ID,
							props: { w: 128, h: 72, geo: 'rectangle', color: 'red', fill: 'solid' },
						},
						{
							id: childB,
							type: 'geo',
							x: FLEX_CONTAINER_PADDING + 96 + FLEX_CONTAINER_GAP,
							y: FLEX_CONTAINER_PADDING,
							parentId: FLEX_LAYOUT_ID,
							props: { w: 96, h: 96, geo: 'rectangle', color: 'green', fill: 'solid' },
						},
						{
							id: orphanC,
							type: 'geo',
							x: 480,
							y: 480,
							props: { w: 80, h: 144, geo: 'rectangle', color: 'blue', fill: 'solid' },
						},
					])
					resizeFlexLayoutToChildren(editor, FLEX_LAYOUT_ID)
					editor.select(FLEX_LAYOUT_ID)
				}}
			/>
		</div>
	)
}

/*
Introduction:

This example shows a frame-like custom shape that uses CSS flexbox to arrange its children.

[1]
Extend TLGlobalShapePropsMap with `FlexContainerLayoutProps` (direction, align, justify) plus
width and height.

[2]
Define the shape type using TLShape with the shape's type as a type argument.

[3]
Create the shape util. BaseFrameLikeShapeUtil gives us frame-like behavior, such as clipping
children and drag-and-drop reparenting.

	[3a]
	Allow resizing, but clamp width and height to the minimum needed to fit all children, padding,
	and gaps. Relayout children when a resize finishes.

	[3b]
	Override drag-out so the layout updates after a child leaves.

	[3c]
	Finalize dropped child order and positions on pointer-up. Frame-like hover behavior handles
	temporary reparenting during the drag.

	[3d]
	Keep container size in sync after the layout itself is translated.

The util composes its geometry from an unfilled body plus a frame-style label hit area, and
renders `FlexContainerHeading` for an uneditable title (select the layout by clicking the label;
clicks on interior padding pass through, like a frame).

[4]
Frame-style label geometry and heading component. The label hit area follows the same rotation-
aware side logic as the built-in FrameShapeUtil. `getFlexContainerLabelGeometry` returns a
Rectangle2d positioned outside the shape bounds so clicking the label selects the layout.

[5]
Render the layout shape. A hidden measurement layer runs real CSS flexbox, then writes measured
child positions back to the store via a ResizeObserver.

[6]
A contextual toolbar shown when the layout shape is selected. Uses TldrawUiContextualToolbar and
TldrawUiToolbarButton to provide direction, justify, and align controls.

[7]
Helpers for reparenting, relayout, and drop indicators.

[8]
Mount the editor with demo shapes and register the toolbar component.

Visual styles for the shape live in `flex-layout.css`. Size math, axis positioning, and drop
indicator geometry are in `FlexContainerHelpers.tsx`.
*/
