import { TextLayout } from '../layout/types'

/**
 * The little bit of DOM the positioned-span renderer needs, declared locally so the core builds
 * without DOM lib types.
 *
 * @public
 */
export interface DomElementLike {
	style: Record<string, string>
	textContent: string | null
	appendChild(child: DomElementLike): unknown
}

/** @public */
export interface DomRenderOptions {
	createElement(tag: string): DomElementLike
	/** Translate the whole layout. */
	x?: number
	y?: number
}

/**
 * Render a layout as absolutely positioned spans inside a relatively positioned container.
 * This exists to show the layout is renderer-neutral; it is not a substitute for real DOM
 * layout in an editable surface.
 *
 * @public
 */
export function renderDom(layout: TextLayout, options: DomRenderOptions): DomElementLike {
	const dx = options.x ?? 0
	const dy = options.y ?? 0
	const root = options.createElement('div')
	Object.assign(root.style, {
		position: 'relative',
		width: `${layout.width}px`,
		height: `${layout.height}px`,
		whiteSpace: 'pre',
	})
	for (const line of layout.lines) {
		for (const f of line.fragments) {
			if (f.kind === 'tab' || f.text.length === 0) continue
			const span = options.createElement('span')
			const top = line.y + line.baseline + f.baselineShift - f.ascent + dy
			Object.assign(span.style, {
				position: 'absolute',
				left: `${line.x + f.x + dx}px`,
				top: `${top}px`,
				lineHeight: `${f.ascent + f.descent}px`,
				fontFamily: f.style.fontFamily,
				fontSize: `${f.style.fontSize}px`,
				fontWeight: f.style.fontWeight,
				fontStyle: f.style.fontStyle,
				color: f.style.color,
				letterSpacing: `${f.style.letterSpacing}px`,
				textDecoration: f.style.textDecoration,
				background: f.style.background ?? 'transparent',
			})
			span.textContent = f.text
			root.appendChild(span)
		}
	}
	return root
}
