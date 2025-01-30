import { TlaFileOpenState } from '@tldraw/dotcom-shared'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { routes } from '../routeDefs'
import { useApp } from '../tla/hooks/useAppState'
import { useTldrawAppUiEvents } from '../tla/utils/app-ui-events'

export function Component() {
	const app = useApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	useEffect(() => {
		const res = app.createFile()
		if (res.ok) {
			const { file } = res.value
			navigate(routes.tlaFile(file.id), { state: { mode: 'create' } satisfies TlaFileOpenState })
			trackEvent('create-file', { source: 'new-page' })
		} else {
			navigate(routes.tlaRoot())
		}
	}, [app, navigate, trackEvent])
	return null
}
