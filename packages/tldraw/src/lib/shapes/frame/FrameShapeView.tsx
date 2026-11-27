import {
	SVGContainer,
	TLFrameShape,
	TLShapeView,
	definePlugin,
	shapeViewSlot,
	useColorMode,
	useValue,
} from '@tldraw/editor'
import classNames from 'classnames'
import {
	TLCreateTextJsxFromSpansOpts,
	createTextJsxFromSpans,
} from '../shared/createTextJsxFromSpans'
import { getDisplayValues } from '../shared/getDisplayValues'
import { FrameHeading } from './components/FrameHeading'
import {
	defaultEmptyAs,
	getFrameHeadingOpts,
	getFrameHeadingSide,
	getFrameHeadingSize,
	getFrameHeadingTranslation,
} from './frameHelpers'
import type { FrameShapeUtil } from './FrameShapeUtil'

/** @public */
export const frameShapeView: TLShapeView<TLFrameShape, FrameShapeUtil> = {
	type: 'frame',
	component(shape, util) {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const colorMode = useColorMode()
		const dv = getDisplayValues(util, shape, colorMode)

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const isCreating = useValue(
			'is creating this shape',
			() => {
				const resizingState = util.editor.getStateDescendant('select.resizing')
				if (!resizingState) return false
				if (!resizingState.getIsActive()) return false
				const info = (resizingState as typeof resizingState & { info: { isCreating: boolean } })
					?.info
				if (!info) return false
				return info.isCreating && util.editor.getOnlySelectedShapeId() === shape.id
			},
			[shape.id]
		)

		const showFrameColors = util.options.showColors

		return (
			<>
				<SVGContainer>
					<rect
						className={classNames('tl-frame__body', { 'tl-frame__creating': isCreating })}
						fill={showFrameColors ? dv.showColorsFillColor : dv.fillColor}
						stroke={showFrameColors ? dv.showColorsStrokeColor : dv.strokeColor}
						style={{
							width: `calc(${shape.props.w}px + 1px / var(--tl-zoom))`,
							height: `calc(${shape.props.h}px + 1px / var(--tl-zoom))`,
							transform: `translate(calc(-0.5px / var(--tl-zoom)), calc(-0.5px / var(--tl-zoom)))`,
						}}
					/>
				</SVGContainer>
				{isCreating ? null : (
					<FrameHeading
						id={shape.id}
						name={shape.props.name}
						fill={showFrameColors ? dv.showColorsHeadingFillColor : dv.headingFillColor}
						stroke={showFrameColors ? dv.showColorsHeadingStrokeColor : dv.headingStrokeColor}
						color={showFrameColors ? dv.showColorsHeadingTextColor : dv.headingTextColor}
						width={shape.props.w}
						height={shape.props.h}
						offsetX={showFrameColors ? -1 : -7}
						showColors={util.options.showColors}
					/>
				)}
			</>
		)
	},

	toSvg(shape, ctx, util) {
		const dv = getDisplayValues(util, shape, ctx.colorMode)

		// rotate right 45 deg
		const labelSide = getFrameHeadingSide(util.editor, shape)
		const isVertical = labelSide % 2 === 1
		const rotatedTopEdgeWidth = isVertical ? shape.props.h : shape.props.w
		const labelTranslate = getFrameHeadingTranslation(shape, labelSide, true)

		// Truncate with ellipsis
		const opts: TLCreateTextJsxFromSpansOpts = getFrameHeadingOpts(rotatedTopEdgeWidth - 12, true)

		const frameTitle = defaultEmptyAs(shape.props.name, 'Frame') + String.fromCharCode(8203)
		const labelBounds = getFrameHeadingSize(util.editor, shape, opts)
		const spans = util.editor.textMeasure.measureTextSpans(frameTitle, opts)
		const text = createTextJsxFromSpans(util.editor, spans, opts)

		const showFrameColors = util.options.showColors
		const frameHeadingStroke = showFrameColors
			? dv.showColorsHeadingStrokeColor
			: dv.headingStrokeColor
		const frameHeadingFill = showFrameColors ? dv.showColorsHeadingFillColor : dv.headingFillColor
		const frameHeadingText = showFrameColors ? dv.showColorsHeadingTextColor : dv.headingTextColor

		return (
			<>
				<rect
					width={shape.props.w}
					height={shape.props.h}
					fill={showFrameColors ? dv.showColorsFillColor : dv.fillColor}
					stroke={showFrameColors ? dv.showColorsStrokeColor : dv.strokeColor}
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
	},
}

/**
 * Draws frame shapes with {@link frameShapeView}. Importing `tldraw` adds it to
 * `createDefaultPlugins()`, see {@link defaultShapeViewPlugins}.
 *
 * @public
 */
export const frameShapeViewPlugin = definePlugin({
	id: 'frameShapeView',
	setup: (ctx) => void ctx.contribute(shapeViewSlot, frameShapeView),
})
