import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useDialogs } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'
import { useWhatsNew } from '../../hooks/useWhatsNew'
import { TlaWhatsNewDialog } from '../dialogs/TlaWhatsNewDialog'

export function TlaWhatsNewAutoShowHandler() {
	const app = useMaybeApp()
	const { addDialog } = useDialogs()
	const { entries, isLoaded } = useWhatsNew()
	const location = useLocation()

	useEffect(() => {
		if (!isLoaded || !app) {
			return
		}

		// Only auto-show on file routes (/f/)
		if (!location.pathname.startsWith('/f/')) {
			return
		}

		const latestEntry = entries[0]

		if (!latestEntry || latestEntry.priority !== 'important') {
			return
		}

		const user = app.getUser()

		// Only show if user hasn't seen this version yet
		if (user && user.whatsNewSeenVersion !== latestEntry.version) {
			addDialog({ component: TlaWhatsNewDialog })
			// Mark as seen immediately
			app.z.mutate.user.updateWhatsNewSeenVersion({ version: latestEntry.version })
		}
	}, [isLoaded, entries, app, addDialog, location.pathname])

	return null
}
