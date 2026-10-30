'use client'

import Link from 'next/link'

const POSTHOG_HASH_HOSTNAMES = ['www.tldraw.com', 'tldraw.com']

// tldraw.com only trusts these ids while `ts` is under two minutes old (see posthogHashBootstrap.ts
// in apps/dotcom), so they are stamped when the link is used rather than when it renders. Rendered
// ids also ended up in links copied into other pages.
function addPosthogHash(anchor: HTMLAnchorElement, href: string) {
	const sessionId = window.posthog?.get_session_id?.()
	const distinctId = window.posthog?.get_distinct_id?.()
	if (!sessionId || !distinctId) return
	const hash = new URLSearchParams({
		session_id: sessionId,
		distinct_id: distinctId,
		ts: String(Date.now()),
	})
	anchor.href = `${href}#${hash}`
}

export function TldrawLink(props: React.ComponentProps<'a'>) {
	const { href, children, onClick, onPointerDown } = props

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

	const posthogHashHref =
		href && !href.includes('#') && POSTHOG_HASH_HOSTNAMES.includes(maybeParsedUrl?.hostname ?? '')
			? href
			: undefined

	// Pointer down comes before navigation, a middle click or the context menu; click covers keyboard.
	const handlePointerDown = (event: React.PointerEvent<HTMLAnchorElement>) => {
		if (posthogHashHref) addPosthogHash(event.currentTarget, posthogHashHref)
		onPointerDown?.(event)
	}
	const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
		if (posthogHashHref) addPosthogHash(event.currentTarget, posthogHashHref)
		onClick?.(event)
	}

	return (
		<Link
			{...props}
			href={href ?? ''}
			target={target}
			onPointerDown={handlePointerDown}
			onClick={handleClick}
		>
			{children}
		</Link>
	)
}
