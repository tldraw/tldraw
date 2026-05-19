import { useLayoutEffect, useRef } from 'react'
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
	createShapeId,
	getIndicesBetween,
	track,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './flex-layout.css'

// There's a guide at the bottom of this file!

const FLEX_LAYOUT_SHAPE_TYPE = 'flex-layout'
const FLEX_LAYOUT_ID = createShapeId('flex-layout-example')

const PADDING = 24
const GAP = 16
const EMPTY_WIDTH = 160
const EMPTY_HEIGHT = 120

// [1]
declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[FLEX_LAYOUT_SHAPE_TYPE]: {
			w: number
			h: number
			direction: 'horizontal' | 'vertical'
		}
	}
}

// [2]
type FlexLayoutShape = TLShape<typeof FLEX_LAYOUT_SHAPE_TYPE>

// [3]
class FlexLayoutShapeUtil extends BaseFrameLikeShapeUtil<FlexLayoutShape> {
	static override type = FLEX_LAYOUT_SHAPE_TYPE
	static override props: RecordProps<FlexLayoutShape> = {
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		direction: T.literalEnum('horizontal', 'vertical'),
	}

	override canResize() {
		return false
	}

	override canResizeChildren() {
		return false
	}

	override getDefaultProps(): FlexLayoutShape['props'] {
		return {
			w: 420,
			h: 240,
			direction: 'horizontal',
		}
	}

	override getGeometry(shape: FlexLayoutShape): Geometry2d {
		return new Group2d({
			children: [
				new Rectangle2d({
					width: shape.props.w,
					height: shape.props.h,
					isFilled: true,
				}),
			],
		})
	}

	override component(shape: FlexLayoutShape) {
		return <FlexLayoutShapeComponent shape={shape} />
	}

	// [3a]
	override onDragShapesOut(shape: FlexLayoutShape, shapes: TLShape[], info: TLDragShapesOutInfo) {
		if (info.nextDraggingOverShapeId) return

		const childrenToMove = shapes.filter((movingShape) => movingShape.parentId === shape.id)
		if (!childrenToMove.length) return

		this.editor.reparentShapes(childrenToMove, this.editor.getCurrentPageId())
		resizeFlexLayoutToChildren(this.editor, shape.id)
	}

	// [3b]
	override onDropShapesOver(
		shape: FlexLayoutShape,
		shapes: TLShape[],
		_info: TLDropShapesOverInfo
	) {
		const dropIndex = getDropIndex(this.editor, shape, shapes)
		dropShapesIntoLayout(this.editor, shape, shapes, dropIndex)
	}

	// [3c]
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
					const childC = createShapeId('flex-child-c')
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
							x: PADDING,
							y: PADDING,
							parentId: FLEX_LAYOUT_ID,
							props: { w: 96, h: 72, geo: 'rectangle', color: 'red', fill: 'solid' },
						},
						{
							id: childB,
							type: 'geo',
							x: PADDING + 96 + GAP,
							y: PADDING,
							parentId: FLEX_LAYOUT_ID,
							props: { w: 96, h: 72, geo: 'rectangle', color: 'green', fill: 'solid' },
						},
						{
							id: childC,
							type: 'geo',
							x: 480,
							y: 180,
							props: { w: 80, h: 64, geo: 'rectangle', color: 'blue', fill: 'solid' },
						},
					])
					resizeFlexLayoutToChildren(editor, FLEX_LAYOUT_ID)
					editor.select(FLEX_LAYOUT_ID)
					editor.zoomToFit()
				}}
			/>
		</div>
	)
}

// [4]
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
		[editor, shape.id, shape.props.direction, layoutKey]
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
	}, [editor, shape, layoutKey, isTranslatingSelectedChild])

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
					flexDirection: shape.props.direction === 'horizontal' ? 'row' : 'column',
					padding: PADDING,
					gap: GAP,
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

// [5]
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

	const setDirection = (direction: FlexLayoutShape['props']['direction']) => {
		editor.updateShape<FlexLayoutShape>({
			id: shape.id,
			type: FLEX_LAYOUT_SHAPE_TYPE,
			props: { direction },
		})
		editor.getContainer().focus()
	}

	const getSelectionBounds = () => {
		const bounds = editor.getSelectionRotatedScreenBounds()
		if (!bounds) return undefined
		return new Box(bounds.x, bounds.y, bounds.width, 0)
	}

	return (
		<TldrawUiContextualToolbar getSelectionBounds={getSelectionBounds} label="Flex direction">
			<TldrawUiToolbarButton
				type="icon"
				title="Horizontal"
				data-testid="flex-layout.horizontal"
				data-isactive={shape.props.direction === 'horizontal'}
				onClick={() => setDirection('horizontal')}
			>
				<TldrawUiButtonIcon small icon="stack-horizontal" />
			</TldrawUiToolbarButton>
			<TldrawUiToolbarButton
				type="icon"
				title="Vertical"
				data-testid="flex-layout.vertical"
				data-isactive={shape.props.direction === 'vertical'}
				onClick={() => setDirection('vertical')}
			>
				<TldrawUiButtonIcon small icon="stack-vertical" />
			</TldrawUiToolbarButton>
		</TldrawUiContextualToolbar>
	)
})

// [6]
function getDesiredSize(editor: Editor, shape: FlexLayoutShape, children: TLShape[]) {
	if (children.length === 0) {
		return { w: EMPTY_WIDTH, h: EMPTY_HEIGHT }
	}

	const bounds = children.map((child) => editor.getShapeGeometry(child).bounds)
	const totalGap = GAP * Math.max(0, children.length - 1)

	if (shape.props.direction === 'horizontal') {
		return {
			w: bounds.reduce((sum, bounds) => sum + bounds.width, 0) + totalGap + PADDING * 2,
			h: Math.max(...bounds.map((bounds) => bounds.height)) + PADDING * 2,
		}
	}

	return {
		w: Math.max(...bounds.map((bounds) => bounds.width)) + PADDING * 2,
		h: bounds.reduce((sum, bounds) => sum + bounds.height, 0) + totalGap + PADDING * 2,
	}
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

function getChildPositions(
	editor: Editor,
	shape: FlexLayoutShape,
	children: TLShape[],
	size = getDesiredSize(editor, shape, children)
) {
	const bounds = children.map((child) => editor.getShapeGeometry(child).bounds)
	const totalGap = GAP * Math.max(0, children.length - 1)

	if (shape.props.direction === 'horizontal') {
		const totalWidth = bounds.reduce((sum, bounds) => sum + bounds.width, 0) + totalGap
		let x = PADDING + (size.w - PADDING * 2 - totalWidth) / 2

		return bounds.map((bounds) => {
			const position = {
				x,
				y: PADDING + (size.h - PADDING * 2 - bounds.height) / 2,
			}
			x += bounds.width + GAP
			return position
		})
	}

	const totalHeight = bounds.reduce((sum, bounds) => sum + bounds.height, 0) + totalGap
	let y = PADDING + (size.h - PADDING * 2 - totalHeight) / 2

	return bounds.map((bounds) => {
		const position = {
			x: PADDING + (size.w - PADDING * 2 - bounds.width) / 2,
			y,
		}
		y += bounds.height + GAP
		return position
	})
}

function resizeFlexLayoutToChildren(editor: Editor, shapeId: TLShapeId) {
	const shape = editor.getShape(shapeId) as FlexLayoutShape | undefined
	if (!shape) return

	const desiredSize = getDesiredSize(
		editor,
		shape,
		editor
			.getSortedChildIdsForParent(shape.id)
			.map((id) => editor.getShape(id))
			.filter((child) => child !== undefined)
	)
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

function getDropInLineStyle(
	editor: Editor,
	shape: FlexLayoutShape,
	children: TLShape[],
	dropIndex: number
): React.CSSProperties {
	const movingIds = new Set(editor.getSelectedShapeIds())
	const layoutChildren = children.filter((child) => !movingIds.has(child.id))

	if (shape.props.direction === 'horizontal') {
		const x = getDropLineCoordinate(editor, layoutChildren, dropIndex, 'x', shape.props.w)
		return { left: x - 1, top: PADDING, width: 2, height: shape.props.h - PADDING * 2 }
	}

	const y = getDropLineCoordinate(editor, layoutChildren, dropIndex, 'y', shape.props.h)
	return { left: PADDING, top: y - 1, width: shape.props.w - PADDING * 2, height: 2 }
}

function getDropOutLineStyle(
	shape: FlexLayoutShape,
	point: { x: number; y: number }
): React.CSSProperties {
	if (shape.props.direction === 'horizontal') {
		const x = point.x < shape.props.w / 2 ? 0 : shape.props.w
		return { left: x - 1, top: PADDING, width: 2, height: shape.props.h - PADDING * 2 }
	}

	const y = point.y < shape.props.h / 2 ? 0 : shape.props.h
	return { left: PADDING, top: y - 1, width: shape.props.w - PADDING * 2, height: 2 }
}

function getDropLineCoordinate(
	editor: Editor,
	children: TLShape[],
	dropIndex: number,
	axis: 'x' | 'y',
	size: number
) {
	if (children.length === 0) return size / 2
	if (dropIndex <= 0) return children[0][axis] - GAP / 2

	const previous = children[Math.min(dropIndex - 1, children.length - 1)]
	const previousBounds = editor.getShapeGeometry(previous).bounds
	const previousEnd = previous[axis] + (axis === 'x' ? previousBounds.width : previousBounds.height)

	if (dropIndex >= children.length) return previousEnd + GAP / 2

	const next = children[dropIndex]
	return (previousEnd + next[axis]) / 2
}

/*
Introduction:

This example shows a frame-like custom shape that uses CSS flexbox to arrange its children.

[1]
Extend TLGlobalShapePropsMap so TypeScript knows about the custom shape's props.

[2]
Define the shape type using TLShape with the shape's type as a type argument.

[3]
Create the shape util. BaseFrameLikeShapeUtil gives us frame-like behavior, such as clipping
children, and opts it into some special frame-like behaviors around the tldraw SDK.

	[3a]
	Override the frame-like drag-out behavior so we can resize the layout after a child leaves.

	[3b]
	Finalize the dropped child order and positions. The frame-like hover behavior handles temporary
	reparenting; this commits the layout on pointer-up.

	[3c]
	Resize the layout after it finishes translating, keeping the container size in sync with its children.

[4]
Render the layout shape. The hidden measurement layer uses real CSS flexbox, then writes the measured
child positions back to the tldraw store.

[5]
Show a contextual toolbar for switching between horizontal and vertical layout.

[6]
These helpers calculate the layout size, drop index, child positions, and drag indicator.
*/
