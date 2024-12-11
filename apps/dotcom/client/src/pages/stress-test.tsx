/* eslint-disable no-console */
import { STCoordinatorState } from '@tldraw/dotcom-shared'
import { useEffect, useState } from 'react'
import { fetch, getFromLocalStorage, setInLocalStorage, uniqueId } from 'tldraw'

function useLocalValue(key: string, initialValue: string) {
	const [value, setValue] = useState(getFromLocalStorage(key) ?? initialValue)

	useEffect(() => {
		if (!value) {
			const newValue = window.prompt(`Enter ${key.replace('_', ' ')}`) ?? ''
			setValue(newValue)
		} else {
			setInLocalStorage(key, value)
		}
	}, [value, key])

	return [value, setValue] as const
}

export function Component() {
	const [state, setState] = useState(null as null | STCoordinatorState)
	const [coordinatorUrl] = useLocalValue('st_coordinator_url', '')
	const [accessToken] = useLocalValue('st_access_token', '')
	const [uri] = useLocalValue('st_uri', '')

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
			body: JSON.stringify({ uri }),
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
			body: JSON.stringify({ uri }),
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
