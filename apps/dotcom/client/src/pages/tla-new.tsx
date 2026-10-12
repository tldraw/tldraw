import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { routes } from '../routeDefs'
import { useMaybeApp } from '../tla/hooks/useAppState'
import { useTldrawAppUiEvents } from '../tla/utils/app-ui-events'

export function Component() {
	const app = useMaybeApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	useEffect(() => {
		// A user who leaves /new before the mutation settles must not be yanked to the new file.
		let cancelled = false
		const createFile = async () => {
			if (!app) {
				navigate(routes.tlaRoot(), { replace: true })
				return
			}
			const res = await app.createFile()
			if (cancelled) return
			if (res.ok) {
				const { fileId } = res.value
				navigate(routes.tlaFile(fileId), { replace: true })
				trackEvent('create-file', { source: 'new-page' })
			} else {
				navigate(routes.tlaRoot(), { replace: true })
			}
		}
		createFile()
		return () => {
			cancelled = true
		}
	}, [app, navigate, trackEvent])
	return null
}
