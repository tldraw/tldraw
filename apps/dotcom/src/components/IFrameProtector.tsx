import { ReactNode, useEffect, useState } from 'react'
import { LoadingScreen } from 'tldraw'
import { version } from '../../version'
import { useUrl } from '../hooks/useUrl'
import { trackAnalyticsEvent } from '../utils/trackAnalyticsEvent'

/*
If we're in an iframe, we need to figure out whether we're on a whitelisted host (e.g. tldraw itself)
or a not-allowed host (e.g. someone else's website). Some websites embed tldraw in iframes and this is kinda
risky for us and for them, too—and hey, if we decide to offer a hosted thing, then that's another stor

Figuring this out is a little tricky because the same code here is going to run on:
- the website as a top window (tldraw-top)
- the website in an iframe  (tldraw-iframe)

We set a listener on the current window (which may be top or not) to listen for a "are-we-cool" message,
which responds "yes" with the current library version.

If we detect that we're in an iframe (i.e. that our window is not the top window) then we send this 
"are-we-cool" message to the parent window. If we get back the "yes" + version message, then that means
the iframe is embedded inside of another tldraw window, and so we can show the contents of the iframe.

If we don't get a message back in time, then that means the iframe is embedded in a not-allowed website, 
and we should show an annoying messsage.

If we're not in an iframe, we don't need to do anything.
*/

// Which routes do we allow to be embedded in tldraw.com itself?
const WHITELIST_CONTEXT = ['public-multiplayer', 'public-readonly', 'public-snapshot']
const EXPECTED_QUESTION = 'are we cool?'
const EXPECTED_RESPONSE = 'yes' + version

const isInIframe = () => {
	return typeof window !== 'undefined' && (window !== window.top || window.self !== window.parent)
}

export function IFrameProtector({
	slug,
	context,
	children,
}: {
	slug: string
	context:
		| 'public-multiplayer'
		| 'public-readonly'
		| 'public-snapshot'
		| 'history-snapshot'
		| 'history'
		| 'local'
	children: ReactNode
}) {
	const [embeddedState, setEmbeddedState] = useState<
		'iframe-unknown' | 'iframe-not-allowed' | 'not-iframe' | 'iframe-ok'
	>(isInIframe() ? 'iframe-unknown' : 'not-iframe')

	const url = useUrl()

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		let timeout: any | undefined

		function handleMessageEvent(event: MessageEvent) {
			if (!event.source) return

			if (event.data === EXPECTED_QUESTION) {
				if (!isInIframe()) {
					// If _we're_ in an iframe, then we don't want to show a nested
					// iframe, even if we're on a whitelisted host / context
					event.source.postMessage(EXPECTED_RESPONSE)
				}
			}

			if (event.data === EXPECTED_RESPONSE) {
				// todo: check the origin?
				setEmbeddedState('iframe-ok')
				clearTimeout(timeout)
			}
		}

		window.addEventListener('message', handleMessageEvent, false)

		if (embeddedState === 'iframe-unknown') {
			// We iframe embeddings on multiplayer or readonly
			if (WHITELIST_CONTEXT.includes(context)) {
				window.parent.postMessage(EXPECTED_QUESTION, '*') // todo: send to a specific origin?
				timeout = setTimeout(() => {
					setEmbeddedState('iframe-not-allowed')
					trackAnalyticsEvent('connect_to_room_in_iframe', { slug, context })
				}, 1000)
			} else {
				// We don't allow iframe embeddings on other routes
				setEmbeddedState('iframe-not-allowed')
			}
		}

		return () => {
			clearTimeout(timeout)
			window.removeEventListener('message', handleMessageEvent)
		}
	}, [embeddedState, slug, context])

	if (embeddedState === 'iframe-unknown') {
		// We're in an iframe, but we don't know if it's a tldraw iframe
		return <LoadingScreen>Loading in an iframe...</LoadingScreen>
	}

	if (embeddedState === 'iframe-not-allowed') {
		// We're in an iframe and its not one of ours
		return (
			<div className="tldraw__editor tl-container">
				<div className="iframe-warning__container">
					<a className="iframe-warning__link" href={url} target="_blank">
						{'Visit this page on tldraw.com'}
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
