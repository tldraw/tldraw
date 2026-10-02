import { FontMetrics } from '../measure/types'

/**
 * The handful of layout rules browsers disagree on. Every value here was measured against the
 * named engine with the golden harness in `golden/`; pick a preset with `LayoutOptions.engine`
 * and override individual fields with `LayoutOptions.profile`.
 *
 * @public
 */
export interface LayoutProfile {
	/**
	 * Whether preserved trailing spaces (`white-space: pre-wrap`) count toward the max-content
	 * width of a block. Chromium includes them when sizing a `width: max-content` box, even
	 * when they hang past the end edge at a soft wrap.
	 */
	trailingSpacesInMaxContent: boolean
	/** Baseline shift for `vertical-align: sub`, as a fraction of the parent font size. */
	subscriptShift: number
	/** Baseline shift for `vertical-align: super`, as a fraction of the parent font size. */
	superscriptShift: number
	/**
	 * Pixel height of a `line-height: normal` line box for a font. Canvas metrics expose no line
	 * gap, so engines that add it can only be approximated here.
	 */
	normalLineHeight(metrics: FontMetrics, fontSize: number): number
	/**
	 * Line box heights are snapped to whole pixels before stacking. WebKit rounds line boxes;
	 * Chromium keeps the fraction (see https://github.com/tldraw/tldraw/issues/8970).
	 */
	roundLineBoxes: boolean
	/**
	 * Whether an inline box's half-leading is floored to a whole pixel before it is added above
	 * the ascent, with the remainder going below the descent (Blink's `CalculateLeadingSpace`).
	 * A single-font line is still exactly `line-height` tall either way, but the baseline sits
	 * up to half a pixel higher, and a line mixing fonts whose ascent + descent differ in parity
	 * is up to a pixel shorter than the unfloored union of its boxes.
	 */
	floorHalfLeading: boolean
	/**
	 * Whether a line's width is the width of the whole shaped line (Chromium) or the sum of its
	 * separately shaped words (WebKit). They differ for fonts with kerning or contextual
	 * alternates at word boundaries, e.g. across the hyphens of `state-of-the-art`.
	 */
	shapeAcrossWordBoundaries: boolean
	/**
	 * Whether a slash followed by a letter or digit is a break opportunity. WebKit breaks there
	 * (`fun/chaos`, URL paths) and shapes each side separately, so the text is wider than one
	 * shaped run; Chromium does neither.
	 */
	breakAfterSlash: boolean
}

/** @public */
export type LayoutEngine = 'chromium' | 'webkit'

/**
 * Chromium's behaviour, the default.
 *
 * @public
 */
export const chromiumLayoutProfile: LayoutProfile = {
	trailingSpacesInMaxContent: true,
	// Blink lowers subscripts by a fifth and raises superscripts by a third of the parent font
	// size rather than reading the font's subscript metrics.
	subscriptShift: 1 / 5,
	superscriptShift: 1 / 3,
	normalLineHeight: (metrics) => metrics.ascent + metrics.descent,
	roundLineBoxes: false,
	floorHalfLeading: true,
	shapeAcrossWordBoundaries: true,
	breakAfterSlash: false,
}

/**
 * WebKit's behaviour where it differs from Chromium. Trailing-space and word-shaping rules were
 * measured with `pnpm golden --webkit`; line box rounding comes from tldraw issue 8970. Slash
 * breaks were measured with the in-browser harness (`pnpm golden:boards --webkit`); WebKit's
 * other extra URL break points are not modelled.
 *
 * @public
 */
export const webkitLayoutProfile: LayoutProfile = {
	...chromiumLayoutProfile,
	roundLineBoxes: true,
	// Not measured against WebKit; its line boxes are rounded as a whole instead.
	floorHalfLeading: false,
	shapeAcrossWordBoundaries: false,
	breakAfterSlash: true,
}

const PRESETS: Record<LayoutEngine, LayoutProfile> = {
	chromium: chromiumLayoutProfile,
	webkit: webkitLayoutProfile,
}

/** @internal */
export function resolveProfile(
	engine: LayoutEngine | undefined,
	overrides: Partial<LayoutProfile> | undefined
): LayoutProfile {
	const base = PRESETS[engine ?? 'chromium']
	return overrides ? { ...base, ...overrides } : base
}
