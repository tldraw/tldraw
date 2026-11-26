/* eslint-disable react-hooks/rules-of-hooks */
import {
	Box,
	SVGContainer,
	TLArrowShape,
	TLShapeView,
	debugFlags,
	definePlugin,
	shapeViewSlot,
	toDomPrecision,
	track,
	useEditor,
	useIsEditing,
	useSharedSafeId,
	useValue,
} from '@tldraw/editor'
import { useMemo } from 'react'
import { isEmptyRichText } from '../../utils/text/richText'
import { getFillDefForCanvas, getFillDefForExport } from '../shared/defaultStyleDefs'
import { getDisplayValues } from '../shared/getDisplayValues'
import { PathBuilder } from '../shared/PathBuilder'
import { PatternFill } from '../shared/PatternFill'
import { RichTextLabel, RichTextSVG } from '../shared/RichTextLabel'
import { useEfficientZoomThreshold } from '../shared/useEfficientZoomThreshold'
import { getArrowheadPathForType } from './arrowheads'
import { getArrowLabelPosition } from './arrowLabel'
import { getArrowBodyPath } from './ArrowPath'
import type { ArrowShapeUtil } from './ArrowShapeUtil'
import { ElbowArrowDebug } from './elbow/ElbowArrowDebug'
import { getArrowInfo } from './getArrowInfo'

/** @public */
export const arrowShapeView: TLShapeView<TLArrowShape, ArrowShapeUtil> = {
	type: 'arrow',
	component(shape, util) {
		const { editor } = util
		const dv = getDisplayValues(util, shape)

		const isSelected = useValue(
			'is selected',
			() => editor.getOnlySelectedShape()?.id === shape.id,
			[editor, shape.id]
		)

		const isEditing = useValue('is editing', () => editor.getEditingShapeId() === shape.id, [
			editor,
			shape.id,
		])

		const info = getArrowInfo(editor, shape)
		if (!info?.isValid) return null

		const labelPosition = getArrowLabelPosition(editor, shape, isEditing)
		const showArrowLabel = isEditing || !isEmptyRichText(shape.props.richText)

		return (
			<>
				<SVGContainer style={{ minWidth: 50, minHeight: 50 }}>
					<ArrowSvg
						shape={shape}
						strokeColor={dv.strokeColor}
						strokeWidth={dv.strokeWidth}
						fillColor={dv.fillColor}
						patternFillFallbackColor={dv.patternFillFallbackColor}
						labelBorderRadius={dv.labelBorderRadius}
					/>
					{shape.props.kind === 'elbow' && debugFlags.debugElbowArrows.get() && (
						<ElbowArrowDebug arrow={shape} />
					)}
				</SVGContainer>
				{showArrowLabel && (
					<RichTextLabel
						shapeId={shape.id}
						type="arrow"
						fontFamily={dv.labelFontFamily}
						checkboxStyle={dv.labelCheckboxStyle}
						fontSize={dv.labelFontSize}
						lineHeight={dv.labelLineHeight}
						textAlign="center"
						verticalAlign="middle"
						labelColor={dv.labelColor}
						richText={shape.props.richText}
						textWidth={
							(labelPosition.box.w - dv.labelPadding * 2 * shape.props.scale) / shape.props.scale
						}
						isSelected={isSelected}
						padding={0}
						showTextOutline={util.options.showTextOutline}
						style={{
							transform: `translate(${labelPosition.box.center.x}px, ${labelPosition.box.center.y}px)${shape.props.scale !== 1 ? ` scale(${shape.props.scale})` : ''}`,
						}}
					/>
				)}
			</>
		)
	},

	toSvg(shape, ctx, util) {
		ctx.addExportDef(getFillDefForExport(shape.props.fill))
		const dv = getDisplayValues(util, shape, ctx.colorMode)
		const scaleFactor = 1 / shape.props.scale

		const showArrowLabel = !isEmptyRichText(shape.props.richText)

		return (
			<g transform={`scale(${scaleFactor})`}>
				<ArrowSvg
					shape={shape}
					strokeColor={dv.strokeColor}
					strokeWidth={dv.strokeWidth}
					fillColor={dv.fillColor}
					patternFillFallbackColor={dv.patternFillFallbackColor}
					labelBorderRadius={dv.labelBorderRadius}
				/>
				{showArrowLabel && (
					<RichTextSVG
						fontSize={dv.labelFontSize * shape.props.scale}
						fontFamily={dv.labelFontFamily}
						checkboxStyle={dv.labelCheckboxStyle}
						lineHeight={dv.labelLineHeight}
						textAlign="center"
						verticalAlign="middle"
						labelColor={dv.labelColor}
						richText={shape.props.richText}
						bounds={getArrowLabelPosition(util.editor, shape, false)
							.box.clone()
							.expandBy(-dv.labelPadding * shape.props.scale)}
						padding={0}
						showTextOutline={util.options.showTextOutline}
					/>
				)}
			</g>
		)
	},

	getCanvasSvgDefs() {
		return [getFillDefForCanvas()]
	},
}

/**
 * Draws arrow shapes with {@link arrowShapeView}. Importing `tldraw` adds it to
 * `createDefaultPlugins()`, see {@link defaultShapeViewPlugins}.
 *
 * @public
 */
export const arrowShapeViewPlugin = definePlugin({
	id: 'arrowShapeView',
	setup: (ctx) => void ctx.contribute(shapeViewSlot, arrowShapeView),
})

const ArrowSvg = track(function ArrowSvg({
	shape,
	strokeColor,
	strokeWidth: baseStrokeWidth,
	fillColor,
	patternFillFallbackColor,
	labelBorderRadius = 3.5,
}: {
	shape: TLArrowShape
	strokeColor: string
	strokeWidth: number
	fillColor: string
	patternFillFallbackColor: string
	labelBorderRadius?: number
}) {
	const editor = useEditor()
	const info = getArrowInfo(editor, shape)
	const isForceSolid = useEfficientZoomThreshold(0.25 / shape.props.scale)
	const clipPathId = useSharedSafeId(shape.id + '_clip')
	const isEditing = useIsEditing(shape.id)
	const geometry = editor.getShapeGeometry(shape)
	if (!geometry) return null
	const bounds = Box.ZeroFix(geometry.bounds)
	const isEmpty = isEmptyRichText(shape.props.richText)

	if (!info?.isValid) return null

	const strokeWidth = baseStrokeWidth * shape.props.scale

	const as = info.start.arrowhead && getArrowheadPathForType(info, 'start', strokeWidth)
	const ae = info.end.arrowhead && getArrowheadPathForType(info, 'end', strokeWidth)

	const labelPosition = getArrowLabelPosition(editor, shape, isEditing)

	const clipStartArrowhead = !(info.start.arrowhead === 'none' || info.start.arrowhead === 'arrow')
	const clipEndArrowhead = !(info.end.arrowhead === 'none' || info.end.arrowhead === 'arrow')

	return (
		<>
			{/* Yep */}
			<defs>
				<clipPath id={clipPathId}>
					<ArrowClipPath
						radius={labelBorderRadius * shape.props.scale}
						hasText={isEditing || !isEmpty}
						bounds={bounds}
						labelBounds={labelPosition.box}
						as={clipStartArrowhead && as ? as : ''}
						ae={clipEndArrowhead && ae ? ae : ''}
					/>
				</clipPath>
			</defs>
			<g
				fill="none"
				stroke={strokeColor}
				strokeWidth={strokeWidth}
				strokeLinejoin="round"
				strokeLinecap="round"
				pointerEvents="none"
			>
				<g
					style={{
						clipPath: `url(#${clipPathId})`,
						WebkitClipPath: `url(#${clipPathId})`,
					}}
				>
					<rect
						x={toDomPrecision(bounds.minX - 100)}
						y={toDomPrecision(bounds.minY - 100)}
						width={toDomPrecision(bounds.width + 200)}
						height={toDomPrecision(bounds.height + 200)}
						opacity={0}
					/>
					{getArrowBodyPath(shape, info, {
						style: shape.props.dash,
						strokeWidth,
						forceSolid: isForceSolid,
						randomSeed: shape.id,
					})}
				</g>
				{as &&
					clipStartArrowhead &&
					shape.props.fill !== 'none' &&
					(shape.props.fill === 'pattern' ? (
						<PatternFill
							d={as}
							fillColor={fillColor}
							patternFillFallbackColor={patternFillFallbackColor}
							scale={shape.props.scale}
						/>
					) : (
						<path fill={fillColor} d={as} />
					))}
				{ae &&
					clipEndArrowhead &&
					shape.props.fill !== 'none' &&
					(shape.props.fill === 'pattern' ? (
						<PatternFill
							d={ae}
							fillColor={fillColor}
							patternFillFallbackColor={patternFillFallbackColor}
							scale={shape.props.scale}
						/>
					) : (
						<path fill={fillColor} d={ae} />
					))}
				{as && <path d={as} />}
				{ae && <path d={ae} />}
			</g>
		</>
	)
})

function ArrowClipPath({
	radius,
	hasText,
	bounds,
	labelBounds,
	as,
	ae,
}: {
	radius: number
	hasText: boolean
	bounds: Box
	labelBounds: Box
	as: string
	ae: string
}) {
	const path = useMemo(() => {
		// The direction in which we create the different path parts is important, as it determines what gets clipped.
		// See the description on the directions in the non-zero fill rule example:
		// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-rule#nonzero
		const path = new PathBuilder()

		// We create this one in the clockwise direction
		path
			.moveTo(bounds.left - 100, bounds.top - 100)
			.lineTo(bounds.right + 100, bounds.top - 100)
			.lineTo(bounds.right + 100, bounds.bottom + 100)
			.lineTo(bounds.left - 100, bounds.bottom + 100)
			.close()

		if (hasText) {
			// We create this one in the counter-clockwise direction, which cuts out the label box
			path
				.moveTo(labelBounds.left, labelBounds.top + radius)
				.lineTo(labelBounds.left, labelBounds.bottom - radius)
				.circularArcTo(radius, false, false, labelBounds.left + radius, labelBounds.bottom)
				.lineTo(labelBounds.right - radius, labelBounds.bottom)
				.circularArcTo(radius, false, false, labelBounds.right, labelBounds.bottom - radius)
				.lineTo(labelBounds.right, labelBounds.top + radius)
				.circularArcTo(radius, false, false, labelBounds.right - radius, labelBounds.top)
				.lineTo(labelBounds.left + radius, labelBounds.top)
				.circularArcTo(radius, false, false, labelBounds.left, labelBounds.top + radius)
				.close()
		}

		return path.toD()
	}, [
		radius,
		hasText,
		bounds.bottom,
		bounds.left,
		bounds.right,
		bounds.top,
		labelBounds.bottom,
		labelBounds.left,
		labelBounds.right,
		labelBounds.top,
	])

	// We also append the arrowhead paths to the clip path, so that we also clip the arrowheads
	return <path d={`${path}${as}${ae}`} />
}
