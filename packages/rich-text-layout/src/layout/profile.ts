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
	 * width of a block. They hang past the line's end edge in every engine; Chromium still sizes
	 * a `width: max-content` box to include them.
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
	 * Whether a line's width is the width of the whole shaped line (Chromium) or the sum of its
	 * separately shaped words (WebKit). They differ for fonts with kerning or contextual
	 * alternates at word boundaries, e.g. across the hyphens of `state-of-the-art`.
	 */
	shapeAcrossWordBoundaries: boolean
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
	shapeAcrossWordBoundaries: true,
}

/**
 * WebKit's behaviour where it differs from Chromium. Trailing-space and word-shaping rules were
 * measured with `yarn golden --webkit`; line box rounding comes from tldraw issue 8970. WebKit
 * also breaks URLs at more points than Chromium, which pretext's node profile does not model.
 *
 * @public
 */
export const webkitLayoutProfile: LayoutProfile = {
	...chromiumLayoutProfile,
	roundLineBoxes: true,
	shapeAcrossWordBoundaries: false,
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
