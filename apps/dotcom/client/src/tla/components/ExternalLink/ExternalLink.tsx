import { ComponentProps } from 'react'
import { Link } from 'react-router-dom'

export function ExternalLink(props: ComponentProps<typeof Link>) {
	return (
		<Link {...props} target="_blank" rel="noopener noreferrer">
			{props.children}
		</Link>
	)
}
