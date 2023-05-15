/* eslint-disable react-hooks/rules-of-hooks */
import { Box2d, toDomPrecision, Vec2d } from '@tldraw/primitives'
import { textShapeMigrations, textShapeTypeValidator, TLTextShape } from '@tldraw/tlschema'
import { HTMLContainer } from '../../../components/HTMLContainer'
import { defineShape } from '../../../config/TLShapeDefinition'
import { FONT_FAMILIES, FONT_SIZES, TEXT_PROPS } from '../../../constants'
import { stopEventPropagation } from '../../../utils/dom'
import { WeakMapCache } from '../../../utils/WeakMapCache'
import { App } from '../../App'
import { getTextSvgElement } from '../shared/getTextSvgElement'
import { resizeScaled } from '../shared/resizeScaled'
import { TLExportColors } from '../shared/TLExportColors'
import { useEditableText } from '../shared/useEditableText'
import { OnEditEndHandler, OnResizeHandler, TLShapeUtil, TLShapeUtilFlag } from '../TLShapeUtil'

const sizeCache = new WeakMapCache<TLTextShape['props'], { height: number; width: number }>()

/** @public */
export class TLTextUtil extends TLShapeUtil<TLTextShape> {
	static type = 'text'

	canEdit = () => true

	isAspectRatioLocked: TLShapeUtilFlag<TLTextShape> = () => true

	defaultProps(): TLTextShape['props'] {
		return {
			opacity: '1',
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

	// @computed
	// private get minDimensionsCache() {
	// 	return this.app.store.createSelectedComputedCache<
	// 		TLTextShape['props'],
	// 		{ width: number; height: number },
	// 		TLTextShape
	// 	>(
	// 		'text measure cache',
	// 		(shape) => {
	// 			return shape.props
	// 		},
	// 		(props) => getTextSize(this.app, props)
	// 	)
	// }

	getMinDimensions(shape: TLTextShape) {
		return sizeCache.get(shape.props, (props) => getTextSize(this.app, props))
	}

	getBounds(shape: TLTextShape) {
		const { scale } = shape.props
		const { width, height } = this.getMinDimensions(shape)!
		return new Box2d(0, 0, width * scale, height * scale)
	}

	getOutline(shape: TLTextShape) {
		const bounds = this.bounds(shape)

		return [
			new Vec2d(0, 0),
			new Vec2d(bounds.width, 0),
			new Vec2d(bounds.width, bounds.height),
			new Vec2d(0, bounds.height),
		]
	}

	getCenter(shape: TLTextShape): Vec2d {
		const bounds = this.bounds(shape)
		return new Vec2d(bounds.width / 2, bounds.height / 2)
	}

	render(shape: TLTextShape) {
		const {
			id,
			type,
			props: { text },
		} = shape

		const { width, height } = this.getMinDimensions(shape)

		const {
			rInput,
			isEmpty,
			isEditing,
			isEditableFromHover,
			handleFocus,
			handleChange,
			handleKeyDown,
			handleBlur,
		} = useEditableText(id, type, text)

		return (
			<HTMLContainer id={shape.id}>
				<div
					className="tl-text-shape__wrapper tl-text-shadow"
					data-font={shape.props.font}
					data-align={shape.props.align}
					data-hastext={!isEmpty}
					data-isediting={isEditing || isEditableFromHover}
					data-textwrap={true}
					style={{
						fontSize: FONT_SIZES[shape.props.size],
						lineHeight: FONT_SIZES[shape.props.size] * TEXT_PROPS.lineHeight + 'px',
						transform: `scale(${shape.props.scale})`,
						transformOrigin: 'top left',
						width: Math.max(1, width),
						height: Math.max(FONT_SIZES[shape.props.size] * TEXT_PROPS.lineHeight, height),
					}}
				>
					<div className="tl-text tl-text-content" dir="ltr">
						{text}
					</div>
					{isEditing || isEditableFromHover ? (
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
						/>
					) : null}
				</div>
			</HTMLContainer>
		)
	}

	indicator(shape: TLTextShape) {
		const bounds = this.bounds(shape)
		return <rect width={toDomPrecision(bounds.width)} height={toDomPrecision(bounds.height)} />
	}

	toSvg(shape: TLTextShape, font: string | undefined, colors: TLExportColors) {
		const bounds = this.bounds(shape)
		const text = shape.props.text

		const width = bounds.width / (shape.props.scale ?? 1)
		const height = bounds.height / (shape.props.scale ?? 1)

		const opts = {
			fontSize: FONT_SIZES[shape.props.size],
			fontFamily: font!,
			textAlign: shape.props.align,
			width,
			height,
			padding: 0, // no padding?
			lineHeight: TEXT_PROPS.lineHeight,
			fontStyle: 'normal',
			fontWeight: 'normal',
		}

		const lines = this.app.textMeasure.getTextLines({
			text: text,
			wrap: true,
			...opts,
		})

		const color = colors.fill[shape.props.color]
		const groupEl = document.createElementNS('http://www.w3.org/2000/svg', 'g')

		const textBgEl = getTextSvgElement(this.app, {
			lines,
			...opts,
			stroke: colors.background,
			strokeWidth: 2,
			fill: colors.background,
			padding: 0,
		})

		const textElm = textBgEl.cloneNode(true) as SVGTextElement
		textElm.setAttribute('fill', color)
		textElm.setAttribute('stroke', 'none')

		groupEl.append(textBgEl)
		groupEl.append(textElm)

		return groupEl
	}

	onResize: OnResizeHandler<TLTextShape> = (shape, info) => {
		const { initialBounds, initialShape, scaleX, handle } = info

		if (info.mode === 'scale_shape' || (handle !== 'right' && handle !== 'left')) {
			return resizeScaled(shape, info)
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
				x,
				y,
				props: {
					w: nextWidth / initialShape.props.scale,
					autoSize: false,
				},
			}
		}
	}

	onBeforeCreate = (shape: TLTextShape) => {
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

	onEditEnd: OnEditEndHandler<TLTextShape> = (shape) => {
		const {
			id,
			type,
			props: { text },
		} = shape

		const trimmedText = shape.props.text.trimEnd()

		if (trimmedText.length === 0) {
			this.app.deleteShapes([shape.id])
		} else {
			if (trimmedText !== shape.props.text) {
				this.app.updateShapes([
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

	onBeforeUpdate = (prev: TLTextShape, next: TLTextShape) => {
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
		const boundsB = getTextSize(this.app, next.props)

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

	onDoubleClickEdge = (shape: TLTextShape) => {
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

/** @public */
export const TLTextShapeDef = defineShape<TLTextShape, TLTextUtil>({
	type: 'text',
	getShapeUtil: () => TLTextUtil,
	validator: textShapeTypeValidator,
	migrations: textShapeMigrations,
})

function getTextSize(app: App, props: TLTextShape['props']) {
	const { font, text, autoSize, size, w } = props

	const minWidth = 16
	const fontSize = FONT_SIZES[size]

	const cw = autoSize
		? 'fit-content'
		: // `measureText` floors the number so we need to do the same here to avoid issues.
		  Math.floor(Math.max(minWidth, w)) + 'px'

	const result = app.textMeasure.measureText({
		...TEXT_PROPS,
		text,
		fontFamily: FONT_FAMILIES[font],
		fontSize: fontSize,
		width: cw,
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
