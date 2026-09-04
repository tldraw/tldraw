'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export function TldrawLink(props: React.ComponentProps<'a'>) {
	const { href, children } = props
	const windowObject = typeof window !== 'undefined' ? window : null
	// Start empty so the first client render matches the server HTML — reading
	// posthog during render appends `#session_id` to hrefs before hydration and
	// causes a hydration mismatch whenever posthog loads first.
	const [sessionId, setSessionId] = useState<string | undefined>(undefined)
	const [distinctId, setDistinctId] = useState<string | undefined>(undefined)

	useEffect(() => {
		// Note this href check is intentionally loose, just to avoid
		// doing this setInterval for every link. We do the real check below.
		if (sessionId || !href?.includes('tldraw.com')) return

		if (windowObject?.posthog) {
			setSessionId(windowObject.posthog.get_session_id())
			setDistinctId(windowObject.posthog.get_distinct_id())
			return
		}

		// XXX: have to wait a bit for posthog to be ready.
		// there's unfortunately no event callback for this.
		const timeout = setInterval(() => {
			setSessionId(windowObject?.posthog?.get_session_id())
			setDistinctId(windowObject?.posthog?.get_distinct_id())
			clearTimeout(timeout)
		}, 1000)

		return () => {
			clearTimeout(timeout)
		}
	}, [sessionId, windowObject, href])

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
