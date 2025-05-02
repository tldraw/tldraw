import {
	BaseBoxShapeUtil,
	DefaultColorStyle,
	Geometry2d,
	Group2d,
	Rectangle2d,
	SVGContainer,
	SvgExportContext,
	TLClickEventInfo,
	TLFrameShape,
	TLFrameShapeProps,
	TLGroupShape,
	TLResizeInfo,
	TLShape,
	TLShapePartial,
	TLShapeUtilConstructor,
	clamp,
	compact,
	frameShapeMigrations,
	frameShapeProps,
	getDefaultColorTheme,
	lerp,
	resizeBox,
	toDomPrecision,
	useValue,
} from '@tldraw/editor'
import classNames from 'classnames'
import { fitFrameToContent, getFrameChildrenBounds } from '../../utils/frames/frames'
import {
	TLCreateTextJsxFromSpansOpts,
	createTextJsxFromSpans,
} from '../shared/createTextJsxFromSpans'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'
import { FrameHeading } from './components/FrameHeading'
import {
	getFrameHeadingOpts,
	getFrameHeadingSide,
	getFrameHeadingSize,
	getFrameHeadingTranslation,
} from './frameHelpers'

// Some of these values are repeated in CSS and need to match
const FRAME_HEADING_EXTRA_WIDTH = 12
const FRAME_HEADING_MIN_WIDTH = 32
const FRAME_HEADING_NOCOLORS_OFFSET_X = -7
const FRAME_HEADING_OFFSET_Y = 4

/** @public */
export interface FrameShapeOptions {
	/**
	 * When true, the frame will display colors for the shape's headings and background.
	 */
	showColors: boolean
}

export function defaultEmptyAs(str: string, dflt: string) {
	if (str.match(/^\s*$/)) {
		return dflt
	}
	return str
}

/** @public */
export class FrameShapeUtil extends BaseBoxShapeUtil<TLFrameShape> {
	static override type = 'frame' as const
	static override props = frameShapeProps
	static override migrations = frameShapeMigrations

	override options: FrameShapeOptions = {
		showColors: false,
	}

	// evil crimes :)
	// By default, showColors is off. Because they use style props, which are picked up
	// automatically, we don't have DefaultColorStyle in the props in the schema by default.
	// Instead, when someone calls .configure to turn the option on, we manually add in the color
	// style here so it plays nicely with the other editor APIs.
	static override configure<T extends TLShapeUtilConstructor<any, any>>(
		this: T,
		options: T extends new (...args: any[]) => { options: infer Options } ? Partial<Options> : never
	): T {
		const withOptions = super.configure.call(this, options) as T
		if ((options as any).showColors) {
			;(withOptions as any).props = { ...withOptions.props, color: DefaultColorStyle }
		}
		return withOptions
	}

	override canEdit() {
		return true
	}

	override getDefaultProps(): TLFrameShape['props'] {
		return { w: 160 * 2, h: 90 * 2, name: '', color: 'black' }
	}

	override getAriaDescriptor(shape: TLFrameShape) {
		return shape.props.name
	}

	override getGeometry(shape: TLFrameShape): Geometry2d {
		const { editor } = this

		const z = editor.getZoomLevel()

		// Which dimension measures the top edge after rotation?
		const labelSide = getFrameHeadingSide(editor, shape)
		const isVertical = labelSide % 2 === 1
		const rotatedTopEdgeWidth = isVertical ? shape.props.h : shape.props.w

		// Get the size of the heading (max width equal to the rotatedTopEdgeWidth)
		const opts = getFrameHeadingOpts(rotatedTopEdgeWidth, false)
		const headingSize = getFrameHeadingSize(editor, shape, opts)

		// If NOT showing frame colors, we need to offset the label
		// to the left so that the title is in line with the shape edge
		// and add that extra width to the right side of the label
		const isShowingFrameColors = this.options.showColors

		// Scale everything into **screen space**
		const extraWidth = FRAME_HEADING_EXTRA_WIDTH / z
		const minWidth = FRAME_HEADING_MIN_WIDTH / z
		const maxWidth = rotatedTopEdgeWidth + (isShowingFrameColors ? 1 : extraWidth)

		const labelWidth = headingSize.w / z
		const labelHeight = headingSize.h / z

		const clampedLabelWidth = clamp(labelWidth + extraWidth, minWidth, maxWidth)

		const offsetX = (isShowingFrameColors ? -1 : FRAME_HEADING_NOCOLORS_OFFSET_X) / z
		const offsetY = FRAME_HEADING_OFFSET_Y / z

		// In page space
		const width = isVertical ? labelHeight : clampedLabelWidth
		const height = isVertical ? clampedLabelWidth : labelHeight

		// Calculate label position based on side. The position needs to always appear
		// at the top left of the shape, regardless of rotation. The label must be
		// between a minimum and maximum. The minimum is arbitrary; the maximum is the
		// width of the edge of the frame where the label will be shown.

		let x: number, y: number

		switch (labelSide) {
			case 0: {
				// top
				x = offsetX
				y = -(labelHeight + offsetY)
				break
			}
			case 1: {
				// right
				x = -(labelHeight + offsetY)
				y = shape.props.h - (offsetX + clampedLabelWidth)
				break
			}
			case 2: {
				// bottom
				x = shape.props.w - (offsetX + clampedLabelWidth)
				y = shape.props.h + offsetY
				break
			}
			case 3: {
				// left
				x = shape.props.w + offsetY
				y = offsetX
				break
			}
		}

		return new Group2d({
			children: [
				new Rectangle2d({
					width: shape.props.w,
					height: shape.props.h,
					isFilled: false,
				}),
				new Rectangle2d({
					x,
					y,
					width,
					height,
					isFilled: true,
					isLabel: true,
				}),
			],
		})
	}

	override getText(shape: TLFrameShape): string | undefined {
		return shape.props.name
	}

	override component(shape: TLFrameShape) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useDefaultColorTheme()

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const isCreating = useValue(
			'is creating this shape',
			() => {
				const resizingState = this.editor.getStateDescendant('select.resizing')
				if (!resizingState) return false
				if (!resizingState.getIsActive()) return false
				const info = (resizingState as typeof resizingState & { info: { isCreating: boolean } })
					?.info
				if (!info) return false
				return info.isCreating && this.editor.getOnlySelectedShapeId() === shape.id
			},
			[shape.id]
		)

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const zoomLevel = useValue('zoom level', () => this.editor.getZoomLevel(), [this.editor])

		const showFrameColors = this.options.showColors

		const color = theme[shape.props.color]
		const frameFill = showFrameColors ? color.frame.fill : theme.black.frame.fill
		const frameStroke = showFrameColors ? color.frame.stroke : theme.black.frame.stroke
		const frameHeadingStroke = showFrameColors ? color.frame.headingStroke : theme.background
		const frameHeadingFill = showFrameColors ? color.frame.headingFill : theme.background
		const frameHeadingText = showFrameColors ? color.frame.text : theme.text

		return (
			<>
				<SVGContainer>
					<rect
						className={classNames('tl-frame__body', { 'tl-frame__creating': isCreating })}
						width={shape.props.w + 1 / zoomLevel}
						height={shape.props.h + 1 / zoomLevel}
						fill={frameFill}
						stroke={frameStroke}
						y={-0.5 / zoomLevel}
						x={-0.5 / zoomLevel}
					/>
				</SVGContainer>
				{isCreating ? null : (
					<FrameHeading
						id={shape.id}
						name={shape.props.name}
						fill={frameHeadingFill}
						stroke={frameHeadingStroke}
						color={frameHeadingText}
						width={shape.props.w}
						height={shape.props.h}
						offsetX={showFrameColors ? -1 : -7}
						showColors={this.options.showColors}
					/>
				)}
			</>
		)
	}

	override toSvg(shape: TLFrameShape, ctx: SvgExportContext) {
		const theme = getDefaultColorTheme({ isDarkMode: ctx.isDarkMode })

		// rotate right 45 deg
		const labelSide = getFrameHeadingSide(this.editor, shape)
		const isVertical = labelSide % 2 === 1
		const rotatedTopEdgeWidth = isVertical ? shape.props.h : shape.props.w
		const labelTranslate = getFrameHeadingTranslation(shape, labelSide, true)

		// Truncate with ellipsis
		const opts: TLCreateTextJsxFromSpansOpts = getFrameHeadingOpts(rotatedTopEdgeWidth - 12, true)

		const frameTitle = defaultEmptyAs(shape.props.name, 'Frame') + String.fromCharCode(8203)
		const labelBounds = getFrameHeadingSize(this.editor, shape, opts)
		const spans = this.editor.textMeasure.measureTextSpans(frameTitle, opts)
		const text = createTextJsxFromSpans(this.editor, spans, opts)

		const showFrameColors = this.options.showColors

		const color = theme[shape.props.color]
		const frameFill = showFrameColors ? color.frame.fill : theme.black.frame.fill
		const frameStroke = showFrameColors ? color.frame.stroke : theme.black.frame.stroke
		const frameHeadingStroke = showFrameColors ? color.frame.headingStroke : theme.background
		const frameHeadingFill = showFrameColors ? color.frame.headingFill : theme.background
		const frameHeadingText = showFrameColors ? color.frame.text : theme.text

		return (
			<>
				<rect
					width={shape.props.w}
					height={shape.props.h}
					fill={frameFill}
					stroke={frameStroke}
					strokeWidth={1}
					x={0}
					rx={0}
					ry={0}
				/>
				<g fill={frameHeadingText} transform={labelTranslate}>
					<rect
						x={labelBounds.x - (showFrameColors ? 0 : 6)}
						y={labelBounds.y - 6}
						width={Math.min(rotatedTopEdgeWidth, labelBounds.width + 12)}
						height={labelBounds.height}
						fill={frameHeadingFill}
						stroke={frameHeadingStroke}
						rx={4}
						ry={4}
					/>
					<g transform={`translate(${showFrameColors ? 8 : 0}, 4)`}>{text}</g>
				</g>
			</>
		)
	}

	indicator(shape: TLFrameShape) {
		return (
			<rect
				width={toDomPrecision(shape.props.w)}
				height={toDomPrecision(shape.props.h)}
				className={`tl-frame-indicator`}
			/>
		)
	}

	override canReceiveNewChildrenOfType(shape: TLShape, _type: TLShape['type']) {
		return !shape.isLocked
	}

	override providesBackgroundForChildren(): boolean {
		return true
	}

	override canDropShapes(shape: TLFrameShape, _shapes: TLShape[]): boolean {
		return !shape.isLocked
	}

	override onDragShapesOver(frame: TLFrameShape, shapes: TLShape[]) {
		if (!shapes.every((child) => child.parentId === frame.id)) {
			this.editor.reparentShapes(shapes, frame.id)
		}
	}

	override onDragShapesOut(_shape: TLFrameShape, shapes: TLShape[]): void {
		const parent = this.editor.getShape(_shape.parentId)
		const isInGroup = parent && this.editor.isShapeOfType<TLGroupShape>(parent, 'group')

		// If frame is in a group, keep the shape
		// moved out in that group

		if (isInGroup) {
			this.editor.reparentShapes(shapes, parent.id)
		} else {
			this.editor.reparentShapes(shapes, this.editor.getCurrentPageId())
		}
	}

	override onResize(shape: any, info: TLResizeInfo<any>) {
		return resizeBox(shape, info)
	}
	override getInterpolatedProps(
		startShape: TLFrameShape,
		endShape: TLFrameShape,
		t: number
	): TLFrameShapeProps {
		return {
			...(t > 0.5 ? endShape.props : startShape.props),
			w: lerp(startShape.props.w, endShape.props.w, t),
			h: lerp(startShape.props.h, endShape.props.h, t),
		}
	}

	override onDoubleClickEdge(shape: TLFrameShape, info: TLClickEventInfo) {
		if (info.target !== 'selection') return
		const { handle } = info

		// If handle is missing, we can't determine which edge was clicked
		if (!handle) return

		const isHorizontalEdge = handle === 'left' || handle === 'right'
		const isVerticalEdge = handle === 'top' || handle === 'bottom'

		const childIds = this.editor.getSortedChildIdsForParent(shape.id)
		const children = compact(childIds.map((id) => this.editor.getShape(id)))
		if (!children.length) return

		const { dx, dy, w, h } = getFrameChildrenBounds(children, this.editor, { padding: 10 })

		this.editor.run(() => {
			const changes: TLShapePartial[] = childIds.map((childId) => {
				const childShape = this.editor.getShape(childId)!
				return {
					id: childShape.id,
					type: childShape.type,
					x: isHorizontalEdge ? childShape.x + dx : childShape.x,
					y: isVerticalEdge ? childShape.y + dy : childShape.y,
				}
			})

			this.editor.updateShapes(changes)
		})

		return {
			id: shape.id,
			type: shape.type,
			props: {
				w: isHorizontalEdge ? w : shape.props.w,
				h: isVerticalEdge ? h : shape.props.h,
			},
		}
	}

	override onDoubleClickCorner(shape: TLFrameShape) {
		fitFrameToContent(this.editor, shape.id, { padding: 10 })
		return {
			id: shape.id,
			type: shape.type,
		}
	}
}
