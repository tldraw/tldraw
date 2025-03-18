import {
	BaseBoxShapeUtil,
	Editor,
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
		const labelSide = getFrameHeadingSide(editor, shape)
		const isVertical = labelSide % 2 === 1

		const dimension = isVertical ? shape.props.h : shape.props.w
		const opts = getFrameHeadingOpts(shape, 'black', dimension)
		const headingSize = getFrameHeadingSize(editor, shape, opts)
		const isShowingFrameColors = showFrameColors(editor, shape)

		const offsetX = isShowingFrameColors ? 0 : -8 / z
		const offsetY = 4 / z

		const extraWidth = FRAME_HEADING_EXTRA_WIDTH / z
		const minWidth = FRAME_HEADING_MIN_WIDTH / z

		const labelWidth = clamp(headingSize.w / z + extraWidth, minWidth, dimension + extraWidth)
		const labelHeight = headingSize.h / z

		const width = isVertical ? labelHeight : labelWidth
		const height = isVertical ? labelWidth : labelHeight

		// Calculate label position based on side
		const positions = [
			{ x: offsetX, y: -labelHeight - offsetY },
			{ x: -labelHeight - offsetY, y: shape.props.h - offsetX - labelWidth },
			{ x: shape.props.w - offsetX - labelWidth, y: shape.props.h + offsetY },
			{ x: shape.props.w + offsetY, y: offsetX },
		]

		const { x, y } = positions[labelSide]

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

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const showFrameColors = useShowFrameColors(this.editor, shape.id)
		const frameFill = showFrameColors ? color.frame.fill : theme.solid
		const frameStroke = showFrameColors ? color.frame.stroke : theme.text
		const frameHeadingFill = showFrameColors ? color.fill : theme.blue.fill
		const frameHeadingText = showFrameColors ? color.frame.text : theme.text

		return (
			<>
				<SVGContainer>
					<rect
						className={classNames('tl-frame__body', { 'tl-frame__creating': isCreating })}
						width={shape.props.w}
						height={shape.props.h}
						fill={frameFill}
						stroke={frameStroke}
					/>
				</SVGContainer>
				{isCreating ? null : (
					<FrameHeading
						id={shape.id}
						name={shape.props.name}
						fill={frameHeadingFill}
						color={frameHeadingText}
						width={shape.props.w}
						height={shape.props.h}
						offsetX={showFrameColors ? 0 : -8}
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
		const opts: TLCreateTextJsxFromSpansOpts = getFrameHeadingOpts(shape, theme.text, labelSide)

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

function showFrameColors(editor: Editor, shape: TLFrameShape) {
	return editor.options.showFrameColors && shape.props.color !== 'black'
}

function useShowFrameColors(editor: Editor, shapeId: TLFrameShape['id']) {
	return useValue(
		'show frame colors',
		() => {
			const shape = editor.getShape<TLFrameShape>(shapeId)
			if (!shape) return false
			return showFrameColors(editor, shape)
		},
		[editor]
	)
}
