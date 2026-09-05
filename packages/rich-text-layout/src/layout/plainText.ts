import { NodeRegistry } from '../document/types'
import { MeasureContext } from '../measure/types'
import { StyleDeclaration } from '../style/types'
import { layoutDocument } from './document'
import { LayoutOptions, TextLayout } from './types'

/** @public */
export interface PlainTextLayoutOptions {
	/** The font and text properties of the text; see `LayoutOptions.rootStyle`. */
	style?: StyleDeclaration
	maxWidth?: number | null
	minWidth?: number
	padding?: number
	measureContext?: MeasureContext
	engine?: LayoutOptions['engine']
	profile?: LayoutOptions['profile']
}

const PLAIN_TEXT_REGISTRY: NodeRegistry = {
	doc: { kind: 'block' },
	text: { kind: 'text' },
	hardBreak: { kind: 'hardBreak' },
}

/**
 * Lay out a plain string as one block. Newlines are forced breaks regardless of `whiteSpace`.
 *
 * @public
 */
export function layoutPlainText(text: string, options: PlainTextLayoutOptions = {}): TextLayout {
	const style = options.style ?? {}
	const normalized = text.replace(/\r\n?/g, '\n')
	const content =
		style.whiteSpace === 'normal' || style.whiteSpace === undefined
			? normalized
					.split('\n')
					.flatMap((line, i) =>
						i === 0
							? [{ type: 'text', text: line }]
							: [{ type: 'hardBreak' }, { type: 'text', text: line }]
					)
			: [{ type: 'text', text: normalized }]
	return layoutDocument(
		{ type: 'doc', content: content.filter((n) => n.type !== 'text' || n.text !== '') },
		{
			registry: PLAIN_TEXT_REGISTRY,
			userAgentStyles: null,
			rootStyle: style,
			maxWidth: options.maxWidth,
			minWidth: options.minWidth,
			padding: options.padding,
			measureContext: options.measureContext,
			engine: options.engine,
			profile: options.profile,
		}
	)
}
