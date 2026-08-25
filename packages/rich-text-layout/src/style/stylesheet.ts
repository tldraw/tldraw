import { PMMark, PMNode } from '../document/types'
import { LayoutProfile } from '../layout/profile'
import { FontSpec, MeasureContext } from '../measure/types'
import {
	FontSizeValue,
	FontWeightValue,
	Length,
	LineHeightValue,
	ResolvedBlockStyle,
	ResolvedInlineStyle,
	StyleDeclaration,
	StyleMatchContext,
	StyleRule,
	StyleSheet,
} from './types'

/**
 * A rule that matches block or inline nodes by type.
 *
 * @public
 */
export function nodeRule(
	types: string | readonly string[],
	style: StyleRule['style'],
	extra?: (ctx: StyleMatchContext) => boolean
): StyleRule {
	const set = new Set(typeof types === 'string' ? [types] : types)
	return {
		match: (ctx) => set.has(ctx.type) && (extra ? extra(ctx) : true),
		style,
	}
}

/**
 * A rule that matches inline runs carrying a mark of the given type.
 *
 * @public
 */
export function markRule(
	types: string | readonly string[],
	style: StyleRule['style'],
	extra?: (mark: PMMark, ctx: StyleMatchContext) => boolean
): StyleRule {
	const set = new Set(typeof types === 'string' ? [types] : types)
	return {
		match: (ctx) =>
			ctx.marks.some((mark) => set.has(mark.type) && (extra ? extra(mark, ctx) : true)),
		style: (ctx) => {
			const mark = ctx.marks.find((m) => set.has(m.type) && (extra ? extra(m, ctx) : true))!
			return typeof style === 'function' ? style({ ...ctx, marks: [mark] }) : style
		},
	}
}

/** @internal */
export interface LengthContext {
	fontSize: number
	zeroAdvance: number
	lineHeight: number
}

/** @internal */
export function resolveLength(value: Length | undefined, ctx: LengthContext, fallback = 0): number {
	if (value === undefined) return fallback
	if (typeof value === 'number') return value
	const match = /^(-?\d*\.?\d+)(px|em|ch|lh)?$/.exec(value.trim())
	if (!match) return fallback
	const n = parseFloat(match[1])
	switch (match[2]) {
		case 'em':
			return n * ctx.fontSize
		case 'ch':
			return n * ctx.zeroAdvance
		case 'lh':
			return n * ctx.lineHeight
		default:
			return n
	}
}

function resolveFontSize(value: FontSizeValue | undefined, parentSize: number, ctx: LengthContext) {
	if (value === undefined) return parentSize
	// CSS `smaller`/`larger` step the size by the browser's 1.2 ratio.
	if (value === 'smaller') return parentSize / 1.2
	if (value === 'larger') return parentSize * 1.2
	return resolveLength(value, { ...ctx, fontSize: parentSize }, parentSize)
}

function resolveFontWeight(value: FontWeightValue | undefined, parent: string): string {
	if (value === undefined) return parent
	if (value === 'bolder') return parent === 'bold' || Number(parent) >= 600 ? '900' : 'bold'
	if (value === 'lighter') return Number(parent) >= 600 || parent === 'bold' ? 'normal' : '100'
	return String(value)
}

/**
 * Line height is inherited the way CSS inherits it: a unitless factor stays a factor (and is
 * re-multiplied by each descendant's own font size), a pixel value stays fixed.
 */
type LineHeightInherit = { kind: 'factor'; value: number } | { kind: 'px'; value: number } | null

function parseLineHeight(value: LineHeightValue | undefined): LineHeightInherit | undefined {
	if (value === undefined) return undefined
	if (value === 'normal') return null
	if (typeof value === 'number') return { kind: 'factor', value }
	return { kind: 'px', value: parseFloat(value) }
}

function lineHeightPx(
	inherit: LineHeightInherit,
	font: FontSpec,
	measure: MeasureContext,
	profile: LayoutProfile
): number {
	if (inherit === null) return profile.normalLineHeight(measure.metrics(font), font.size)
	return inherit.kind === 'factor' ? inherit.value * font.size : inherit.value
}

function fontSpec(
	family: string,
	size: number,
	weight: string,
	style: ResolvedBlockStyle['fontStyle']
): FontSpec {
	return { family, size, weight, style }
}

/** @internal */
export interface BlockStyleState {
	style: ResolvedBlockStyle
	lineHeightInherit: LineHeightInherit
}

/** @internal */
export interface StyleResolver {
	resolveBlock(ctx: StyleMatchContext, parent: BlockStyleState | null): BlockStyleState
	resolveInline(ctx: StyleMatchContext, block: BlockStyleState): ResolvedInlineStyle
}

function collect(sheet: StyleSheet, ctx: StyleMatchContext): StyleDeclaration[] {
	const out: StyleDeclaration[] = []
	for (const rule of sheet) {
		if (!rule.match(ctx)) continue
		out.push(typeof rule.style === 'function' ? rule.style(ctx) : rule.style)
	}
	return out
}

function merge(decls: StyleDeclaration[]): StyleDeclaration {
	const out: StyleDeclaration = {}
	for (const decl of decls) {
		for (const key of Object.keys(decl) as (keyof StyleDeclaration)[]) {
			const value = decl[key]
			if (value !== undefined) (out as Record<string, unknown>)[key] = value
		}
	}
	return out
}

/** @internal */
export interface RootStyleDefaults {
	fontFamily: string
	fontSize: number
	fontWeight: string
	fontStyle: ResolvedBlockStyle['fontStyle']
	lineHeight: LineHeightValue
	color: string
}

const DEFAULT_ROOT: RootStyleDefaults = {
	fontFamily: 'sans-serif',
	fontSize: 16,
	fontWeight: 'normal',
	fontStyle: 'normal',
	lineHeight: 'normal',
	color: 'black',
}

/** @internal */
export function createStyleResolver(
	sheet: StyleSheet,
	measure: MeasureContext,
	root: StyleDeclaration,
	profile: LayoutProfile
): StyleResolver {
	// The root element of a layout is not a document node, so its style is declared directly
	// rather than matched: it plays the role of the container's computed style.
	const rootDecl = root

	function resolveBlock(ctx: StyleMatchContext, parent: BlockStyleState | null): BlockStyleState {
		const decl = merge(collect(sheet, ctx))
		const parentStyle = parent?.style ?? null

		const inheritedFamily =
			parentStyle?.fontFamily ?? rootDecl.fontFamily ?? DEFAULT_ROOT.fontFamily
		const parentSize = parentStyle?.fontSize ?? rootBaseFontSize()
		const parentWeight = parentStyle?.fontWeight ?? rootFontWeight()
		const parentStyleKw = parentStyle?.fontStyle ?? rootDecl.fontStyle ?? DEFAULT_ROOT.fontStyle
		const parentColor = parentStyle?.color ?? rootDecl.color ?? DEFAULT_ROOT.color

		const fontFamily = decl.fontFamily ?? inheritedFamily
		const fontWeight = resolveFontWeight(decl.fontWeight, parentWeight)
		const fontStyle = decl.fontStyle ?? parentStyleKw
		// The unit context for the block's own font-size: em/ch/lh refer to the parent.
		const parentFont = fontSpec(
			parentStyle?.fontFamily ?? inheritedFamily,
			parentSize,
			parentWeight,
			parentStyleKw
		)
		const parentLineHeightInherit =
			parent?.lineHeightInherit === undefined
				? (parseLineHeight(rootDecl.lineHeight) ?? parseLineHeight(DEFAULT_ROOT.lineHeight)!)
				: parent.lineHeightInherit
		const parentCtx: LengthContext = {
			fontSize: parentSize,
			zeroAdvance: measure.metrics(parentFont).zeroAdvance,
			lineHeight: lineHeightPx(parentLineHeightInherit, parentFont, measure, profile),
		}
		const fontSize = resolveFontSize(decl.fontSize, parentSize, parentCtx)
		const font = fontSpec(fontFamily, fontSize, fontWeight, fontStyle)

		const lineHeightInherit =
			parseLineHeight(decl.lineHeight) === undefined
				? parentLineHeightInherit
				: parseLineHeight(decl.lineHeight)!
		const lineHeight = lineHeightPx(lineHeightInherit, font, measure, profile)
		const ownCtx: LengthContext = {
			fontSize,
			zeroAdvance: measure.metrics(font).zeroAdvance,
			lineHeight,
		}

		const style: ResolvedBlockStyle = {
			fontFamily,
			fontSize,
			fontWeight,
			fontStyle,
			lineHeight,
			color: decl.color ?? parentColor,
			letterSpacing: resolveLength(
				decl.letterSpacing,
				ownCtx,
				parentStyle?.letterSpacing ?? resolveLength(rootDecl.letterSpacing, ownCtx, 0)
			),
			textAlign: decl.textAlign ?? parentStyle?.textAlign ?? rootDecl.textAlign ?? 'start',
			marginTop: resolveLength(decl.marginTop, ownCtx),
			marginBottom: resolveLength(decl.marginBottom, ownCtx),
			paddingLeft: resolveLength(decl.paddingLeft, ownCtx),
			minHeight: resolveLength(decl.minHeight, ownCtx),
			whiteSpace: decl.whiteSpace ?? parentStyle?.whiteSpace ?? rootDecl.whiteSpace ?? 'normal',
			overflowWrap:
				decl.overflowWrap ?? parentStyle?.overflowWrap ?? rootDecl.overflowWrap ?? 'normal',
			wordBreak: decl.wordBreak ?? parentStyle?.wordBreak ?? rootDecl.wordBreak ?? 'normal',
			tabSize: decl.tabSize ?? parentStyle?.tabSize ?? rootDecl.tabSize ?? 8,
			direction: decl.direction ?? parentStyle?.direction ?? rootDecl.direction ?? 'ltr',
			listStyleType:
				decl.listStyleType ?? parentStyle?.listStyleType ?? rootDecl.listStyleType ?? 'disc',
			font,
		}
		return { style, lineHeightInherit }
	}

	function rootBaseFontSize() {
		return resolveFontSize(rootDecl.fontSize, DEFAULT_ROOT.fontSize, {
			fontSize: DEFAULT_ROOT.fontSize,
			zeroAdvance: DEFAULT_ROOT.fontSize / 2,
			lineHeight: 0,
		})
	}

	function rootFontWeight() {
		return resolveFontWeight(rootDecl.fontWeight, DEFAULT_ROOT.fontWeight)
	}

	function resolveInline(ctx: StyleMatchContext, block: BlockStyleState): ResolvedInlineStyle {
		const base = block.style
		let fontFamily = base.fontFamily
		let fontSize = base.fontSize
		let fontWeight = base.fontWeight
		let fontStyle = base.fontStyle
		let color = base.color
		let letterSpacing = base.letterSpacing
		let textDecoration: ResolvedInlineStyle['textDecoration'] = 'none'
		let background: string | null = null
		let verticalAlign: ResolvedInlineStyle['verticalAlign'] = 'baseline'
		let lineHeightInherit = block.lineHeightInherit

		const apply = (decl: StyleDeclaration) => {
			const lengthCtx: LengthContext = {
				fontSize,
				zeroAdvance: measure.metrics(fontSpec(fontFamily, fontSize, fontWeight, fontStyle))
					.zeroAdvance,
				lineHeight: base.lineHeight,
			}
			if (decl.fontFamily !== undefined) fontFamily = decl.fontFamily
			if (decl.fontSize !== undefined)
				fontSize = resolveFontSize(decl.fontSize, fontSize, lengthCtx)
			if (decl.fontWeight !== undefined) fontWeight = resolveFontWeight(decl.fontWeight, fontWeight)
			if (decl.fontStyle !== undefined) fontStyle = decl.fontStyle
			if (decl.color !== undefined) color = decl.color
			if (decl.letterSpacing !== undefined) {
				letterSpacing = resolveLength(decl.letterSpacing, { ...lengthCtx, fontSize })
			}
			if (decl.textDecoration !== undefined) {
				textDecoration = combineDecoration(textDecoration, decl.textDecoration)
			}
			if (decl.background !== undefined) {
				background = decl.background === 'none' ? null : decl.background
			}
			if (decl.verticalAlign !== undefined) verticalAlign = decl.verticalAlign
			const lh = parseLineHeight(decl.lineHeight)
			if (lh !== undefined) lineHeightInherit = lh
		}

		// Rules are grouped by subject so that several rules on one mark merge like declarations
		// on one element (`em` refers to the parent, later rules win), while successive marks
		// compose like nested elements. Rules that match the bare node apply once, first.
		const nodeCtx: StyleMatchContext = { ...ctx, marks: [] }
		const nodeRules = new Set<StyleRule>()
		const nodeDecls: StyleDeclaration[] = []
		for (const rule of sheet) {
			if (!rule.match(nodeCtx)) continue
			nodeRules.add(rule)
			nodeDecls.push(typeof rule.style === 'function' ? rule.style(nodeCtx) : rule.style)
		}
		if (nodeDecls.length) apply(merge(nodeDecls))

		for (const mark of ctx.marks) {
			const markCtx: StyleMatchContext = { ...ctx, marks: [mark] }
			const decls: StyleDeclaration[] = []
			for (const rule of sheet) {
				if (nodeRules.has(rule) || !rule.match(markCtx)) continue
				decls.push(typeof rule.style === 'function' ? rule.style(markCtx) : rule.style)
			}
			if (decls.length) apply(merge(decls))
		}

		const font = fontSpec(fontFamily, fontSize, fontWeight, fontStyle)
		return {
			fontFamily,
			fontSize,
			fontWeight,
			fontStyle,
			lineHeight: lineHeightPx(lineHeightInherit, font, measure, profile),
			color,
			letterSpacing,
			textDecoration,
			background,
			verticalAlign,
			font,
		}
	}

	return { resolveBlock, resolveInline }
}

function combineDecoration(
	current: ResolvedInlineStyle['textDecoration'],
	next: ResolvedInlineStyle['textDecoration']
): ResolvedInlineStyle['textDecoration'] {
	// Decorations propagate from ancestors and accumulate rather than replace, so
	// underline + strike on nested marks renders both, like nested <u><s> in a browser.
	if (next === 'none' || current === 'none') return next
	if (current === next) return current
	return 'underline line-through'
}

/** @internal */
export function makeMatchContext(
	node: PMNode,
	marks: readonly PMMark[],
	ancestors: readonly PMNode[],
	index: number,
	listDepth: number
): StyleMatchContext {
	return { node, type: node.type, marks, ancestors, index, listDepth }
}
