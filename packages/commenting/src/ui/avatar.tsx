import { getFirstCharacter } from 'tldraw'
import './comments.css'

export interface AvatarProps {
	name: string
}

function initial(name: string) {
	return (getFirstCharacter(name.trim()) || '?').toUpperCase()
}

/** A single-initial avatar for a commenter. */
export function Avatar({ name }: AvatarProps) {
	return (
		<div className="cmt-avatar" aria-hidden="true">
			{initial(name)}
		</div>
	)
}
