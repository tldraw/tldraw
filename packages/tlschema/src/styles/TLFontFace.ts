/**
 * Represents the `src` property of a {@link TLFontFace}.
 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/src | `src`} for details of the properties here.
 * @public
 */
export interface TLFontFaceSource {
	/**
	 * A URL from which to load the font. If the value here is a key in
	 * {@link tldraw#TLEditorAssetUrls.fonts}, the value from there will be used instead.
	 */
	url: string
	format?: string
	tech?: string
}

/**
 * A font face that can be used in the editor. The properties of this are largely the same as the
 * ones in the
 * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face | css `@font-face` rule}.
 * @public
 */
export interface TLFontFace {
	/**
	 * How this font can be referred to in CSS.
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-family | `font-family`}.
	 */
	readonly family: string
	/**
	 * The source of the font. This
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/src | `src`}.
	 */
	readonly src: TLFontFaceSource
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/ascent-override | `ascent-override`}.
	 */
	readonly ascentOverride?: string
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/descent-override | `descent-override`}.
	 */
	readonly descentOverride?: string
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-stretch | `font-stretch`}.
	 */
	readonly stretch?: string
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-style | `font-style`}.
	 */
	readonly style?: string
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-weight | `font-weight`}.
	 */
	readonly weight?: string
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-feature-settings | `font-feature-settings`}.
	 */
	readonly featureSettings?: string
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/line-gap-override | `line-gap-override`}.
	 */
	readonly lineGapOverride?: string
	/**
	 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range | `unicode-range`}.
	 */
	readonly unicodeRange?: string
}
