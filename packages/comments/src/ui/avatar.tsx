import './comments.css'

/** @public */
export interface AvatarProps {
	name: string
}

function initials(name: string) {
	return name
		.split(' ')
		.map((word) => word[0] ?? '')
		.join('')
		.slice(0, 2)
		.toUpperCase()
}

/**
 * An initials avatar for a commenter.
 * @public
 * @react
 */
export function Avatar({ name }: AvatarProps) {
	return (
		<div className="cmt-avatar" aria-hidden="true">
			{initials(name)}
		</div>
	)
}
