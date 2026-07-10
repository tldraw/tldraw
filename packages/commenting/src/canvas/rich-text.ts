import { TLRichText } from 'tldraw'
import { renderCommentPlaintext } from './comment-render'

/**
 * Flatten a rich-text comment body to plaintext through the limited comment extension set,
 * separating paragraphs and list items with newlines. A convenience for consumers rendering bodies
 * as plain text (e.g. the sidebar preview); richer rendering can read the `TLRichText` directly.
 */
export function richTextToPlaintext(body: TLRichText): string {
	return renderCommentPlaintext(body)
}
