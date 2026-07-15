import { getFirstCharacter } from 'tldraw'
import './comments.css'

export interface AvatarProps {
	name: string
	/** Background colour, used when there's no `image`. Falls back to the default avatar tint. */
	color?: string
	/** Avatar image URL. When set, shows the image instead of the coloured initial. */
	image?: string
}

function initial(name: string) {
	return (getFirstCharacter(name.trim()) || '?').toUpperCase()
}

/** A commenter's avatar — their image if provided, otherwise a single-initial coloured circle. */
export function Avatar({ name, color, image }: AvatarProps) {
	if (image) {
		return <img className="cmt-avatar cmt-avatar--image" src={image} alt="" aria-hidden="true" />
	}
	return (
		<div
			className="cmt-avatar"
			aria-hidden="true"
			style={color ? { backgroundColor: color } : undefined}
		>
			{initial(name)}
		</div>
	)
}
