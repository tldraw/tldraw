import { markRule, nodeRule } from './stylesheet'
import { ListStyleTypeValue, StyleSheet, TextAlignValue } from './types'

const HEADING_SIZES: Record<number, `${number}em`> = {
	1: '2em',
	2: '1.5em',
	3: '1.17em',
	4: '1em',
	5: '0.83em',
	6: '0.67em',
}

const HEADING_MARGINS: Record<number, `${number}em`> = {
	1: '0.67em',
	2: '0.83em',
	3: '1em',
	4: '1.33em',
	5: '1.67em',
	6: '2.33em',
}

const BULLET_BY_DEPTH: ListStyleTypeValue[] = ['disc', 'circle', 'square']

/**
 * Rules approximating the browser default stylesheet for the TipTap StarterKit node and mark
 * set. Consumers layer their own sheet after this one; rules later in the sheet win.
 *
 * @public
 */
export const defaultUserAgentStyles: StyleSheet = [
	// TipTap's TextAlign and TextDirection extensions write `textAlign` and `dir` attributes on
	// blocks, which the HTML renderer turns into inline styles.
	{
		match: (ctx) => typeof ctx.node.attrs?.textAlign === 'string',
		style: (ctx) => ({ textAlign: ctx.node.attrs!.textAlign as TextAlignValue }),
	},
	{
		match: (ctx) => {
			const dir = ctx.node.attrs?.dir
			return dir === 'ltr' || dir === 'rtl' || dir === 'auto'
		},
		style: (ctx) => ({ direction: ctx.node.attrs!.dir as 'ltr' | 'rtl' | 'auto' }),
	},
	nodeRule('paragraph', { marginTop: '1em', marginBottom: '1em' }),
	nodeRule('heading', (ctx) => {
		const level = Number(ctx.node.attrs?.level ?? 1)
		return {
			fontSize: HEADING_SIZES[level] ?? '1em',
			fontWeight: 'bold',
			marginTop: HEADING_MARGINS[level] ?? '1em',
			marginBottom: HEADING_MARGINS[level] ?? '1em',
		}
	}),
	nodeRule('blockquote', { marginTop: '1em', marginBottom: '1em', paddingLeft: '40px' }),
	nodeRule('codeBlock', {
		fontFamily: 'monospace',
		fontSize: '0.8125em',
		whiteSpace: 'pre',
		marginTop: '1em',
		marginBottom: '1em',
	}),
	nodeRule('horizontalRule', { marginTop: '0.5em', marginBottom: '0.5em', minHeight: '2px' }),
	nodeRule(['bulletList', 'orderedList'], (ctx) => ({
		paddingLeft: '40px',
		// Nested lists lose the outer list's vertical margins, matching the UA `ul ul { margin: 0 }`.
		marginTop: ctx.listDepth > 0 ? 0 : '1em',
		marginBottom: ctx.listDepth > 0 ? 0 : '1em',
		listStyleType:
			ctx.type === 'orderedList'
				? 'decimal'
				: BULLET_BY_DEPTH[Math.min(ctx.listDepth, BULLET_BY_DEPTH.length - 1)],
	})),
	markRule('bold', { fontWeight: 'bold' }),
	markRule('italic', { fontStyle: 'italic' }),
	markRule('strike', { textDecoration: 'line-through' }),
	markRule('underline', { textDecoration: 'underline' }),
	markRule('code', { fontFamily: 'monospace', fontSize: '0.8125em' }),
	markRule('link', { textDecoration: 'underline', color: '#0000ee' }),
	markRule('highlight', (ctx) => ({
		background: (ctx.marks[0].attrs?.color as string | undefined) ?? '#ffff00',
	})),
	markRule('subscript', { verticalAlign: 'sub', fontSize: 'smaller' }),
	markRule('superscript', { verticalAlign: 'super', fontSize: 'smaller' }),
	markRule('textStyle', (ctx) => {
		const attrs = ctx.marks[0].attrs ?? {}
		return {
			color: typeof attrs.color === 'string' ? attrs.color : undefined,
			fontFamily: typeof attrs.fontFamily === 'string' ? attrs.fontFamily : undefined,
			fontSize: typeof attrs.fontSize === 'string' ? (attrs.fontSize as `${number}px`) : undefined,
		}
	}),
]
