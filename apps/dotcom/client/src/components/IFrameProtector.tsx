import { ReactNode, useEffect } from 'react'
import { useUrl } from '../hooks/useUrl'
import { TlaIcon } from '../tla/components/TlaIcon/TlaIcon'
import { trackEvent } from '../utils/analytics'
import { getParentOrigin, isInIframe } from '../utils/iFrame'

export const ROOM_CONTEXT = {
	PUBLIC_MULTIPLAYER: 'public-multiplayer',
	PUBLIC_READONLY: 'public-readonly',
	PUBLIC_SNAPSHOT: 'public-snapshot',
	HISTORY_SNAPSHOT: 'history-snapshot',
	HISTORY: 'history',
	LOCAL: 'local',
} as const
type $ROOM_CONTEXT = (typeof ROOM_CONTEXT)[keyof typeof ROOM_CONTEXT]

const EMBEDDED_STATE = {
	IFRAME_OK: 'iframe-ok',
	IFRAME_NOT_ALLOWED: 'iframe-not-allowed',
	NOT_IFRAME: 'not-iframe',
} as const

// Which routes do we allow to be embedded
const WHITELIST_CONTEXT: $ROOM_CONTEXT[] = [
	ROOM_CONTEXT.PUBLIC_MULTIPLAYER,
	ROOM_CONTEXT.PUBLIC_READONLY,
	ROOM_CONTEXT.PUBLIC_SNAPSHOT,
]

function getEmbeddedState(context: $ROOM_CONTEXT) {
	if (!isInIframe()) return EMBEDDED_STATE.NOT_IFRAME

	return WHITELIST_CONTEXT.includes(context)
		? EMBEDDED_STATE.IFRAME_OK
		: EMBEDDED_STATE.IFRAME_NOT_ALLOWED
}

export function IFrameProtector({
	slug,
	context,
	children,
}: {
	slug: string
	context: $ROOM_CONTEXT
	children: ReactNode
}) {
	const embeddedState = getEmbeddedState(context)

	const url = useUrl()

	useEffect(() => {
		if (embeddedState === EMBEDDED_STATE.IFRAME_NOT_ALLOWED) {
			trackEvent('connect_to_room_in_iframe', {
				slug,
				context,
				origin: getParentOrigin(),
			})
		}
	}, [embeddedState, slug, context])

	if (embeddedState === EMBEDDED_STATE.IFRAME_NOT_ALLOWED) {
		// We're in an iframe and its not one of ours.
		return (
			<div className="tldraw__editor tl-container">
				<div className="iframe-warning__container">
					<a className="iframe-warning__link" href={url} rel="noopener noreferrer" target="_blank">
						{'Visit this page on tldraw.com'}
						<TlaIcon icon="external" inline />
					</a>
				</div>
			</div>
		)
	}

	return children
}
