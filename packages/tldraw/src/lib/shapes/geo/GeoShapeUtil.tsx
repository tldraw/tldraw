/* eslint-disable react-hooks/rules-of-hooks */
import {
	BaseBoxShapeUtil,
	Box,
	EMPTY_ARRAY,
	Editor,
	Group2d,
	HTMLContainer,
	HandleSnapGeometry,
	Rectangle2d,
	SVGContainer,
	SvgExportContext,
	TLGeoShape,
	TLGeoShapeProps,
	TLResizeInfo,
	TLShapeUtilCanvasSvgDef,
	Vec,
	exhaustiveSwitchError,
	geoShapeMigrations,
	geoShapeProps,
	getColorValue,
	getDefaultColorTheme,
	getFontsFromRichText,
	isEqual,
	lerp,
	toRichText,
	useValue,
} from '@tldraw/editor'
import {
	isEmptyRichText,
	renderHtmlFromRichTextForMeasurement,
	renderPlaintextFromRichText,
} from '../../utils/text/richText'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { RichTextLabel, RichTextSVG } from '../shared/RichTextLabel'
import {
	FONT_FAMILIES,
	LABEL_FONT_SIZES,
	LABEL_PADDING,
	STROKE_SIZES,
	TEXT_PROPS,
} from '../shared/default-shape-constants'
import { getFillDefForCanvas, getFillDefForExport } from '../shared/defaultStyleDefs'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'
import { useIsReadyForEditing } from '../shared/useEditablePlainText'
import { GeoShapeBody } from './components/GeoShapeBody'
import { getGeoShapePath } from './getGeoShapePath'

const MIN_SIZE_WITH_LABEL = 17 * 3

/** @public */
export class GeoShapeUtil extends BaseBoxShapeUtil<TLGeoShape> {
	static override type = 'geo' as const
	static override props = geoShapeProps
	static override migrations = geoShapeMigrations

	override canEdit() {
		return true
	}

	override getDefaultProps(): TLGeoShape['props'] {
		return {
			w: 100,
			h: 100,
			geo: 'rectangle',
			dash: 'draw',
			growY: 0,
			url: '',
			scale: 1,

			// Text properties
			color: 'black',
			labelColor: 'black',
			fill: 'none',
			size: 'm',
			font: 'draw',
			align: 'middle',
			verticalAlign: 'middle',
			richText: toRichText(''),
		}
	}

	override getGeometry(shape: TLGeoShape) {
		const w = Math.max(1, shape.props.w)
		const h = Math.max(1, shape.props.h + shape.props.growY)

		const path = getGeoShapePath(shape)
		const unscaledlabelSize = getUnscaledLabelSize(this.editor, shape)
		// unscaled w and h
		const unscaledW = w / shape.props.scale
		const unscaledH = h / shape.props.scale
		const unscaledminWidth = Math.min(100, unscaledW / 2)
		const unscaledMinHeight = Math.min(
			LABEL_FONT_SIZES[shape.props.size] * TEXT_PROPS.lineHeight + LABEL_PADDING * 2,
			unscaledH / 2
		)

		const unscaledLabelWidth = Math.min(
			unscaledW,
			Math.max(unscaledlabelSize.w, Math.min(unscaledminWidth, Math.max(1, unscaledW - 8)))
		)
		const unscaledLabelHeight = Math.min(
			unscaledH,
			Math.max(unscaledlabelSize.h, Math.min(unscaledMinHeight, Math.max(1, unscaledH - 8)))
		)

		// todo: use centroid for label position

		return new Group2d({
			children: [
				path.toGeometry(),
				new Rectangle2d({
					x:
						shape.props.align === 'start'
							? 0
							: shape.props.align === 'end'
								? (unscaledW - unscaledLabelWidth) * shape.props.scale
								: ((unscaledW - unscaledLabelWidth) / 2) * shape.props.scale,
					y:
						shape.props.verticalAlign === 'start'
							? 0
							: shape.props.verticalAlign === 'end'
								? (unscaledH - unscaledLabelHeight) * shape.props.scale
								: ((unscaledH - unscaledLabelHeight) / 2) * shape.props.scale,
					width: unscaledLabelWidth * shape.props.scale,
					height: unscaledLabelHeight * shape.props.scale,
					isFilled: true,
					isLabel: true,
					excludeFromShapeBounds: true,
					isEmptyLabel: isEmptyRichText(shape.props.richText),
				}),
			],
		})
	}

	override getHandleSnapGeometry(shape: TLGeoShape): HandleSnapGeometry {
		const geometry = this.getGeometry(shape)
		// we only want to snap handles to the outline of the shape - not to its label etc.
		const outline = geometry.children[0]
		switch (shape.props.geo) {
			case 'arrow-down':
			case 'arrow-left':
			case 'arrow-right':
			case 'arrow-up':
			case 'check-box':
			case 'diamond':
			case 'hexagon':
			case 'octagon':
			case 'pentagon':
			case 'rectangle':
			case 'rhombus':
			case 'rhombus-2':
			case 'star':
			case 'trapezoid':
			case 'triangle':
			case 'x-box':
				// poly-line type shapes hand snap points for each vertex & the center
				return { outline: outline, points: [...outline.vertices, geometry.bounds.center] }
			case 'cloud':
			case 'ellipse':
			case 'heart':
			case 'oval':
				// blobby shapes only have a snap point in their center
				return { outline: outline, points: [geometry.bounds.center] }
			default:
				exhaustiveSwitchError(shape.props.geo)
		}
	}

	override getText(shape: TLGeoShape) {
		return renderPlaintextFromRichText(this.editor, shape.props.richText)
	}

	override getFontFaces(shape: TLGeoShape) {
		if (isEmptyRichText(shape.props.richText)) {
			return EMPTY_ARRAY
		}
		return getFontsFromRichText(this.editor, shape.props.richText, {
			family: `tldraw_${shape.props.font}`,
			weight: 'normal',
			style: 'normal',
		})
	}

	component(shape: TLGeoShape) {
		const { id, type, props } = shape
		const { fill, font, align, verticalAlign, size, richText } = props
		const theme = useDefaultColorTheme()
		const { editor } = this
		const isOnlySelected = useValue(
			'isGeoOnlySelected',
			() => shape.id === editor.getOnlySelectedShapeId(),
			[editor]
		)
		const isReadyForEditing = useIsReadyForEditing(editor, shape.id)
		const isEmpty = isEmptyRichText(shape.props.richText)
		const showHtmlContainer = isReadyForEditing || !isEmpty
		const isForceSolid = useValue('force solid', () => editor.getZoomLevel() < 0.2, [editor])

		return (
			<>
				<SVGContainer>
					<GeoShapeBody shape={shape} shouldScale={true} forceSolid={isForceSolid} />
				</SVGContainer>
				{showHtmlContainer && (
					<HTMLContainer
						style={{
							overflow: 'hidden',
							width: shape.props.w,
							height: shape.props.h + props.growY,
						}}
					>
						<RichTextLabel
							shapeId={id}
							type={type}
							font={font}
							fontSize={LABEL_FONT_SIZES[size] * shape.props.scale}
							lineHeight={TEXT_PROPS.lineHeight}
							padding={LABEL_PADDING * shape.props.scale}
							fill={fill}
							align={align}
							verticalAlign={verticalAlign}
							richText={richText}
							isSelected={isOnlySelected}
							labelColor={getColorValue(theme, props.labelColor, 'solid')}
							wrap
						/>
					</HTMLContainer>
				)}
				{shape.props.url && <HyperlinkButton url={shape.props.url} />}
			</>
		)
	}

	indicator(shape: TLGeoShape) {
		const isZoomedOut = useValue('isZoomedOut', () => this.editor.getZoomLevel() < 0.25, [
			this.editor,
		])

		const { size, dash, scale } = shape.props
		const strokeWidth = STROKE_SIZES[size]

		const path = getGeoShapePath(shape)

		return path.toSvg({
			style: dash === 'draw' ? 'draw' : 'solid',
			strokeWidth: 1,
			passes: 1,
			randomSeed: shape.id,
			offset: 0,
			roundness: strokeWidth * 2 * scale,
			props: { strokeWidth: undefined },
			forceSolid: isZoomedOut,
		})
	}

	override toSvg(shape: TLGeoShape, ctx: SvgExportContext) {
		const scale = shape.props.scale
		// We need to scale the shape to 1x for export
		const newShape = {
			...shape,
			props: {
				...shape.props,
				w: shape.props.w / scale,
				h: (shape.props.h + shape.props.growY) / scale,
				growY: 0, // growY throws off the path calculations, so we set it to 0
			},
		}
		const props = newShape.props
		ctx.addExportDef(getFillDefForExport(props.fill))

		let textEl
		if (!isEmptyRichText(props.richText)) {
			const theme = getDefaultColorTheme(ctx)
			const bounds = new Box(0, 0, props.w, (shape.props.h + shape.props.growY) / scale)
			textEl = (
				<RichTextSVG
					fontSize={LABEL_FONT_SIZES[props.size]}
					font={props.font}
					align={props.align}
					verticalAlign={props.verticalAlign}
					richText={props.richText}
					labelColor={getColorValue(theme, props.labelColor, 'solid')}
					bounds={bounds}
					padding={LABEL_PADDING}
				/>
			)
		}

		return (
			<>
				<GeoShapeBody shouldScale={false} shape={newShape} forceSolid={false} />
				{textEl}
			</>
		)
	}

	override getCanvasSvgDefs(): TLShapeUtilCanvasSvgDef[] {
		return [getFillDefForCanvas()]
	}

	override onResize(
		shape: TLGeoShape,
		{ handle, newPoint, scaleX, scaleY, initialShape }: TLResizeInfo<TLGeoShape>
	) {
		const unscaledInitialW = initialShape.props.w / initialShape.props.scale
		const unscaledInitialH = initialShape.props.h / initialShape.props.scale
		const unscaledGrowY = initialShape.props.growY / initialShape.props.scale
		// use the w/h from props here instead of the initialBounds here,
		// since cloud shapes calculated bounds can differ from the props w/h.
		let unscaledW = unscaledInitialW * scaleX
		let unscaledH = (unscaledInitialH + unscaledGrowY) * scaleY
		let overShrinkX = 0
		let overShrinkY = 0

		const min = MIN_SIZE_WITH_LABEL

		if (!isEmptyRichText(shape.props.richText)) {
			let newW = Math.max(Math.abs(unscaledW), min)
			let newH = Math.max(Math.abs(unscaledH), min)

			if (newW < min && newH === min) newW = min
			if (newW === min && newH < min) newH = min

			const unscaledLabelSize = getUnscaledLabelSize(this.editor, {
				...shape,
				props: {
					...shape.props,
					w: newW * shape.props.scale,
					h: newH * shape.props.scale,
				},
			})

			const nextW = Math.max(Math.abs(unscaledW), unscaledLabelSize.w) * Math.sign(unscaledW)
			const nextH = Math.max(Math.abs(unscaledH), unscaledLabelSize.h) * Math.sign(unscaledH)
			overShrinkX = Math.abs(nextW) - Math.abs(unscaledW)
			overShrinkY = Math.abs(nextH) - Math.abs(unscaledH)

			unscaledW = nextW
			unscaledH = nextH
		}

		const scaledW = unscaledW * shape.props.scale
		const scaledH = unscaledH * shape.props.scale

		const offset = new Vec(0, 0)

		// x offsets

		if (scaleX < 0) {
			offset.x += scaledW
		}

		if (handle === 'left' || handle === 'top_left' || handle === 'bottom_left') {
			offset.x += scaleX < 0 ? overShrinkX : -overShrinkX
		}

		// y offsets

		if (scaleY < 0) {
			offset.y += scaledH
		}

		if (handle === 'top' || handle === 'top_left' || handle === 'top_right') {
			offset.y += scaleY < 0 ? overShrinkY : -overShrinkY
		}

		const { x, y } = offset.rot(shape.rotation).add(newPoint)

		return {
			x,
			y,
			props: {
				w: Math.max(Math.abs(scaledW), 1),
				h: Math.max(Math.abs(scaledH), 1),
				growY: 0,
			},
		}
	}

	override onBeforeCreate(shape: TLGeoShape) {
		if (isEmptyRichText(shape.props.richText)) {
			if (shape.props.growY) {
				// No text / some growY, set growY to 0
				return {
					...shape,
					props: {
						...shape.props,
						growY: 0,
					},
				}
			} else {
				// No text / no growY, nothing to change
				return
			}
		}

		const unscaledPrevHeight = shape.props.h / shape.props.scale
		const unscaledNextHeight = getUnscaledLabelSize(this.editor, shape).h

		let growY: number | null = null

		if (unscaledNextHeight > unscaledPrevHeight) {
			growY = unscaledNextHeight - unscaledPrevHeight
		} else {
			if (shape.props.growY) {
				growY = 0
			}
		}

		if (growY !== null) {
			return {
				...shape,
				props: {
					...shape.props,
					// scale the growY
					growY: growY * shape.props.scale,
				},
			}
		}
	}

	override onBeforeUpdate(prev: TLGeoShape, next: TLGeoShape) {
		// No change to text, font, or size, no need to update update
		if (
			isEqual(prev.props.richText, next.props.richText) &&
			prev.props.font === next.props.font &&
			prev.props.size === next.props.size
		) {
			return
		}

		// If we got rid of the text, cancel out any growY from the prev text
		const wasEmpty = isEmptyRichText(prev.props.richText)
		const isEmpty = isEmptyRichText(next.props.richText)
		if (!wasEmpty && isEmpty) {
			return {
				...next,
				props: {
					...next.props,
					growY: 0,
				},
			}
		}

		// Get the prev width and height in unscaled values
		const unscaledPrevWidth = prev.props.w / prev.props.scale
		const unscaledPrevHeight = prev.props.h / prev.props.scale
		const unscaledPrevGrowY = prev.props.growY / prev.props.scale

		// Get the next width and height in unscaled values
		const unscaledNextLabelSize = getUnscaledLabelSize(this.editor, next)

		// When entering the first character in a label (not pasting in multiple characters...)
		if (wasEmpty && !isEmpty && renderPlaintextFromRichText(this.editor, next.props.richText)) {
			let unscaledW = Math.max(unscaledPrevWidth, unscaledNextLabelSize.w)
			let unscaledH = Math.max(unscaledPrevHeight, unscaledNextLabelSize.h)

			const min = MIN_SIZE_WITH_LABEL

			// If both the width and height were less than the minimum size, make the shape square
			if (unscaledPrevWidth < min && unscaledPrevHeight < min) {
				unscaledW = Math.max(unscaledW, min)
				unscaledH = Math.max(unscaledH, min)
				unscaledW = Math.max(unscaledW, unscaledH)
				unscaledH = Math.max(unscaledW, unscaledH)
			}

			// Don't set a growY—at least, not until we've implemented a growX property
			return {
				...next,
				props: {
					...next.props,
					// Scale the results
					w: unscaledW * next.props.scale,
					h: unscaledH * next.props.scale,
					growY: 0,
				},
			}
		}

		let growY: number | null = null

		if (unscaledNextLabelSize.h > unscaledPrevHeight) {
			growY = unscaledNextLabelSize.h - unscaledPrevHeight
		} else {
			if (unscaledPrevGrowY) {
				growY = 0
			}
		}

		if (growY !== null) {
			const unscaledNextWidth = next.props.w / next.props.scale
			return {
				...next,
				props: {
					...next.props,
					// Scale the results
					growY: growY * next.props.scale,
					w: Math.max(unscaledNextWidth, unscaledNextLabelSize.w) * next.props.scale,
				},
			}
		}

		if (unscaledNextLabelSize.w > unscaledPrevWidth) {
			return {
				...next,
				props: {
					...next.props,
					// Scale the results
					w: unscaledNextLabelSize.w * next.props.scale,
				},
			}
		}

		// otherwise, no update needed
	}

	override onDoubleClick(shape: TLGeoShape) {
		// Little easter egg: double-clicking a rectangle / checkbox while
		// holding alt will toggle between check-box and rectangle
		if (this.editor.inputs.altKey) {
			switch (shape.props.geo) {
				case 'rectangle': {
					return {
						...shape,
						props: {
							geo: 'check-box' as const,
						},
					}
				}
				case 'check-box': {
					return {
						...shape,
						props: {
							geo: 'rectangle' as const,
						},
					}
				}
			}
		}

		return
	}
	override getInterpolatedProps(
		startShape: TLGeoShape,
		endShape: TLGeoShape,
		t: number
	): TLGeoShapeProps {
		return {
			...(t > 0.5 ? endShape.props : startShape.props),
			w: lerp(startShape.props.w, endShape.props.w, t),
			h: lerp(startShape.props.h, endShape.props.h, t),
			scale: lerp(startShape.props.scale, endShape.props.scale, t),
		}
	}
}

// imperfect but good enough, should be the width of the W in the font / size combo
const minWidths = {
	s: 12,
	m: 14,
	l: 16,
	xl: 20,
}

const extraPaddings = {
	s: 2,
	m: 3.5,
	l: 5,
	xl: 10,
}

function getUnscaledLabelSize(editor: Editor, shape: TLGeoShape) {
	const { richText, font, size, w } = shape.props

	if (!richText || isEmptyRichText(richText)) {
		return { w: 0, h: 0 }
	}

	// way too expensive to be recomputing on every update
	const minWidth = minWidths[size]

	const html = renderHtmlFromRichTextForMeasurement(editor, richText)
	const textSize = editor.textMeasure.measureHtml(html, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[font],
		fontSize: LABEL_FONT_SIZES[size],
		minWidth: minWidth,
		maxWidth: Math.max(
			// Guard because a DOM nodes can't be less 0
			0,
			// A 'w' width that we're setting as the min-width
			Math.ceil(minWidth + extraPaddings[size]),
			// The actual text size
			Math.ceil(w / shape.props.scale - LABEL_PADDING * 2)
		),
	})

	return {
		w: textSize.w + LABEL_PADDING * 2,
		h: textSize.h + LABEL_PADDING * 2,
	}
}
