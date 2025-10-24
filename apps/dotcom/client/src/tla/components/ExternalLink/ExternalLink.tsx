import { ComponentProps } from 'react'
import { Link } from 'react-router-dom'
import { trackEvent } from '../../../utils/analytics'

export function ExternalLink(
	props: ComponentProps<typeof Link> & { eventName?: string; allowReferrer?: boolean }
) {
	const { eventName, allowReferrer, ...rest } = props

	return (
		<Link
			{...rest}
			target="_blank"
			rel={allowReferrer ? 'noopener' : 'noopener noreferrer'}
			onClick={(e) => {
				if (eventName) trackEvent(eventName, { link: rest.to ?? '' })
				rest.onClick?.(e)
			}}
		/>
	)
}
