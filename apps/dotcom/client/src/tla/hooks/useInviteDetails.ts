import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetch } from 'tldraw'

export function useInviteDetails() {
	const location = useLocation()
	const [inviteInfo, setInviteInfo] = useState<GetInviteInfoResponseBody | null>(null)

	useEffect(() => {
		const inviteSecret = location.state?.inviteSecret

		if (inviteSecret) {
			const fetchInviteInfo = async () => {
				try {
					const response = await fetch(`/api/app/invite/${inviteSecret}`)
					const data: GetInviteInfoResponseBody = await response.json()
					setInviteInfo(data)
				} catch (error) {
					console.error('Failed to fetch invite info:', error)
					setInviteInfo({ error: true, message: 'Failed to load invite details' })
				}
			}

			fetchInviteInfo()
		}
	}, [location])

	return inviteInfo
}
