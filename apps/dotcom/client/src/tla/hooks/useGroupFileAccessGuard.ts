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
 * The signal is losing *membership*, not the file going away. We remember the
 * group a file belongs to (keyed to its slug, so navigating between files never
 * trips it) and only redirect once that file is no longer visible *and* we're no
 * longer a member of its group. Deleting the file you're on, or any other reason
 * the file disappears while your membership stands, is left to the normal flows.
 */
export function useGroupFileAccessGuard(app: TldrawApp | null | undefined, fileSlug: string) {
	const navigate = useNavigate()
	const lastSeenRef = useRef<{ fileSlug: string; groupId: string } | null>(null)

	const lostAccessTitle = useMsg(messages.lostAccessTitle)
	const lostAccessDescription = useMsg(messages.lostAccessDescription)

	const lostAccess = useValue(
		'lostGroupFileAccess',
		() => {
			if (!app) return false
			const file = app.getFile(fileSlug)
			if (file?.owningGroupId) {
				// We can still see the file through one of our memberships.
				lastSeenRef.current = { fileSlug, groupId: file.owningGroupId }
				return false
			}
			// The file isn't visible. Only treat this as lost access if we'd seen it
			// through a group membership for *this* file and that membership is gone.
			const lastSeen = lastSeenRef.current
			return (
				!!lastSeen && lastSeen.fileSlug === fileSlug && !app.getGroupMembership(lastSeen.groupId)
			)
		},
		[app, fileSlug]
	)

	useEffect(() => {
		if (!lostAccess) return
		app?.toasts?.addToast({
			severity: 'info',
			title: lostAccessTitle,
			description: lostAccessDescription,
		})
		navigate(routes.tlaRoot())
	}, [lostAccess, app, navigate, lostAccessTitle, lostAccessDescription])
}
