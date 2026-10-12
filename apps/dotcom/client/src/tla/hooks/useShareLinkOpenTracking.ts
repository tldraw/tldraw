import { getFromSessionStorage, setInSessionStorage } from 'tldraw'
import { TldrawApp } from '../app/TldrawApp'
import { useTldrawAppUiEvents } from '../utils/app-ui-events'
import { SESSION_STORAGE_KEYS } from '../utils/session-storage'

export function useShareLinkOpenTracking() {
	const trackEvent = useTldrawAppUiEvents()

	return (app: TldrawApp | null, fileId: string, isEmbed: boolean) => {
		// An embed load is a host-page view, not a link follow.
		if (isEmbed) return

		if (app) {
			const file = app.getFile(fileId)
			const ownedByMyWorkspace =
				file && (file.owningGroupId == null || app.getWorkspaceMembership(file.owningGroupId))
			if (ownedByMyWorkspace) return
		}

		// Once per tab session: signing in from the board remounts the editor.
		const key = `${SESSION_STORAGE_KEYS.SHARE_LINK_OPENED}:${fileId}`
		if (getFromSessionStorage(key)) return
		setInSessionStorage(key, '1')

		trackEvent('open-share-link', { source: 'app' })
	}
}
