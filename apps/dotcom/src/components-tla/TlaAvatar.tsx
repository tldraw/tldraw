import { HTMLAttributes } from 'react'

export function TlaAvatar({
	size = 's',
	...props
}: HTMLAttributes<HTMLDivElement> & { size?: 's' | 'm' | 'l' }) {
	return <div {...props} className={`tla_avatar ${props.className ?? ''}`} data-size={size} />
}
