import './comments.css'

export interface CommentTextProps {
	text: string
}

/** A comment's body text. */
export function CommentText({ text }: CommentTextProps) {
	return <p className="cmt-text">{text}</p>
}
