import { ComponentProps } from 'react'
import { Link } from 'react-router-dom'
import { trackEvent } from '../../../utils/analytics'
import { getRel } from '../../../utils/rel'

export function ExternalLink(props: ComponentProps<typeof Link> & { eventName?: string }) {
	const { eventName, ...rest } = props
	return (
		<Link
			{...rest}
			target="_blank"
			rel={getRel(rest.to, true)}
			onClick={(e) => {
				if (eventName) trackEvent(eventName, { link: rest.to ?? '' })
				rest.onClick?.(e)
			}}
		/>
	)
}
