/* eslint-disable no-console */
import { STCoordinatorState } from '@tldraw/dotcom-shared'
import { useEffect, useState } from 'react'
import { fetch, getFromLocalStorage, setInLocalStorage, uniqueId } from 'tldraw'

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

	const handleStart = async () => {
		const testId = uniqueId()
		const res = await fetch(coordinatorUrl + `/${testId}/start`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify({
				uri: 'http://localhost:8787',
			}),
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
			body: JSON.stringify({
				uri: 'http://localhost:8787',
			}),
		})
		if (res.ok) {
			console.info('test stopped')
		}
	}
	const events = Object.values(state.tests).flatMap((t) => t.events)

	const createEvents = events.filter((e) => e.type === 'operation' && e.operation === 'create user')

	console.log(createEvents)

	return (
		<div style={{ height: '100%', overflow: 'scroll' }}>
			<pre>{JSON.stringify(state, null, 2)}</pre>
			<button onClick={handleStart}>Start test</button>
			<button onClick={handleStop}>Stop test</button>
		</div>
	)
}
