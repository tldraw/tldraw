import { useEffect, useMemo } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { DefaultSpinner, fetch } from 'tldraw'
import { routes } from '../../routeDefs'
import { useMaybeApp } from '../hooks/useAppState'

export function Component() {
	const { token } = useParams<{ token: string }>()
	const [searchParams] = useSearchParams()
	const app = useMaybeApp()
	const isAccepting = searchParams.get('accept') === 'true'

	// Memoize the state object to prevent Navigate from re-rendering infinitely
	const navigateState = useMemo(() => ({ fairyInviteToken: token }), [token])

	useEffect(() => {
		if (app && isAccepting && token) {
			const redeemInvite = async () => {
				try {
					const res = await fetch('/api/app/fairy-invite/redeem', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ inviteCode: token }),
					})
					if (res.ok) {
						window.location.href = routes.tlaRoot()
					}
				} catch (err) {
					console.error('Failed to redeem fairy invite:', err)
				}
			}
			redeemInvite()
		}
	}, [app, isAccepting, token])

	// If user clicked accept, show spinner and let app handle redirect
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

	return <Navigate to={routes.tlaRoot()} state={navigateState} replace />
}
