/* eslint-disable react-hooks/rules-of-hooks */
import {
	Box,
	Editor,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLResizeInfo,
	TLShapeId,
	TLTextShape,
	Vec,
	WeakCache,
	getDefaultColorTheme,
	preventDefault,
	textShapeMigrations,
	textShapeProps,
	toDomPrecision,
	useEditor,
} from '@tldraw/editor'
import { useCallback } from 'react'
import { SvgTextLabel } from '../shared/SvgTextLabel'
import { TextHelpers } from '../shared/TextHelpers'
import { TextLabel } from '../shared/TextLabel'
import { FONT_FAMILIES, FONT_SIZES, TEXT_PROPS } from '../shared/default-shape-constants'
import { getFontDefForExport } from '../shared/defaultStyleDefs'
import { resizeScaled } from '../shared/resizeScaled'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'

const sizeCache = new WeakCache<TLTextShape['props'], { height: number; width: number }>()

/** @public */
export class TextShapeUtil extends ShapeUtil<TLTextShape> {
	static override type = 'text' as const
	static override props = textShapeProps
	static override migrations = textShapeMigrations

	getDefaultProps(): TLTextShape['props'] {
		return {
			color: 'black',
			size: 'm',
			w: 8,
			text: '',
			font: 'draw',
			textAlign: 'start',
			autoSize: true,
			scale: 1,
		}
	}

	getMinDimensions(shape: TLTextShape) {
		return sizeCache.get(shape.props, (props) => getTextSize(this.editor, props))
	}

	getGeometry(shape: TLTextShape) {
		const { scale } = shape.props
		const { width, height } = this.getMinDimensions(shape)!
		return new Rectangle2d({
			width: width * scale,
			height: height * scale,
			isFilled: true,
			isLabel: true,
		})
	}

	override getText(shape: TLTextShape) {
		return shape.props.text
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
			props: { font, size, text, color, scale, textAlign },
		} = shape

		const { width, height } = this.getMinDimensions(shape)
		const isSelected = shape.id === this.editor.getOnlySelectedShapeId()
		const theme = useDefaultColorTheme()
		const handleKeyDown = useTextShapeKeydownHandler(id)

		return (
			<TextLabel
				id={id}
				classNamePrefix="tl-text-shape"
				type="text"
				font={font}
				fontSize={FONT_SIZES[size]}
				lineHeight={TEXT_PROPS.lineHeight}
				align={textAlign}
				verticalAlign="middle"
				text={text}
				labelColor={theme[color].solid}
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
		if (shape.props.text) ctx.addExportDef(getFontDefForExport(shape.props.font))

		const bounds = this.editor.getShapeGeometry(shape).bounds
		const width = bounds.width / (shape.props.scale ?? 1)
		const height = bounds.height / (shape.props.scale ?? 1)

		const theme = getDefaultColorTheme(ctx)

		return (
			<SvgTextLabel
				fontSize={FONT_SIZES[shape.props.size]}
				font={shape.props.font}
				align={shape.props.textAlign}
				verticalAlign="middle"
				text={shape.props.text}
				labelColor={theme[shape.props.color].solid}
				bounds={new Box(0, 0, width, height)}
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
		const {
			id,
			type,
			props: { text },
		} = shape

		const trimmedText = shape.props.text.trimEnd()

		if (trimmedText.length === 0) {
			this.editor.deleteShapes([shape.id])
		} else {
			if (trimmedText !== shape.props.text) {
				this.editor.updateShapes([
					{
						id,
						type,
						props: {
							text: text.trimEnd(),
						},
					},
				])
			}
		}
	}

	override onBeforeUpdate(prev: TLTextShape, next: TLTextShape) {
		if (!next.props.autoSize) return

		const styleDidChange =
			prev.props.size !== next.props.size ||
			prev.props.textAlign !== next.props.textAlign ||
			prev.props.font !== next.props.font ||
			(prev.props.scale !== 1 && next.props.scale === 1)

		const textDidChange = prev.props.text !== next.props.text

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
	const { font, text, autoSize, size, w } = props

	const minWidth = autoSize ? 16 : Math.max(16, w)
	const fontSize = FONT_SIZES[size]

	const cw = autoSize
		? null
		: // `measureText` floors the number so we need to do the same here to avoid issues.
			Math.floor(Math.max(minWidth, w))

	const result = editor.textMeasure.measureText(text, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[font],
		fontSize: fontSize,
		maxWidth: cw,
	})

	// If we're autosizing the measureText will essentially `Math.floor`
	// the numbers so `19` rather than `19.3`, this means we must +1 to
	// whatever we get to avoid wrapping.
	if (autoSize) {
		result.w += 1
	}

	return {
		width: Math.max(minWidth, result.w),
		height: Math.max(fontSize, result.h),
	}
}

function useTextShapeKeydownHandler(id: TLShapeId) {
	const editor = useEditor()

	return useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (editor.getEditingShapeId() !== id) return

			switch (e.key) {
				case 'Enter': {
					if (e.ctrlKey || e.metaKey) {
						editor.complete()
					}
					break
				}
				case 'Tab': {
					preventDefault(e)
					if (e.shiftKey) {
						TextHelpers.unindent(e.currentTarget)
					} else {
						TextHelpers.indent(e.currentTarget)
					}
					break
				}
			}
		},
		[editor, id]
	)
}
