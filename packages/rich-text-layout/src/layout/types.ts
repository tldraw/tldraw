import { NodeRegistry } from '../document/types'
import { MeasureContext } from '../measure/types'
import {
	ResolvedBlockStyle,
	ResolvedInlineStyle,
	StyleDeclaration,
	StyleSheet,
} from '../style/types'
import { LayoutEngine, LayoutProfile } from './profile'

/**
 * Where a fragment's text came from: the index path of the ProseMirror text node and the
 * character offsets within it. Markers and synthesised content point at the block with
 * `from === to`.
 *
 * @public
 */
export interface FragmentSource {
	path: number[]
	from: number
	to: number
}

/** @public */
export type FragmentKind = 'text' | 'marker' | 'tab' | 'space'

/**
 * A run of text on one line sharing a single style. `x` is relative to the layout's left edge,
 * like `LineBox.x`.
 *
 * @public
 */
export interface Fragment {
	x: number
	width: number
	text: string
	style: ResolvedInlineStyle
	kind: FragmentKind
	source: FragmentSource
	/** Baseline offset relative to the line's baseline (positive moves down); sub/superscripts. */
	baselineShift: number
	/** Font ascent and descent of the fragment's font, in pixels: the inline box renderers paint. */
	ascent: number
	descent: number
	/**
	 * Set on `marker` fragments of disc/circle/square lists: browsers draw these as shapes rather
	 * than glyphs. The rect is relative to the line box, like `x`; `text` keeps a glyph fallback.
	 */
	symbol?: MarkerSymbol
}

/** @public */
export interface MarkerSymbol {
	shape: 'disc' | 'circle' | 'square'
	x: number
	y: number
	size: number
}

/** @public */
export interface LineBox {
	blockIndex: number
	x: number
	y: number
	/** Advance width of the line's content, excluding trailing hanging whitespace. */
	width: number
	height: number
	/** Baseline offset from the top of the line box. */
	baseline: number
	direction: 'ltr' | 'rtl'
	fragments: Fragment[]
}

/** @public */
export interface BlockBox {
	type: string
	path: number[]
	x: number
	y: number
	width: number
	height: number
	style: ResolvedBlockStyle
	/** Index range into `TextLayout.lines` for leaf blocks; empty for containers. */
	lineStart: number
	lineEnd: number
	/** Index of the parent block in `TextLayout.blocks`, or -1 for the root. */
	parent: number
}

/** @public */
export interface TextLayout {
	width: number
	height: number
	blocks: BlockBox[]
	lines: LineBox[]
	/** The widest line the content would need if nothing wrapped. */
	maxContentWidth: number
}

/** @public */
export interface LayoutOptions {
	/**
	 * Width the content wraps at. `null` or `undefined` lays the text out at its max-content
	 * width (no wrapping except forced breaks). Like a `width: max-content; max-width: N` box,
	 * the resulting layout width is the smaller of the max-content width and this value.
	 */
	maxWidth?: number | null
	/** A lower bound for the layout width. */
	minWidth?: number
	/** Padding applied on all sides, inside `maxWidth`. */
	padding?: number
	/** Node classification; defaults to the TipTap StarterKit registry. */
	registry?: NodeRegistry
	/** Browser-default approximation applied first. Pass `null` to start from nothing. */
	userAgentStyles?: StyleSheet | null
	/** The consumer's rules, applied after the user agent sheet. */
	styles?: StyleSheet
	/** Style of the root container: the font, line height and text properties blocks inherit. */
	rootStyle?: StyleDeclaration
	/** Defaults to the installed context. */
	measureContext?: MeasureContext
	/** Which browser's layout rules to follow where they differ. Defaults to `'chromium'`. */
	engine?: LayoutEngine
	/** Overrides for individual rules of the chosen engine's profile. */
	profile?: Partial<LayoutProfile>
}
