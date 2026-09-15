import { getFromSessionStorage, setInSessionStorage } from 'tldraw'
import { TldrawApp } from '../app/TldrawApp'
import { useTldrawAppUiEvents } from '../utils/app-ui-events'
import { SESSION_STORAGE_KEYS } from '../utils/session-storage'

/**
 * Sends `open-share-link` to PostHog when a visitor loads a file that none of their workspaces
 * own — the only way to reach such a file is a link someone shared. Anonymous visitors always
 * qualify (PostHog's `is_signed_in` separates them). Fires once per file per tab session so
 * that a reload, or signing in from the board (which remounts the editor in place or via an
 * OAuth redirect), doesn't count the same link twice. Embeds are skipped: an iframe load is a
 * host-page view, not a link follow.
 */
export function useShareLinkOpenTracking() {
	const trackEvent = useTldrawAppUiEvents()

	return (app: TldrawApp | null, fileId: string, isEmbed: boolean) => {
		if (isEmbed) return

		if (app) {
			const file = app.getFile(fileId)
			// Same test the sidebar uses to list a file under home as a guest file (see
			// TldrawApp.getWorkspaceFilesSorted). A file that isn't in the user's workspace data
			// yet is treated as external: on a first visit its home link only exists after
			// onEnterFile runs.
			const ownedByMyWorkspace =
				file && (file.owningGroupId == null || app.getWorkspaceMembership(file.owningGroupId))
			if (ownedByMyWorkspace) return
		}

		const key = `${SESSION_STORAGE_KEYS.SHARE_LINK_OPENED}:${fileId}`
		if (getFromSessionStorage(key)) return
		setInSessionStorage(key, '1')

		trackEvent('open-share-link', { source: 'app' })
	}
}
