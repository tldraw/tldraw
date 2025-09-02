import { DefaultSizeStyle, StyleUtil, TLDefaultSizeStyle } from '@tldraw/editor'

/** @public */
export abstract class SizeStyleUtil<T> extends StyleUtil<T, 'tldraw:size2'> {
	static id = 'tldraw:size2'

	abstract toStrokeSizePx(value: T): number
	abstract toFontSizePx(value: T): number
	abstract toLabelFontSizePx(value: T): number
}

/** @public */
export interface DefaultSizeStyleOptions {
	defaultSize: TLDefaultSizeStyle
	strokeSizes: Record<TLDefaultSizeStyle, number>
	fontSizes: Record<TLDefaultSizeStyle, number>
	labelFontSizes: Record<TLDefaultSizeStyle, number>
}

/** @public */
export class DefaultSizeStyleUtil extends SizeStyleUtil<TLDefaultSizeStyle> {
	static validator = DefaultSizeStyle

	override options: DefaultSizeStyleOptions = {
		defaultSize: 'm',
		strokeSizes: {
			s: 2,
			m: 3.5,
			l: 5,
			xl: 10,
		},
		fontSizes: {
			s: 18,
			m: 24,
			l: 36,
			xl: 44,
		},
		labelFontSizes: {
			s: 18,
			m: 22,
			l: 26,
			xl: 32,
		},
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
}
