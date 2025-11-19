import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fetch } from 'tldraw'

export function useInviteDetails() {
	const location = useLocation()
	const navigate = useNavigate()
	const [inviteInfo, setInviteInfo] = useState<GetInviteInfoResponseBody | null>(null)

	useEffect(() => {
		const inviteSecret = location.state?.inviteSecret

		if (inviteSecret) {
			const fetchInviteInfo = async () => {
				try {
					const response = await fetch(`/api/app/invite/${inviteSecret}`)
					const data: GetInviteInfoResponseBody = await response.json()
					setInviteInfo(data)

					// Clear inviteSecret from state after fetching so it doesn't persist across navigations
					const newState = { ...location.state }
					delete newState.inviteSecret
					navigate(location.pathname, { replace: true, state: newState })
				} catch (error) {
					console.error('Failed to fetch invite info:', error)
					setInviteInfo({ error: true, message: 'Failed to load invite details' })
				}
			}

			fetchInviteInfo()
		}
	}, [location, navigate])

	return inviteInfo
}
