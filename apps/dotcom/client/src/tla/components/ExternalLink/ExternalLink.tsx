import { ComponentProps, MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useValue } from 'tldraw'
import { trackEvent } from '../../../utils/analytics'
import { withAppOrigin } from '../../../utils/appOriginLinks'

export function ExternalLink(props: ComponentProps<typeof Link> & { eventName?: string }) {
	const { eventName, to, ...rest } = props
	const href = useValue(
		'external link href',
		() => (typeof to === 'string' ? withAppOrigin(to) : to),
		[to]
	)

	// PostHog may only store the first touch after this rendered (e.g. right after consent is
	// granted), so recompute as the link is followed. auxclick covers middle-click.
	const refreshHref = (e: MouseEvent<HTMLAnchorElement>) => {
		if (typeof to !== 'string') return
		const next = withAppOrigin(to)
		if (e.currentTarget.getAttribute('href') !== next) e.currentTarget.setAttribute('href', next)
	}

	return (
		<Link
			{...rest}
			to={href}
			target="_blank"
			rel="noopener noreferrer"
			onClick={(e) => {
				refreshHref(e)
				if (eventName) trackEvent(eventName, { link: to ?? '' })
				rest.onClick?.(e)
			}}
			onAuxClick={(e) => {
				refreshHref(e)
				rest.onAuxClick?.(e)
			}}
		/>
	)
}
