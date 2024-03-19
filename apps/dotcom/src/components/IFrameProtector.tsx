import { ReactNode, useEffect, useMemo } from 'react'
import { exhaustiveSwitchError } from 'tldraw'
import { useUrl } from '../hooks/useUrl'
import { isDevelopmentEnv } from '../utils/env'
import { trackAnalyticsEvent } from '../utils/trackAnalyticsEvent'

/*
If we're in an iframe, we need to figure out whether we're on a whitelisted host (e.g. tldraw itself)
or a not-allowed host (e.g. someone else's website). Some websites embed tldraw in iframes and this is kinda
risky for us and for them, too—and hey, if we decide to offer a hosted thing, then that's another story.

We can use document.location.ancestorOrigins to check if we're in an allowed origin or not.
*/

type DotcomAppLocation =
	| 'public-multiplayer'
	| 'public-readonly'
	| 'public-snapshot'
	| 'history-snapshot'
	| 'history'
	| 'local'

// Which routes do we allow to be embedded in tldraw.com itself?
const ALLOWED_CONTEXTS = ['public-multiplayer', 'public-readonly', 'public-snapshot']

function isAllowedOrigin(origin: string) {
	return (
		belongsToDomain('tldraw.com', origin) ||
		belongsToDomain('notion.so', origin) ||
		(isDevelopmentEnv && origin.includes('localhost'))
	)
}

function belongsToDomain(domain: string, origin: string) {
	return origin.endsWith(`//${domain}`) || origin.endsWith(`.${domain}`)
}

function isInIframe() {
	return typeof window !== 'undefined' && (window !== window.top || window.self !== window.parent)
}

function getParentOrigin() {
	return typeof document !== undefined ? document.location.ancestorOrigins[0] ?? null : null
}

function getEmbeddedState(
	context: DotcomAppLocation
): 'not-iframe' | 'iframe-ok' | 'iframe-not-allowed' {
	if (!isInIframe()) {
		return 'not-iframe'
	}

	if (!ALLOWED_CONTEXTS.includes(context)) {
		return 'iframe-not-allowed'
	}

	const parentOrigin = getParentOrigin()
	if (!parentOrigin) {
		return 'iframe-not-allowed'
	}

	if (isAllowedOrigin(parentOrigin)) {
		return 'iframe-ok'
	}

	return 'iframe-not-allowed'
}

export function IFrameProtector({
	slug,
	context,
	children,
}: {
	slug: string
	context: DotcomAppLocation
	children: ReactNode
}) {
	const embeddedState = useMemo(() => getEmbeddedState(context), [context])

	const url = useUrl()

	useEffect(() => {
		console.log({ embeddedState, isInIframe: isInIframe(), parentOrigin: getParentOrigin() })
		switch (embeddedState) {
			case 'iframe-not-allowed':
				trackAnalyticsEvent('iframe_not_allowed', { slug, context })
				break
			case 'iframe-ok':
				trackAnalyticsEvent('connect_to_room_in_iframe', {
					slug,
					context,
					parentOrigin: getParentOrigin(),
				})
				break
			case 'not-iframe':
				break
			default:
				exhaustiveSwitchError(embeddedState)
		}
	}, [embeddedState, slug, context])

	if (embeddedState === 'iframe-not-allowed') {
		// We're in an iframe and its not one of ours
		return (
			<div className="tldraw__editor tl-container">
				<div className="iframe-warning__container">
					<a className="iframe-warning__link" href={url} target="_blank">
						{'Visit this page on tldraw.com '}
						<svg
							width="15"
							height="15"
							viewBox="0 0 15 15"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M3 2C2.44772 2 2 2.44772 2 3V12C2 12.5523 2.44772 13 3 13H12C12.5523 13 13 12.5523 13 12V8.5C13 8.22386 12.7761 8 12.5 8C12.2239 8 12 8.22386 12 8.5V12H3V3L6.5 3C6.77614 3 7 2.77614 7 2.5C7 2.22386 6.77614 2 6.5 2H3ZM12.8536 2.14645C12.9015 2.19439 12.9377 2.24964 12.9621 2.30861C12.9861 2.36669 12.9996 2.4303 13 2.497L13 2.5V2.50049V5.5C13 5.77614 12.7761 6 12.5 6C12.2239 6 12 5.77614 12 5.5V3.70711L6.85355 8.85355C6.65829 9.04882 6.34171 9.04882 6.14645 8.85355C5.95118 8.65829 5.95118 8.34171 6.14645 8.14645L11.2929 3H9.5C9.22386 3 9 2.77614 9 2.5C9 2.22386 9.22386 2 9.5 2H12.4999H12.5C12.5678 2 12.6324 2.01349 12.6914 2.03794C12.7504 2.06234 12.8056 2.09851 12.8536 2.14645Z"
								fill="currentColor"
								stroke="black"
								strokeWidth=".5"
							></path>
						</svg>
					</a>
				</div>
			</div>
		)
	}

	return children
}
