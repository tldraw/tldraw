import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { fetch } from 'tldraw'
import { useTldrawUser } from '../tla/hooks/useUser'

export function Component() {
	const user = useTldrawUser()
	const [data, setData] = useState(null)
	const [error, setError] = useState(null as string | null)
	const [replicatorData, setReplicatorData] = useState(null)
	const [isRebooting, setIsRebooting] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)
	const loadData = useCallback(async () => {
		const q = inputRef.current?.value?.trim() ?? ''
		const res = await fetch(`/api/app/admin/user?${new URLSearchParams({ q })}`)
		if (!res.ok) {
			setError(res.statusText + ': ' + (await res.text()))
			return
		}
		setError(null)
		setData(await res.json())
	}, [])

	const doReboot = useCallback(async () => {
		const q = inputRef.current?.value?.trim() ?? ''
		setIsRebooting(true)
		try {
			const res = await fetch(`/api/app/admin/user/reboot?${new URLSearchParams({ q })}`, {
				method: 'POST',
			})
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			setError(null)
			loadData()
		} finally {
			setIsRebooting(false)
		}
	}, [loadData])

	useEffect(() => {
		if (user?.isTldraw) {
			fetch('/api/app/admin/replicator')
				.then(async (res) => {
					if (!res.ok) {
						setError(res.statusText + ': ' + (await res.text()))
						return
					}
					setError(null)
					setReplicatorData(await res.json())
				})
				.catch((e) => {
					setError(e.message)
				})
		}
	}, [user?.isTldraw])

	if (!user?.isTldraw) {
		return <Navigate to="/" replace />
	}
	return (
		<div style={{ flex: 1, overflow: 'scroll' }}>
			<h1>Very secret admin page</h1>
			<div style={{ display: 'flex' }}>
				<input ref={inputRef} type="text" placeholder="Email or id" />
				<button onClick={loadData}>Find user</button>
			</div>
			{error && <div style={{ color: 'red' }}>{error}</div>}
			{data && (
				<>
					<button
						onClick={() => {
							navigator.clipboard.writeText(JSON.stringify(data, null, 2))
						}}
					>
						copy data to clipboard
					</button>
					<button disabled={isRebooting} onClick={doReboot}>
						force reboot
					</button>
				</>
			)}
			<h2>Replicator data</h2>
			{replicatorData && <pre>{JSON.stringify(replicatorData, null, 2)}</pre>}
			<h2>User data</h2>
			{data && <pre>{JSON.stringify(data, null, 2)}</pre>}
		</div>
	)
}
