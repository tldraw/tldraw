import './comments.css'

export interface CommentComposerProps {
	author: string
	placeholder: string
}

/** The input for writing a new comment: avatar, field, send button. */
export function CommentComposer({ author, placeholder }: CommentComposerProps) {
	return (
		<div className="cmt-composer">
			<div className="cmt-avatar" aria-hidden="true">
				{author.slice(0, 1).toUpperCase()}
			</div>
			<input className="cmt-input" placeholder={placeholder} readOnly />
			<button className="cmt-send" type="button">
				Send
			</button>
		</div>
	)
}
