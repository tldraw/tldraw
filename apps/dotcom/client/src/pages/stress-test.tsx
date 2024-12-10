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
		}, 5000)
		return () => clearInterval(interval)
	}, [coordinatorUrl, accessToken])

	if (!state) {
		return <div>Loading...</div>
	}

	const handleStart = async () => {
		const res = await fetch(coordinatorUrl + '/first-one/start', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})
		if (res.ok) {
			console.info('test started')
		}
	}
	const handleStop = async () => {
		const res = await fetch(coordinatorUrl + '/first-one/stop', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		})
		if (res.ok) {
			console.info('test stopped')
		}
	}

	return (
		<div>
			<pre>{JSON.stringify(state, null, 2)}</pre>
			<button onClick={handleStart}>Start test</button>
			<button onClick={handleStop}>Stop test</button>
		</div>
	)
}
