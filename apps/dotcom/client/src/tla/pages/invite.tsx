import { useEffect } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { DefaultSpinner } from 'tldraw'
import { routes } from '../../routeDefs'
import { useMaybeApp } from '../hooks/useAppState'

export function Component() {
	const { token } = useParams<{ token: string }>()
	const [searchParams] = useSearchParams()
	const app = useMaybeApp()
	const isAccepting = searchParams.get('accept') === 'true'

	useEffect(() => {
		if (app && isAccepting && token) {
			app.acceptGroupInvite(token)
		}
	}, [isAccepting, app, token])

	// allow the app to do the redirect
	if (app && isAccepting && token)
		return (
			<div
				style={{
					position: 'fixed',
					inset: 0,
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<DefaultSpinner />
			</div>
		)

	return <Navigate to={routes.tlaRoot()} state={{ inviteSecret: token }} replace />
}
