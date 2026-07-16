import { useMemo } from 'react'
import { TLRichText } from 'tldraw'
import { renderCommentHtml } from './comment-render'

/** @public */
export interface CommentBodyProps {
	richText: TLRichText
	/** Maps a member id to its current display name, so \@mentions show the live name. */
	resolveName?(id: string): string | undefined
}

/**
 * Renders a comment's rich-text body read-only through the limited comment extension set (no
 * headings), so formatting (bold, links, lists, highlight) is preserved rather than flattened, and
 * headings can never render. Use this as the `body` of a `CommentCard` on a canvas.
 * @public @react
 */
export function CommentBody({ richText, resolveName }: CommentBodyProps) {
	const html = useMemo(() => renderCommentHtml(richText, resolveName), [richText, resolveName])
	return <div className="cmt-text" dangerouslySetInnerHTML={{ __html: html }} />
}
