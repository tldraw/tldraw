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
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				overflow: 'scroll',
				userSelect: 'text',
				padding: '16px',
				gap: '16px',
			}}
		>
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
			{replicatorData && (
				<pre style={{ userSelect: 'text' }}>{JSON.stringify(replicatorData, null, 2)}</pre>
			)}
			<div>
				<h2>User data</h2>
				{data && <pre style={{ userSelect: 'text' }}>{JSON.stringify(data, null, 2)}</pre>}
			</div>
			<DownloadTldrFile />
			<CreateLegacyFile />
			<HardDeleteFile />
		</div>
	)
}

function HardDeleteFile() {
	const inputRef = useRef<HTMLInputElement>(null)
	const [error, setError] = useState(null as string | null)
	const onDelete = useCallback(async () => {
		const fileId = inputRef.current?.value
		if (!fileId) {
			setError('Please enter a file ID')
			return
		}

		if (
			!window.confirm(
				`Are you sure you want to permanently delete file ${fileId}? This action cannot be undone.`
			)
		) {
			return
		}

		setError(null)
		const res = await fetch(`/api/app/admin/hard_delete_file/${fileId}`, {
			method: 'POST',
		})
		if (!res.ok) {
			setError(res.statusText + ': ' + (await res.text()))
			return
		} else {
			alert('File deleted! 🧹')
		}
	}, [])
	return (
		<div>
			<h2>Hard delete file</h2>
			{error && <div style={{ color: 'red' }}>{error}</div>}
			<div style={{ display: 'flex', gap: '8px' }}>
				<input type="text" placeholder="file id" ref={inputRef} />
				<button
					onClick={onDelete}
					style={{ border: 'none', backgroundColor: '#ff4444', color: 'white' }}
				>
					Delete (cannot be undone)
				</button>
			</div>
		</div>
	)
}

function CreateLegacyFile() {
	return (
		<div>
			<h2>Create legacy file</h2>
			<button
				onClick={() =>
					fetch(`/api/app/admin/create_legacy_file`, { method: 'POST' })
						.then((res) => res.json())
						.then(({ slug }) => window.open(`/r/${slug}`, '_blank')?.focus())
				}
			>
				Create legacy file
			</button>
		</div>
	)
}

function DownloadTldrFile() {
	const inputRef = useRef<HTMLInputElement>(null)
	const [error, setError] = useState(null as string | null)
	const onDownload = useCallback(async () => {
		setError(null)
		const fileSlug = inputRef.current?.value
		if (!fileSlug) {
			setError('Please enter a file slug')
			return
		}

		const res = await fetch(`/api/app/admin/download-tldr/${fileSlug}`)
		if (!res.ok) {
			setError(res.statusText + ': ' + (await res.text()))
			return
		}

		// Create a blob from the response and trigger download
		const blob = await res.blob()
		const url = window.URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `${fileSlug}.tldr`
		document.body.appendChild(a)
		a.click()
		window.URL.revokeObjectURL(url)
		document.body.removeChild(a)
	}, [])
	return (
		<div>
			<h2>Download .tldr file</h2>
			{error && <div style={{ color: 'red' }}>{error}</div>}
			<div style={{ display: 'flex', gap: '8px' }}>
				<input type="text" placeholder="file id" ref={inputRef} />
				<button onClick={onDownload}>Download</button>
			</div>
		</div>
	)
}
