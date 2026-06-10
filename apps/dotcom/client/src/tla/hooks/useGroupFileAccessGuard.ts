import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useValue } from 'tldraw'
import { routes } from '../../routeDefs'
import { TldrawApp } from '../app/TldrawApp'
import { defineMessages, useMsg } from '../utils/i18n'

const messages = defineMessages({
	lostAccessTitle: { defaultMessage: 'Access removed' },
	lostAccessDescription: { defaultMessage: 'You no longer have access to this file.' },
})

/**
 * Send the signed-in user back to their files when they lose access to the
 * group-owned file they're viewing — e.g. an owner removes them from the group,
 * or the group is deleted out from under them.
 *
 * `getFile` resolves a group file through the user's synced memberships, so it
 * reactively becomes null the moment their `group_user` row disappears. The
 * guard only fires once access has been confirmed (`hadAccessRef`), so it never
 * trips during the initial sync — when the file legitimately isn't loaded yet —
 * nor for shared files that were never opened through a membership.
 */
export function useGroupFileAccessGuard(app: TldrawApp | null | undefined, fileSlug: string) {
	const navigate = useNavigate()
	const hadAccessRef = useRef(false)

	const lostAccessTitle = useMsg(messages.lostAccessTitle)
	const lostAccessDescription = useMsg(messages.lostAccessDescription)

	// The group this file belongs to, as seen through our own memberships.
	const owningGroupId = useValue(
		'owningGroupForCurrentFile',
		() => app?.getFile(fileSlug)?.owningGroupId ?? null,
		[app, fileSlug]
	)

	useEffect(() => {
		if (owningGroupId) {
			hadAccessRef.current = true
		} else if (hadAccessRef.current) {
			hadAccessRef.current = false
			app?.toasts?.addToast({
				severity: 'info',
				title: lostAccessTitle,
				description: lostAccessDescription,
			})
			navigate(routes.tlaRoot())
		}
	}, [owningGroupId, app, navigate, lostAccessTitle, lostAccessDescription])
}
