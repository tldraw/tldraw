import './comments.css'
import { renderMarkdown } from './render-markdown'

/** @public */
export interface CommentTextProps {
	/** Rich text body, authored as markdown. */
	text: string
}

/**
 * A comment's body, rendered as markdown (bold, italic, code, links, lists).
 * @public
 * @react
 */
export function CommentText({ text }: CommentTextProps) {
	return <div className="cmt-text">{renderMarkdown(text)}</div>
}
