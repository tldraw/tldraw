import { STCoordinatorState } from '@tldraw/dotcom-shared'
import { useEffect, useState } from 'react'
import { fetch, getFromLocalStorage, setInLocalStorage } from 'tldraw'

export function Component() {
	const [state, setState] = useState(null as null | STCoordinatorState)
	const [coordinatorUrl, setCoordinatorUrl] = useState(
		getFromLocalStorage('st_coordinator_url') ?? ''
	)
	const [accessToken, setAccessToken] = useState(getFromLocalStorage('st_access_token') ?? '')
	useEffect(() => {
		if (!coordinatorUrl) {
			setCoordinatorUrl(window.prompt('Enter coordinator URL') ?? '')
		} else {
			setInLocalStorage('st_coordinator_url', coordinatorUrl)
		}
	}, [coordinatorUrl])
	useEffect(() => {
		if (!accessToken) {
			setAccessToken(window.prompt('Enter access token') ?? '')
		} else {
			setInLocalStorage('st_access_token', accessToken)
		}
	}, [accessToken])
	useEffect(() => {
		if (!coordinatorUrl || !accessToken) return
		const interval = setInterval(() => {
			fetch(coordinatorUrl + '/state', {
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			})
				.then((res) => res.json())
				.then(setState)
		}, 1000)
		return () => clearInterval(interval)
	}, [coordinatorUrl, accessToken])

	if (!state) {
		return <div>Loading...</div>
	}

	return (
		<div>
			<pre>{JSON.stringify(state, null, 2)}</pre>
		</div>
	)
}
