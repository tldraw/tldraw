import { GetServerTimeResponseBody } from '@tldraw/dotcom-shared'
import { useEffect, useState } from 'react'
import { fetch } from 'tldraw'

export function useGetServerOffset() {
	const [serverOffset, setServerOffset] = useState<number>(0)

	useEffect(() => {
		async function getServerTime() {
			const t0 = Date.now()
			const response = await fetch('/api/server-time')
			const t3 = Date.now()
			if (!response.ok) return

			const { serverTime: t1 } = (await response.json()) as GetServerTimeResponseBody
			// We don't have a better time for this. The date header of the reponse is in seconds, so it's not precise enough
			const t2 = t1
			// NTP Clock_synchronization_algorithm
			// https://en.wikipedia.org/wiki/Network_Time_Protocol#Clock_synchronization_algorithm
			const serverOffset = (t1 - t0 + t2 - t3) / 2
			setServerOffset(serverOffset)
		}
		getServerTime()
	}, [])

	return serverOffset
}
