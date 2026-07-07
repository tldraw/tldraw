import { Avatar } from './avatar'
import './comments.css'
import { SendButton } from './send-button'

export interface CommentComposerProps {
	author: string
	placeholder: string
}

/** The input for writing a new comment, composed from Avatar and SendButton. */
export function CommentComposer({ author, placeholder }: CommentComposerProps) {
	return (
		<div className="cmt-composer">
			<Avatar name={author} />
			<input className="cmt-input" placeholder={placeholder} />
			<SendButton label="Send" />
		</div>
	)
}
