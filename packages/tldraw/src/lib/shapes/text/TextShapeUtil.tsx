/* eslint-disable react-hooks/rules-of-hooks */
import {
	Box,
	Editor,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLGeometryOpts,
	TLResizeInfo,
	TLShapeId,
	TLTextShape,
	Vec,
	createComputedCache,
	getColorValue,
	getDefaultColorTheme,
	getFontsFromRichText,
	isEqual,
	resizeScaled,
	textShapeMigrations,
	textShapeProps,
	toDomPrecision,
	toRichText,
	useEditor,
} from '@tldraw/editor'
import { useCallback } from 'react'
import {
	renderHtmlFromRichTextForMeasurement,
	renderPlaintextFromRichText,
} from '../../utils/text/richText'
import { RichTextLabel, RichTextSVG } from '../shared/RichTextLabel'
import { FONT_FAMILIES, FONT_SIZES, TEXT_PROPS } from '../shared/default-shape-constants'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'

const sizeCache = createComputedCache(
	'text size',
	(editor: Editor, shape: TLTextShape) => {
		editor.fonts.trackFontsForShape(shape)
		return getTextSize(editor, shape.props)
	},
	{ areRecordsEqual: (a, b) => a.props === b.props }
)
/** @public */
export interface TextShapeOptions {
	/** How much addition padding should be added to the horizontal geometry of the shape when binding to an arrow? */
	extraArrowHorizontalPadding: number
}

/** @public */
export class TextShapeUtil extends ShapeUtil<TLTextShape> {
	static override type = 'text' as const
	static override props = textShapeProps
	static override migrations = textShapeMigrations

	override options: TextShapeOptions = {
		extraArrowHorizontalPadding: 10,
	}

	getDefaultProps(): TLTextShape['props'] {
		return {
			color: 'black',
			size: 'm',
			w: 8,
			font: 'draw',
			textAlign: 'start',
			autoSize: true,
			scale: 1,
			richText: toRichText(''),
		}
	}

	getMinDimensions(shape: TLTextShape) {
		return sizeCache.get(this.editor, shape.id)!
	}

	getGeometry(shape: TLTextShape, opts: TLGeometryOpts) {
		const { scale } = shape.props
		const { width, height } = this.getMinDimensions(shape)!
		const context = opts?.context ?? 'none'
		return new Rectangle2d({
			x:
				(context === '@tldraw/arrow-without-arrowhead'
					? -this.options.extraArrowHorizontalPadding
					: 0) * scale,
			width:
				(width +
					(context === '@tldraw/arrow-without-arrowhead'
						? this.options.extraArrowHorizontalPadding * 2
						: 0)) *
				scale,
			height: height * scale,
			isFilled: true,
			isLabel: true,
		})
	}

	override getFontFaces(shape: TLTextShape) {
		// no need for an empty rich text check here
		return getFontsFromRichText(this.editor, shape.props.richText, {
			family: `tldraw_${shape.props.font}`,
			weight: 'normal',
			style: 'normal',
		})
	}

	override getText(shape: TLTextShape) {
		return renderPlaintextFromRichText(this.editor, shape.props.richText)
	}

	override canEdit() {
		return true
	}

	override isAspectRatioLocked() {
		return true
	} // WAIT NO THIS IS HARD CODED IN THE RESIZE HANDLER

	component(shape: TLTextShape) {
		const {
			id,
			props: { font, size, richText, color, scale, textAlign },
		} = shape

		const { width, height } = this.getMinDimensions(shape)
		const isSelected = shape.id === this.editor.getOnlySelectedShapeId()
		const theme = useDefaultColorTheme()
		const handleKeyDown = useTextShapeKeydownHandler(id)

		return (
			<RichTextLabel
				shapeId={id}
				classNamePrefix="tl-text-shape"
				type="text"
				font={font}
				fontSize={FONT_SIZES[size]}
				lineHeight={TEXT_PROPS.lineHeight}
				align={textAlign}
				verticalAlign="middle"
				richText={richText}
				labelColor={getColorValue(theme, color, 'solid')}
				isSelected={isSelected}
				textWidth={width}
				textHeight={height}
				style={{
					transform: `scale(${scale})`,
					transformOrigin: 'top left',
				}}
				wrap
				onKeyDown={handleKeyDown}
			/>
		)
	}

	indicator(shape: TLTextShape) {
		const bounds = this.editor.getShapeGeometry(shape).bounds
		const editor = useEditor()
		if (shape.props.autoSize && editor.getEditingShapeId() === shape.id) return null
		return <rect width={toDomPrecision(bounds.width)} height={toDomPrecision(bounds.height)} />
	}

	override toSvg(shape: TLTextShape, ctx: SvgExportContext) {
		const bounds = this.editor.getShapeGeometry(shape).bounds
		const width = bounds.width / (shape.props.scale ?? 1)
		const height = bounds.height / (shape.props.scale ?? 1)

		const theme = getDefaultColorTheme(ctx)

		const exportBounds = new Box(0, 0, width, height)
		return (
			<RichTextSVG
				fontSize={FONT_SIZES[shape.props.size]}
				font={shape.props.font}
				align={shape.props.textAlign}
				verticalAlign="middle"
				richText={shape.props.richText}
				labelColor={getColorValue(theme, shape.props.color, 'solid')}
				bounds={exportBounds}
				padding={0}
			/>
		)
	}

	override onResize(shape: TLTextShape, info: TLResizeInfo<TLTextShape>) {
		const { newPoint, initialBounds, initialShape, scaleX, handle } = info

		if (info.mode === 'scale_shape' || (handle !== 'right' && handle !== 'left')) {
			return {
				id: shape.id,
				type: shape.type,
				...resizeScaled(shape, info),
			}
		} else {
			const nextWidth = Math.max(1, Math.abs(initialBounds.width * scaleX))
			const { x, y } =
				scaleX < 0 ? Vec.Sub(newPoint, Vec.FromAngle(shape.rotation).mul(nextWidth)) : newPoint

			return {
				id: shape.id,
				type: shape.type,
				x,
				y,
				props: {
					w: nextWidth / initialShape.props.scale,
					autoSize: false,
				},
			}
		}
	}

	override onEditEnd(shape: TLTextShape) {
		// todo: find a way to check if the rich text has any nodes that aren't empty spaces
		const trimmedText = renderPlaintextFromRichText(this.editor, shape.props.richText).trimEnd()

		if (trimmedText.length === 0) {
			this.editor.deleteShapes([shape.id])
		}
	}

	override onBeforeUpdate(prev: TLTextShape, next: TLTextShape) {
		if (!next.props.autoSize) return

		const styleDidChange =
			prev.props.size !== next.props.size ||
			prev.props.textAlign !== next.props.textAlign ||
			prev.props.font !== next.props.font ||
			(prev.props.scale !== 1 && next.props.scale === 1)

		const textDidChange = !isEqual(prev.props.richText, next.props.richText)

		// Only update position if either changed
		if (!styleDidChange && !textDidChange) return

		// Might return a cached value for the bounds
		const boundsA = this.getMinDimensions(prev)

		// Will always be a fresh call to getTextSize
		const boundsB = getTextSize(this.editor, next.props)

		const wA = boundsA.width * prev.props.scale
		const hA = boundsA.height * prev.props.scale
		const wB = boundsB.width * next.props.scale
		const hB = boundsB.height * next.props.scale

		let delta: Vec | undefined

		switch (next.props.textAlign) {
			case 'middle': {
				delta = new Vec((wB - wA) / 2, textDidChange ? 0 : (hB - hA) / 2)
				break
			}
			case 'end': {
				delta = new Vec(wB - wA, textDidChange ? 0 : (hB - hA) / 2)
				break
			}
			default: {
				if (textDidChange) break
				delta = new Vec(0, (hB - hA) / 2)
				break
			}
		}

		if (delta) {
			// account for shape rotation when writing text:
			delta.rot(next.rotation)
			const { x, y } = next
			return {
				...next,
				x: x - delta.x,
				y: y - delta.y,
				props: { ...next.props, w: wB },
			}
		} else {
			return {
				...next,
				props: { ...next.props, w: wB },
			}
		}
	}

	// 	todo: The edge doubleclicking feels like a mistake more often than
	//  not, especially on multiline text. Removed June 16 2024

	// override onDoubleClickEdge = (shape: TLTextShape) => {
	// 	// If the shape has a fixed width, set it to autoSize.
	// 	if (!shape.props.autoSize) {
	// 		return {
	// 			id: shape.id,
	// 			type: shape.type,
	// 			props: {
	// 				autoSize: true,
	// 			},
	// 		}
	// 	}
	// 	// If the shape is scaled, reset the scale to 1.
	// 	if (shape.props.scale !== 1) {
	// 		return {
	// 			id: shape.id,
	// 			type: shape.type,
	// 			props: {
	// 				scale: 1,
	// 			},
	// 		}
	// 	}
	// }
}

function getTextSize(editor: Editor, props: TLTextShape['props']) {
	const { font, richText, size, w } = props

	const minWidth = 16
	const fontSize = FONT_SIZES[size]

	const maybeFixedWidth = props.autoSize ? null : Math.max(minWidth, Math.floor(w))

	const html = renderHtmlFromRichTextForMeasurement(editor, richText)
	const result = editor.textMeasure.measureHtml(html, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[font],
		fontSize: fontSize,
		maxWidth: maybeFixedWidth,
	})

	// If we're autosizing the measureText will essentially `Math.floor`
	// the numbers so `19` rather than `19.3`, this means we must +1 to
	// whatever we get to avoid wrapping.
	return {
		width: maybeFixedWidth ?? Math.max(minWidth, result.w + 1),
		height: Math.max(fontSize, result.h),
	}
}

function useTextShapeKeydownHandler(id: TLShapeId) {
	const editor = useEditor()

	return useCallback(
		(e: KeyboardEvent) => {
			if (editor.getEditingShapeId() !== id) return

			switch (e.key) {
				case 'Enter': {
					if (e.ctrlKey || e.metaKey) {
						editor.complete()
					}
					break
				}
			}
		},
		[editor, id]
	)
}
