import { Editor, TLShape, TLShapeId } from 'tldraw'

export const FLEX_CONTAINER_DEFAULT_LABEL = 'Flex layout'

export const FLEX_CONTAINER_PADDING = 24
export const FLEX_CONTAINER_GAP = 16
export const FLEX_CONTAINER_EMPTY_WIDTH = 160
export const FLEX_CONTAINER_EMPTY_HEIGHT = 120

export type FlexAlign = 'start' | 'center' | 'end'
export type FlexJustify = 'start' | 'center' | 'end' | 'space-between'

export interface FlexContainerLayoutProps {
	direction: 'horizontal' | 'vertical'
	align: FlexAlign
	justify: FlexJustify
}

export interface FlexContainerBoxShape {
	id: TLShapeId
	props: FlexContainerLayoutProps & { w: number; h: number }
}

export interface FrameLabelBoxShape {
	id: TLShapeId
	props: { w: number; h: number }
}

function toCssFlex(value: FlexAlign | FlexJustify) {
	if (value === 'start') return 'flex-start'
	if (value === 'end') return 'flex-end'
	return value
}

export function getFlexContainerStyles(shape: FlexContainerBoxShape): React.CSSProperties {
	const isHorizontal = shape.props.direction === 'horizontal'
	return {
		flexDirection: isHorizontal ? 'row' : 'column',
		justifyContent: toCssFlex(shape.props.justify),
		alignItems: toCssFlex(shape.props.align),
	}
}

export function getMainAxisPositions(
	sizes: number[],
	innerSize: number,
	justify: FlexJustify,
	gap: number
): number[] {
	const count = sizes.length
	if (count === 0) return []

	const contentSize = sizes.reduce((sum, size) => sum + size, 0) + gap * Math.max(0, count - 1)
	const freeSpace = innerSize - contentSize

	if (justify === 'start' || (justify === 'space-between' && count === 1)) {
		let position = 0
		return sizes.map((size) => {
			const axisPosition = position
			position += size + gap
			return axisPosition
		})
	}

	if (justify === 'end') {
		let position = freeSpace
		return sizes.map((size) => {
			const axisPosition = position
			position += size + gap
			return axisPosition
		})
	}

	if (justify === 'center') {
		let position = freeSpace / 2
		return sizes.map((size) => {
			const axisPosition = position
			position += size + gap
			return axisPosition
		})
	}

	const spacing = gap + freeSpace / (count - 1)
	let position = 0
	return sizes.map((size, index) => {
		const axisPosition = position
		position += size + (index < count - 1 ? spacing : 0)
		return axisPosition
	})
}

export function getCrossAxisOffset(childSize: number, innerSize: number, align: FlexAlign) {
	if (align === 'start') return 0
	if (align === 'end') return innerSize - childSize
	return (innerSize - childSize) / 2
}

export function getMinimumContentSize(
	editor: Editor,
	shape: FlexContainerBoxShape,
	children: TLShape[]
) {
	if (children.length === 0) {
		return { w: FLEX_CONTAINER_EMPTY_WIDTH, h: FLEX_CONTAINER_EMPTY_HEIGHT }
	}

	const bounds = children.map((child) => editor.getShapeGeometry(child).bounds)
	const totalGap = FLEX_CONTAINER_GAP * Math.max(0, children.length - 1)

	if (shape.props.direction === 'horizontal') {
		return {
			w: bounds.reduce((sum, b) => sum + b.width, 0) + totalGap + FLEX_CONTAINER_PADDING * 2,
			h: Math.max(...bounds.map((b) => b.height)) + FLEX_CONTAINER_PADDING * 2,
		}
	}

	return {
		w: Math.max(...bounds.map((b) => b.width)) + FLEX_CONTAINER_PADDING * 2,
		h: bounds.reduce((sum, b) => sum + b.height, 0) + totalGap + FLEX_CONTAINER_PADDING * 2,
	}
}

export function getDesiredSize(editor: Editor, shape: FlexContainerBoxShape, children: TLShape[]) {
	const minimum = getMinimumContentSize(editor, shape, children)
	return {
		w: Math.max(shape.props.w, minimum.w),
		h: Math.max(shape.props.h, minimum.h),
	}
}

export function getChildPositions(
	editor: Editor,
	shape: FlexContainerBoxShape,
	children: TLShape[],
	size = getDesiredSize(editor, shape, children)
) {
	const bounds = children.map((child) => editor.getShapeGeometry(child).bounds)
	const innerW = size.w - FLEX_CONTAINER_PADDING * 2
	const innerH = size.h - FLEX_CONTAINER_PADDING * 2

	if (shape.props.direction === 'horizontal') {
		const mainPositions = getMainAxisPositions(
			bounds.map((b) => b.width),
			innerW,
			shape.props.justify,
			FLEX_CONTAINER_GAP
		)

		return bounds.map((b, index) => ({
			x: FLEX_CONTAINER_PADDING + mainPositions[index],
			y: FLEX_CONTAINER_PADDING + getCrossAxisOffset(b.height, innerH, shape.props.align),
		}))
	}

	const mainPositions = getMainAxisPositions(
		bounds.map((b) => b.height),
		innerH,
		shape.props.justify,
		FLEX_CONTAINER_GAP
	)

	return bounds.map((b, index) => ({
		x: FLEX_CONTAINER_PADDING + getCrossAxisOffset(b.width, innerW, shape.props.align),
		y: FLEX_CONTAINER_PADDING + mainPositions[index],
	}))
}

export function getDropInLineStyle(
	editor: Editor,
	shape: FlexContainerBoxShape,
	children: TLShape[],
	dropIndex: number
): React.CSSProperties {
	const movingIds = new Set(editor.getSelectedShapeIds())
	const layoutChildren = children.filter((child) => !movingIds.has(child.id))

	if (shape.props.direction === 'horizontal') {
		const x = getDropLineCoordinate(editor, layoutChildren, dropIndex, 'x', shape.props.w)
		return {
			left: x - 1,
			top: FLEX_CONTAINER_PADDING,
			width: 2,
			height: shape.props.h - FLEX_CONTAINER_PADDING * 2,
		}
	}

	const y = getDropLineCoordinate(editor, layoutChildren, dropIndex, 'y', shape.props.h)
	return {
		left: FLEX_CONTAINER_PADDING,
		top: y - 1,
		width: shape.props.w - FLEX_CONTAINER_PADDING * 2,
		height: 2,
	}
}

export function getDropOutLineStyle(
	shape: FlexContainerBoxShape,
	point: { x: number; y: number }
): React.CSSProperties {
	if (shape.props.direction === 'horizontal') {
		const x = point.x < shape.props.w / 2 ? 0 : shape.props.w
		return {
			left: x - 1,
			top: FLEX_CONTAINER_PADDING,
			width: 2,
			height: shape.props.h - FLEX_CONTAINER_PADDING * 2,
		}
	}

	const y = point.y < shape.props.h / 2 ? 0 : shape.props.h
	return {
		left: FLEX_CONTAINER_PADDING,
		top: y - 1,
		width: shape.props.w - FLEX_CONTAINER_PADDING * 2,
		height: 2,
	}
}

function getDropLineCoordinate(
	editor: Editor,
	children: TLShape[],
	dropIndex: number,
	axis: 'x' | 'y',
	size: number
) {
	if (children.length === 0) return size / 2
	if (dropIndex <= 0) return children[0][axis] - FLEX_CONTAINER_GAP / 2

	const previous = children[Math.min(dropIndex - 1, children.length - 1)]
	const previousBounds = editor.getShapeGeometry(previous).bounds
	const previousEnd = previous[axis] + (axis === 'x' ? previousBounds.width : previousBounds.height)

	if (dropIndex >= children.length) return previousEnd + FLEX_CONTAINER_GAP / 2

	const next = children[dropIndex]
	return (previousEnd + next[axis]) / 2
}
