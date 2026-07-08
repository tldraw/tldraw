import { useMemo } from 'react'
import { renderHtmlFromRichText, TLRichText, useEditor } from 'tldraw'
import '../ui/comments.css'

/** @public */
export interface CommentBodyProps {
	richText: TLRichText
}

/**
 * Renders a comment's rich-text body read-only — the same path the text shape renders through
 * (`renderHtmlFromRichText`), so formatting (bold, links, lists) is preserved rather than
 * flattened. Use this as the `body` of a `CommentCard` on a canvas that has an editor.
 * @public
 * @react
 */
export function CommentBody({ richText }: CommentBodyProps) {
	const editor = useEditor()
	const html = useMemo(() => renderHtmlFromRichText(editor, richText), [editor, richText])
	return <div className="cmt-text" dangerouslySetInnerHTML={{ __html: html }} />
}
