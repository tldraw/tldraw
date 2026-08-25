import { PMMark, PMNode } from '../document/types'
import { FontSpec } from '../measure/types'

/**
 * A CSS-like length. Numbers are pixels. `em` is relative to the font size of the element being
 * styled (for blocks: the parent block; for inline runs: the inherited run font size), `ch` to
 * the advance of `0` in the block's font, `lh` to the block's line height.
 *
 * @public
 */
export type Length = number | `${number}px` | `${number}em` | `${number}ch` | `${number}lh`

/** @public */
export type FontSizeValue = Length | 'smaller' | 'larger'

/** @public */
export type LineHeightValue = number | `${number}px` | 'normal'

/** @public */
export type FontWeightValue = 'normal' | 'bold' | 'bolder' | 'lighter' | number | `${number}`

/** @public */
export type FontStyleValue = 'normal' | 'italic' | 'oblique'

/** @public */
export type TextAlignValue = 'start' | 'end' | 'left' | 'right' | 'center'

/** @public */
export type WhiteSpaceValue = 'normal' | 'pre-wrap' | 'pre'

/** @public */
export type OverflowWrapValue = 'normal' | 'break-word' | 'anywhere'

/** @public */
export type WordBreakValue = 'normal' | 'keep-all' | 'break-all'

/** @public */
export type DirectionValue = 'auto' | 'ltr' | 'rtl'

/** @public */
export type ListStyleTypeValue =
	| 'none'
	| 'disc'
	| 'circle'
	| 'square'
	| 'decimal'
	| 'lower-alpha'
	| 'upper-alpha'
	| 'lower-roman'
	| 'upper-roman'

/** @public */
export type TextDecorationValue = 'none' | 'underline' | 'line-through' | 'underline line-through'

/** @public */
export type VerticalAlignValue = 'baseline' | 'sub' | 'super'

/**
 * The style properties a rule can set. Block-only properties are ignored when a rule matches an
 * inline run and vice versa.
 *
 * @public
 */
export interface StyleDeclaration {
	fontFamily?: string
	fontSize?: FontSizeValue
	fontWeight?: FontWeightValue
	fontStyle?: FontStyleValue
	lineHeight?: LineHeightValue
	color?: string
	letterSpacing?: Length
	// block-only
	textAlign?: TextAlignValue
	marginTop?: Length
	marginBottom?: Length
	paddingLeft?: Length
	minHeight?: Length
	whiteSpace?: WhiteSpaceValue
	overflowWrap?: OverflowWrapValue
	wordBreak?: WordBreakValue
	tabSize?: number
	direction?: DirectionValue
	listStyleType?: ListStyleTypeValue
	// inline-only
	textDecoration?: TextDecorationValue
	background?: string | 'none'
	verticalAlign?: VerticalAlignValue
}

/**
 * What a style rule gets to look at when deciding whether it matches.
 *
 * @public
 */
export interface StyleMatchContext {
	/** The node being styled: a block node, or a text/inline node for inline runs. */
	node: PMNode
	/** `node.type`, for convenience. */
	type: string
	/** Marks on the node (empty for blocks). */
	marks: readonly PMMark[]
	/** Nodes from the document root down to the parent of `node`. */
	ancestors: readonly PMNode[]
	/** Index of `node` in its parent's content. */
	index: number
	/** Number of list nodes among the ancestors. */
	listDepth: number
}

/** @public */
export interface StyleRule {
	match(ctx: StyleMatchContext): boolean
	style: StyleDeclaration | ((ctx: StyleMatchContext) => StyleDeclaration)
}

/**
 * An ordered list of rules. Later rules win, like a CSS sheet where every selector has the same
 * specificity.
 *
 * @public
 */
export type StyleSheet = readonly StyleRule[]

/** @public */
export interface ResolvedBlockStyle {
	fontFamily: string
	fontSize: number
	fontWeight: string
	fontStyle: FontStyleValue
	/** Line height in pixels. */
	lineHeight: number
	color: string
	letterSpacing: number
	textAlign: TextAlignValue
	marginTop: number
	marginBottom: number
	paddingLeft: number
	minHeight: number
	whiteSpace: WhiteSpaceValue
	overflowWrap: OverflowWrapValue
	wordBreak: WordBreakValue
	tabSize: number
	direction: DirectionValue
	listStyleType: ListStyleTypeValue
	font: FontSpec
}

/** @public */
export interface ResolvedInlineStyle {
	fontFamily: string
	fontSize: number
	fontWeight: string
	fontStyle: FontStyleValue
	/** Line height in pixels. */
	lineHeight: number
	color: string
	letterSpacing: number
	textDecoration: TextDecorationValue
	background: string | null
	verticalAlign: VerticalAlignValue
	font: FontSpec
}
