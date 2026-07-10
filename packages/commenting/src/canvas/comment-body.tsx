import { useMemo } from 'react'
import { TLRichText } from 'tldraw'
import '../ui/comments.css'
import { renderCommentHtml } from './comment-render'

export interface CommentBodyProps {
	richText: TLRichText
}

/**
 * Renders a comment's rich-text body read-only through the limited comment extension set (no
 * headings), so formatting (bold, links, lists, highlight) is preserved rather than flattened, and
 * headings can never render. Use this as the `body` of a `CommentCard` on a canvas.
 */
export function CommentBody({ richText }: CommentBodyProps) {
	const html = useMemo(() => renderCommentHtml(richText), [richText])
	return <div className="cmt-text" dangerouslySetInnerHTML={{ __html: html }} />
}
