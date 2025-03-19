import {
	BaseBoxShapeUtil,
	Geometry2d,
	Group2d,
	Rectangle2d,
	SVGContainer,
	SvgExportContext,
	TLFrameShape,
	TLFrameShapeProps,
	TLGroupShape,
	TLResizeInfo,
	TLShape,
	clamp,
	frameShapeMigrations,
	frameShapeProps,
	getDefaultColorTheme,
	lerp,
	resizeBox,
	toDomPrecision,
	useValue,
} from '@tldraw/editor'
import classNames from 'classnames'
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

const FRAME_HEADING_EXTRA_WIDTH = 14
const FRAME_HEADING_MIN_WIDTH = 32 // --fmw
const FRAME_HEADING_NOCOLORS_OFFSET_X = -8
const FRAME_HEADING_OFFSET_Y = 4

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

	override canEdit() {
		return true
	}

	override getDefaultProps(): TLFrameShape['props'] {
		return { w: 160 * 2, h: 90 * 2, name: '', color: 'black' }
	}

	override getGeometry(shape: TLFrameShape): Geometry2d {
		const { editor } = this

		const z = editor.getZoomLevel()

		// Which dimension measures the top edge after rotation?
		const labelSide = getFrameHeadingSide(editor, shape)
		const isVertical = labelSide % 2 === 1
		const rotatedTopEdgeWidth = isVertical ? shape.props.h : shape.props.w

		// Get the size of the heading (max width equal to the rotatedTopEdgeWidth)
		const opts = getFrameHeadingOpts(rotatedTopEdgeWidth)
		const headingSize = getFrameHeadingSize(editor, shape, opts)

		// If NOT showing frame colors, we need to offset the label
		// to the left so that the title is in line with the shape edge
		// and add that extra width to the right side of the label
		const isShowingFrameColors = editor.options.showFrameColors

		// Scale everything into **screen space**
		const extraWidth = FRAME_HEADING_EXTRA_WIDTH / z
		const minWidth = FRAME_HEADING_MIN_WIDTH / z
		const maxWidth = rotatedTopEdgeWidth + (isShowingFrameColors ? 0 : extraWidth)

		const labelWidth = headingSize.w / z
		const labelHeight = headingSize.h / z

		const clampedLabelWidth = clamp(labelWidth + extraWidth, minWidth, maxWidth)

		const offsetX = (isShowingFrameColors ? 0 : FRAME_HEADING_NOCOLORS_OFFSET_X) / z
		const offsetY = FRAME_HEADING_OFFSET_Y / z

		// In page space
		const width = isVertical ? labelHeight : clampedLabelWidth
		const height = isVertical ? clampedLabelWidth : labelHeight

		/* Calculate label position based on side. The position needs to always appear at the top left
		of the shape, regardless of rotation. 
		
       Displayed              Actual     
			 
			 0deg
       ┌───────┐              ┌───────┐       
       └───────┘              └───────┘       
       ┌─────────────┐        ┌─────────────┐ 
       │x            │        │ x           │ 
       │             │        │             │ 
       │             │        │             │ 
       └─────────────┘        └─────────────┘ 
       
			 90deg

       ┌───────┐                              
       └───────┘              ┌───────┐       
       ┌───────┐              │       │       
       │      x│              │       │       
       │       │              │       │       
       │       │           ┌─┐│       │       
       │       │           │ ││       │       
       │       │           │ ││       │       
       │       │           │ ││x      │       
       └───────┘           └─┘└───────┘       


			The label must be between a minimum and maximum.
			The minimum is arbitrary; the maximum is the width
			of the edge of the frame where the label will be shown.

			┌─┐             ┌───────┐       ┌─────────────┐ 
			└─┘             └───────┘       └─────────────┘ 
			┌─────────────┐ ┌─────────────┐ ┌─────────────┐ 
			│ x           │ │ x           │ │ x           │ 
			│             │ │             │ │             │ 
			│             │ │             │ │             │ 
			└─────────────┘ └─────────────┘ └─────────────┘ 
		*/

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

		const color = theme[shape.props.color]

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

		const showFrameColors = this.editor.options.showFrameColors // useShowFrameColors(this.editor, shape.id)
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
						width={shape.props.w}
						height={shape.props.h}
						fill={frameFill}
						x={1}
						stroke={frameStroke}
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
						offsetX={showFrameColors ? -0 : -8}
					/>
				)}
			</>
		)
	}

	override toSvg(shape: TLFrameShape, ctx: SvgExportContext) {
		const theme = getDefaultColorTheme({ isDarkMode: ctx.isDarkMode })

		// rotate right 45 deg
		const labelSide = getFrameHeadingSide(this.editor, shape)
		const labelTranslate = getFrameHeadingTranslation(shape, labelSide, true)

		// Truncate with ellipsis
		const opts: TLCreateTextJsxFromSpansOpts = getFrameHeadingOpts(labelSide)

		const frameTitle = defaultEmptyAs(shape.props.name, 'Frame') + String.fromCharCode(8203)
		const labelBounds = getFrameHeadingSize(this.editor, shape, opts)
		const spans = this.editor.textMeasure.measureTextSpans(frameTitle, opts)
		const text = createTextJsxFromSpans(this.editor, spans, opts)

		return (
			<>
				<rect
					width={shape.props.w}
					height={shape.props.h}
					fill={theme.solid}
					stroke={theme.black.solid}
					strokeWidth={1}
					rx={1}
					ry={1}
				/>
				<g transform={labelTranslate}>
					<rect
						x={labelBounds.x - 8}
						y={labelBounds.y - 4}
						width={labelBounds.width + 20}
						height={labelBounds.height}
						fill={theme.background}
						rx={4}
						ry={4}
					/>
					{text}
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
}
