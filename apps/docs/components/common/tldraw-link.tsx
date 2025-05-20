'use client'

import Link from 'next/link'
import { usePostHog } from 'posthog-js/react'
import { useEffect, useState } from 'react'

export function TldrawLink(props: React.ComponentProps<'a'>) {
	const { href, children } = props
	const posthog = usePostHog()
	const [sessionId, setSessionId] = useState(posthog.get_session_id())
	const [distinctId, setDistinctId] = useState(posthog.get_distinct_id())

	useEffect(() => {
		// XXX: have to wait a tick for posthog to be ready.
		// there's unfortunately no event callback for this.
		setTimeout(() => {
			setSessionId(posthog.get_session_id())
			setDistinctId(posthog.get_distinct_id())
		}, 0)
	}, [posthog])

	const isLocalUrl = href?.startsWith('/') || href?.startsWith('#')
	let maybeParsedUrl
	try {
		maybeParsedUrl = isLocalUrl ? null : href ? new URL(href) : null
	} catch {
		console.error(`Invalid URL: ${href}`)
	}
	const derivedTarget =
		isLocalUrl ||
		maybeParsedUrl?.host.includes('tldraw.com') ||
		maybeParsedUrl?.host.includes('localhost')
			? undefined
			: '_blank'
	const target = props.target ?? derivedTarget

	let newHref = href
	if (
		maybeParsedUrl?.host.includes('tldraw.com') &&
		sessionId &&
		distinctId &&
		!href?.includes('#')
	) {
		newHref = `${href}#session_id=${sessionId}&distinct_id=${distinctId}`
	}

	return (
		<Link {...props} href={newHref ?? ''} target={target}>
			{children}
		</Link>
	)
}
