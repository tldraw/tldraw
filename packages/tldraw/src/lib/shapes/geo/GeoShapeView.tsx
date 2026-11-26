/* eslint-disable react-hooks/rules-of-hooks */
import {
	Box,
	HTMLContainer,
	SVGContainer,
	TLGeoShape,
	TLShapeView,
	definePlugin,
	shapeViewSlot,
	useColorMode,
	useValue,
} from '@tldraw/editor'
import { isEmptyRichText } from '../../utils/text/richText'
import { getFillDefForCanvas, getFillDefForExport } from '../shared/defaultStyleDefs'
import { getDisplayValues } from '../shared/getDisplayValues'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { RichTextLabel, RichTextSVG } from '../shared/RichTextLabel'
import { useIsReadyForEditing } from '../shared/useEditablePlainText'
import { useEfficientZoomThreshold } from '../shared/useEfficientZoomThreshold'
import { GeoShapeBody } from './GeoShapeBody'
import type { GeoShapeUtil } from './GeoShapeUtil'

/** @public */
export const geoShapeView: TLShapeView<TLGeoShape, GeoShapeUtil> = {
	type: 'geo',
	component(shape, util) {
		const { id, type, props } = shape
		const { editor } = util
		const isOnlySelected = useValue(
			'isGeoOnlySelected',
			() => shape.id === editor.getOnlySelectedShapeId(),
			[editor]
		)
		const isReadyForEditing = useIsReadyForEditing(editor, shape.id)
		const isForceSolid = useEfficientZoomThreshold(0.25 / shape.props.scale)
		const colorMode = useColorMode()
		const dv = getDisplayValues(util, shape, colorMode)

		const { w, h, richText, url } = props

		const isEmpty = isEmptyRichText(richText)
		const showHtmlContainer = isReadyForEditing || !isEmpty

		return (
			<>
				<SVGContainer>
					<GeoShapeBody
						shape={shape}
						shouldScale={true}
						forceSolid={isForceSolid}
						strokeColor={dv.strokeColor}
						strokeWidth={dv.strokeWidth}
						fillColor={dv.fillColor}
						patternFillFallbackColor={dv.patternFillFallbackColor}
						customGeoTypes={util.options.customGeoTypes}
					/>
				</SVGContainer>
				{showHtmlContainer && (
					<HTMLContainer
						style={{
							overflow: 'hidden',
							width: w,
							height: h + props.growY,
						}}
					>
						<RichTextLabel
							shapeId={id}
							type={type}
							fontFamily={dv.labelFontFamily}
							checkboxStyle={dv.labelCheckboxStyle}
							fontSize={dv.labelFontSize}
							lineHeight={dv.labelLineHeight}
							padding={dv.labelPadding}
							textAlign={dv.labelHorizontalAlign}
							verticalAlign={dv.labelVerticalAlign}
							richText={richText}
							isSelected={isOnlySelected}
							labelColor={dv.labelColor}
							wrap
							showTextOutline={util.options.showTextOutline}
							style={
								shape.props.scale !== 1
									? {
											transform: `scale(${shape.props.scale})`,
											transformOrigin: 'top left',
											width: shape.props.w / shape.props.scale,
											height: (shape.props.h + props.growY) / shape.props.scale,
										}
									: undefined
							}
						/>
					</HTMLContainer>
				)}
				{url && <HyperlinkButton url={url} />}
			</>
		)
	},

	toSvg(shape, ctx, util) {
		const dv = getDisplayValues(util, shape, ctx.colorMode)
		const { richText, fill, scale, growY, w, h } = shape.props
		// We need to scale the shape to 1x for export
		const newShape = {
			...shape,
			props: {
				...shape.props,
				w: w / scale,
				h: (h + growY) / scale,
				growY: 0, // growY throws off the path calculations, so we set it to 0
			},
		}
		ctx.addExportDef(getFillDefForExport(fill))

		let textEl
		if (!isEmptyRichText(richText)) {
			const bounds = new Box(0, 0, newShape.props.w, (h + growY) / scale)
			textEl = (
				<RichTextSVG
					fontSize={dv.labelFontSize}
					fontFamily={dv.labelFontFamily}
					checkboxStyle={dv.labelCheckboxStyle}
					lineHeight={dv.labelLineHeight}
					textAlign={dv.labelHorizontalAlign}
					verticalAlign={dv.labelVerticalAlign}
					labelColor={dv.labelColor}
					padding={dv.labelPadding}
					showTextOutline={util.options.showTextOutline}
					bounds={bounds}
					richText={richText}
				/>
			)
		}

		return (
			<>
				<GeoShapeBody
					shouldScale={false}
					shape={newShape}
					forceSolid={false}
					strokeColor={dv.strokeColor}
					strokeWidth={dv.strokeWidth}
					fillColor={dv.fillColor}
					patternFillFallbackColor={dv.patternFillFallbackColor}
					customGeoTypes={util.options.customGeoTypes}
				/>
				{textEl}
			</>
		)
	},

	getCanvasSvgDefs() {
		return [getFillDefForCanvas()]
	},
}

/**
 * Draws geo shapes with {@link geoShapeView}. Importing `tldraw` adds it to
 * `createDefaultPlugins()`, see {@link defaultShapeViewPlugins}.
 *
 * @public
 */
export const geoShapeViewPlugin = definePlugin({
	id: 'geoShapeView',
	setup: (ctx) => void ctx.contribute(shapeViewSlot, geoShapeView),
})
