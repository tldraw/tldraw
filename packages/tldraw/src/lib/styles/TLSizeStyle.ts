import { DefaultSizeStyle, StyleUtil, TLDefaultSizeStyle } from '@tldraw/editor'
import {
	ARROW_LABEL_FONT_SIZES,
	FONT_SIZES,
	LABEL_FONT_SIZES,
	STROKE_SIZES,
} from '../shapes/shared/default-shape-constants'

export abstract class SizeStyleUtil<T> extends StyleUtil<T, 'tldraw:size2'> {
	static id = 'tldraw:size2'

	abstract toStrokeSizePx(value: T): number
	abstract toFontSizePx(value: T): number
	abstract toLabelFontSizePx(value: T): number
	abstract toArrowLabelFontSizePx(value: T): number
}

export interface DefaultSizeStyleOptions {
	defaultSize: TLDefaultSizeStyle
	strokeSizes: Record<TLDefaultSizeStyle, number>
	fontSizes: Record<TLDefaultSizeStyle, number>
	labelFontSizes: Record<TLDefaultSizeStyle, number>
	arrowLabelFontSizes: Record<TLDefaultSizeStyle, number>
}

export class DefaultSizeStyleUtil extends SizeStyleUtil<TLDefaultSizeStyle> {
	static validator = DefaultSizeStyle

	override options: DefaultSizeStyleOptions = {
		defaultSize: 'm',
		strokeSizes: STROKE_SIZES,
		fontSizes: FONT_SIZES,
		labelFontSizes: LABEL_FONT_SIZES,
		arrowLabelFontSizes: ARROW_LABEL_FONT_SIZES,
	}

	override getDefaultValue(): TLDefaultSizeStyle {
		return this.options.defaultSize
	}

	override toStrokeSizePx(value: TLDefaultSizeStyle): number {
		return this.options.strokeSizes[value]
	}

	override toFontSizePx(value: TLDefaultSizeStyle): number {
		return this.options.fontSizes[value]
	}

	override toLabelFontSizePx(value: TLDefaultSizeStyle): number {
		return this.options.labelFontSizes[value]
	}

	override toArrowLabelFontSizePx(value: TLDefaultSizeStyle): number {
		return this.options.arrowLabelFontSizes[value]
	}
}
