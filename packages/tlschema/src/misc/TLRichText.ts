import { T } from '@tldraw/validate'

/**
 * Validator for TLRichText objects that ensures they have the correct structure
 * for document-based rich text content. Validates a document with a type field
 * and an array of content blocks.
 *
 * @public
 * @example
 * ```ts
 * const richText = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] }
 * const isValid = richTextValidator.check(richText) // true
 * ```
 */
export const richTextValidator = T.object({ type: T.string, content: T.arrayOf(T.unknown) })

/**
 * Type representing rich text content in tldraw. Rich text follows a document-based
 * structure with a root document containing an array of content blocks (paragraphs,
 * text nodes, etc.). This enables formatted text with support for multiple paragraphs,
 * styling, and other rich content.
 *
 * @public
 * @example
 * ```ts
 * const richText: TLRichText = {
 *   type: 'doc',
 *   content: [
 *     {
 *       type: 'paragraph',
 *       content: [{ type: 'text', text: 'Hello world!' }]
 *     }
 *   ]
 * }
 * ```
 */
export type TLRichText = T.TypeOf<typeof richTextValidator>

/**
 * Converts a plain text string into a TLRichText object. Each line of the input
 * text becomes a separate paragraph in the rich text document. Empty lines are
 * preserved as empty paragraphs to maintain the original text structure.
 *
 * @param text - The plain text string to convert to rich text
 * @returns A TLRichText object with the text content structured as paragraphs
 * @public
 * @example
 * ```ts
 * const richText = toRichText('Hello\nWorld')
 * // Returns:
 * // {
 * //   type: 'doc',
 * //   content: [
 * //     { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
 * //     { type: 'paragraph', content: [{ type: 'text', text: 'World' }] }
 * //   ]
 * // }
 *
 * const emptyLine = toRichText('Line 1\n\nLine 3')
 * // Creates three paragraphs, with the middle one being empty
 * ```
 */
export function toRichText(text: string): TLRichText {
	const lines = text.split('\n')
	const content = lines.map((text) => {
		if (!text) {
			return {
				type: 'paragraph',
			}
		}

		return {
			type: 'paragraph',
			content: [{ type: 'text', text }],
		}
	})

	return {
		type: 'doc',
		content,
	}
}
