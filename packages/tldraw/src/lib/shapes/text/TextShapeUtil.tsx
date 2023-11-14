/* eslint-disable react-hooks/rules-of-hooks */
import {
	DefaultFontFamilies,
	Editor,
	HTMLContainer,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLOnEditEndHandler,
	TLOnResizeHandler,
	TLShapeUtilFlag,
	TLTextShape,
	Vec2d,
	WeakMapCache,
	getDefaultColorTheme,
	stopEventPropagation,
	textShapeMigrations,
	textShapeProps,
	toDomPrecision,
	useEditor,
} from '@tldraw/editor'
import { createTextSvgElementFromSpans } from '../shared/createTextSvgElementFromSpans'
import { FONT_FAMILIES, FONT_SIZES, TEXT_PROPS } from '../shared/default-shape-constants'
import { getFontDefForExport } from '../shared/defaultStyleDefs'
import { resizeScaled } from '../shared/resizeScaled'
import { useEditableText } from '../shared/useEditableText'

const sizeCache = new WeakMapCache<TLTextShape['props'], { height: number; width: number }>()

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
			align: 'middle',
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
		})
	}

	override canEdit = () => true

	override isAspectRatioLocked: TLShapeUtilFlag<TLTextShape> = () => true

	component(shape: TLTextShape) {
		const {
			id,
			type,
			props: { text, color },
		} = shape

		const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.getIsDarkMode() })
		const { width, height } = this.getMinDimensions(shape)

		const {
			rInput,
			isEmpty,
			isEditing,
			handleFocus,
			handleChange,
			handleKeyDown,
			handleBlur,
			handleInputPointerDown,
			handleDoubleClick,
		} = useEditableText(id, type, text)

		return (
			<HTMLContainer id={shape.id}>
				<div
					className="tl-text-shape__wrapper tl-text-shadow"
					data-font={shape.props.font}
					data-align={shape.props.align}
					data-hastext={!isEmpty}
					data-isediting={isEditing}
					data-textwrap={true}
					style={{
						fontSize: FONT_SIZES[shape.props.size],
						lineHeight: FONT_SIZES[shape.props.size] * TEXT_PROPS.lineHeight + 'px',
						transform: `scale(${shape.props.scale})`,
						transformOrigin: 'top left',
						width: Math.max(1, width),
						height: Math.max(FONT_SIZES[shape.props.size] * TEXT_PROPS.lineHeight, height),
						color: theme[color].solid,
					}}
				>
					<div className="tl-text tl-text-content" dir="ltr">
						{text}
					</div>
					{isEditing ? (
						<textarea
							ref={rInput}
							className="tl-text tl-text-input"
							name="text"
							tabIndex={-1}
							autoComplete="false"
							autoCapitalize="false"
							autoCorrect="false"
							autoSave="false"
							autoFocus={isEditing}
							placeholder=""
							spellCheck="true"
							wrap="off"
							dir="ltr"
							datatype="wysiwyg"
							defaultValue={text}
							onFocus={handleFocus}
							onChange={handleChange}
							onKeyDown={handleKeyDown}
							onBlur={handleBlur}
							onTouchEnd={stopEventPropagation}
							onContextMenu={stopEventPropagation}
							onPointerDown={handleInputPointerDown}
							onDoubleClick={handleDoubleClick}
						/>
					) : null}
				</div>
			</HTMLContainer>
		)
	}

	indicator(shape: TLTextShape) {
		const bounds = this.editor.getShapeGeometry(shape).bounds
		const editor = useEditor()
		if (shape.props.autoSize && editor.getEditingShapeId() === shape.id) return null
		return <rect width={toDomPrecision(bounds.width)} height={toDomPrecision(bounds.height)} />
	}

	override toSvg(shape: TLTextShape, ctx: SvgExportContext) {
		ctx.addExportDef(getFontDefForExport(shape.props.font))

		const theme = getDefaultColorTheme({ isDarkMode: this.editor.user.getIsDarkMode() })
		const bounds = this.editor.getShapeGeometry(shape).bounds
		const text = shape.props.text

		const width = bounds.width / (shape.props.scale ?? 1)
		const height = bounds.height / (shape.props.scale ?? 1)

		const opts = {
			fontSize: FONT_SIZES[shape.props.size],
			fontFamily: DefaultFontFamilies[shape.props.font],
			textAlign: shape.props.align,
			verticalTextAlign: 'middle' as const,
			width,
			height,
			padding: 0, // no padding?
			lineHeight: TEXT_PROPS.lineHeight,
			fontStyle: 'normal',
			fontWeight: 'normal',
			overflow: 'wrap' as const,
		}

		const color = theme[shape.props.color].solid
		const groupEl = document.createElementNS('http://www.w3.org/2000/svg', 'g')

		const textBgEl = createTextSvgElementFromSpans(
			this.editor,
			this.editor.textMeasure.measureTextSpans(text, opts),
			{
				...opts,
				stroke: theme.background,
				strokeWidth: 2,
				fill: theme.background,
				padding: 0,
			}
		)

		const textElm = textBgEl.cloneNode(true) as SVGTextElement
		textElm.setAttribute('fill', color)
		textElm.setAttribute('stroke', 'none')

		groupEl.append(textBgEl)
		groupEl.append(textElm)

		return groupEl
	}

	override onResize: TLOnResizeHandler<TLTextShape> = (shape, info) => {
		const { initialBounds, initialShape, scaleX, handle } = info

		if (info.mode === 'scale_shape' || (handle !== 'right' && handle !== 'left')) {
			return {
				id: shape.id,
				type: shape.type,
				...resizeScaled(shape, info),
			}
		} else {
			const prevWidth = initialBounds.width
			let nextWidth = prevWidth * scaleX

			const offset = new Vec2d(0, 0)

			nextWidth = Math.max(1, Math.abs(nextWidth))

			if (handle === 'left') {
				offset.x = prevWidth - nextWidth
				if (scaleX < 0) {
					offset.x += nextWidth
				}
			} else {
				if (scaleX < 0) {
					offset.x -= nextWidth
				}
			}

			const { x, y } = offset.rot(shape.rotation).add(initialShape)

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

	override onBeforeCreate = (shape: TLTextShape) => {
		// When a shape is created, center the text at the created point.

		// Only center if the shape is set to autosize.
		if (!shape.props.autoSize) return

		// Only center if the shape is empty when created.
		if (shape.props.text.trim()) return

		const bounds = this.getMinDimensions(shape)

		return {
			...shape,
			x: shape.x - bounds.width / 2,
			y: shape.y - bounds.height / 2,
		}
	}

	override onEditEnd: TLOnEditEndHandler<TLTextShape> = (shape) => {
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

	override onBeforeUpdate = (prev: TLTextShape, next: TLTextShape) => {
		if (!next.props.autoSize) return

		const styleDidChange =
			prev.props.size !== next.props.size ||
			prev.props.align !== next.props.align ||
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

		let delta: Vec2d | undefined

		switch (next.props.align) {
			case 'middle': {
				delta = new Vec2d((wB - wA) / 2, textDidChange ? 0 : (hB - hA) / 2)
				break
			}
			case 'end': {
				delta = new Vec2d(wB - wA, textDidChange ? 0 : (hB - hA) / 2)
				break
			}
			default: {
				if (textDidChange) break
				delta = new Vec2d(0, (hB - hA) / 2)
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

	override onDoubleClickEdge = (shape: TLTextShape) => {
		// If the shape has a fixed width, set it to autoSize.
		if (!shape.props.autoSize) {
			return {
				id: shape.id,
				type: shape.type,
				props: {
					autoSize: true,
				},
			}
		}

		// If the shape is scaled, reset the scale to 1.
		if (shape.props.scale !== 1) {
			return {
				id: shape.id,
				type: shape.type,
				props: {
					scale: 1,
				},
			}
		}
	}
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

	// // If we're autosizing the measureText will essentially `Math.floor`
	// // the numbers so `19` rather than `19.3`, this means we must +1 to
	// // whatever we get to avoid wrapping.
	if (autoSize) {
		result.w += 1
	}

	return {
		width: Math.max(minWidth, result.w),
		height: Math.max(fontSize, result.h),
	}
}
