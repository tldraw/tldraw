import './comments.css'

export interface AvatarProps {
	name: string
}

function initial(name: string) {
	return (name.trim()[0] ?? '?').toUpperCase()
}

/** A single-initial avatar for a commenter. */
export function Avatar({ name }: AvatarProps) {
	return (
		<div className="cmt-avatar" aria-hidden="true">
			{initial(name)}
		</div>
	)
}
