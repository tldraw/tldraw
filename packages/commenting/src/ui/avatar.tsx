import { getFirstCharacter } from 'tldraw'
import { CommentAuthor } from './comment-author'

/** @public */
export interface AvatarProps {
	author: CommentAuthor
}

function initial(name: string) {
	return (getFirstCharacter(name.trim()) || '?').toUpperCase()
}

/** A commenter's avatar — their image if provided, otherwise a single-initial coloured circle.
 * @public @react */
export function Avatar({ author }: AvatarProps) {
	if (author.image) {
		return (
			<img
				className="tlui-cmt-avatar tlui-cmt-avatar--image"
				src={author.image}
				alt=""
				aria-hidden="true"
			/>
		)
	}
	return (
		<div
			className="tlui-cmt-avatar"
			aria-hidden="true"
			style={author.color ? { backgroundColor: author.color } : undefined}
		>
			{initial(author.name)}
		</div>
	)
}
