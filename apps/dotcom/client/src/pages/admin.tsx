import { TlaFile, ZStoreData } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { fetch } from 'tldraw'
import { TlaButton } from '../tla/components/TlaButton/TlaButton'
import { useTldrawUser } from '../tla/hooks/useUser'
import styles from './admin.module.css'

// Helper component for structured data display
function StructuredDataDisplay({ data }: { data: ZStoreData }) {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch (err) {
			console.error('Failed to copy:', err)
		}
	}

	return (
		<div className={styles.structuredData}>
			<TlaButton onClick={handleCopy} variant="secondary" className={styles.copyButton}>
				{copied ? 'Copied!' : 'Copy JSON'}
			</TlaButton>
			<pre className={styles.dataDisplay}>{JSON.stringify(data, null, 2)}</pre>
		</div>
	)
}

// Helper component for user data summary
function UserDataSummary({ data }: { data: ZStoreData }) {
	const getUserInfo = () => {
		const user = data.user[0]
		const files = data.file || []
		const deletedFiles = files.filter((f: TlaFile) => f.isDeleted)
		const activeFiles = files.filter((f: TlaFile) => !f.isDeleted)

		return {
			name: user?.name || 'Unknown',
			email: user?.email || 'No email',
			activeFiles: activeFiles.length,
			deletedFiles: deletedFiles.length,
		}
	}

	const info = getUserInfo()

	return (
		<div className={styles.userSummary}>
			<div className={styles.summaryGrid}>
				<div className={styles.summaryItem}>
					<span className={styles.fieldLabel}>Name:</span>
					<span className={styles.fieldValue}>{info.name}</span>
				</div>
				<div className={styles.summaryItem}>
					<span className={styles.fieldLabel}>Email:</span>
					<span className={styles.fieldValue}>{info.email}</span>
				</div>
				<div className={styles.summaryItem}>
					<span className={styles.fieldLabel}>Active Files:</span>
					<span className={styles.fieldValue}>{info.activeFiles}</span>
				</div>
				<div className={styles.summaryItem}>
					<span className={styles.fieldLabel}>Deleted Files:</span>
					<span className={styles.fieldValue}>{info.deletedFiles}</span>
				</div>
			</div>
		</div>
	)
}

export function Component() {
	const user = useTldrawUser()
	const [data, setData] = useState<any>(null)
	const [error, setError] = useState(null as string | null)
	const [replicatorData, setReplicatorData] = useState(null)
	const [isRebooting, setIsRebooting] = useState(false)
	const [successMessage, setSuccessMessage] = useState(null as string | null)
	const inputRef = useRef<HTMLInputElement>(null)

	const loadData = useCallback(async () => {
		const q = inputRef.current?.value?.trim() ?? ''
		if (!q) {
			setError('Please enter an email or ID')
			return
		}

		setError(null)
		setSuccessMessage(null)

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
		if (!q) {
			setError('Please enter an email or ID')
			return
		}

		setIsRebooting(true)
		setError(null)
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
			setSuccessMessage('User rebooted successfully')
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

	// Clear success message after 3 seconds
	useEffect(() => {
		if (successMessage) {
			const timer = setTimeout(() => setSuccessMessage(null), 3000)
			return () => clearTimeout(timer)
		}
	}, [successMessage])

	if (!user?.isTldraw) {
		return <Navigate to="/" replace />
	}

	return (
		<div className={styles.adminContainer}>
			<header className={styles.adminHeader}>
				<h1 className="tla-text_ui__big">Admin Panel</h1>
			</header>

			<main className={styles.adminContent}>
				{/* User Search Section */}
				<section className={styles.adminSection}>
					<h2 className="tla-text_ui__title">User Management</h2>
					<div className={styles.searchContainer}>
						<input
							ref={inputRef}
							type="text"
							placeholder="Email or ID"
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									loadData()
								}
							}}
							className={styles.searchInput}
						/>
						<TlaButton onClick={loadData} variant="primary">
							Find User
						</TlaButton>
					</div>
					{error && <div className={styles.errorMessage}>{error}</div>}
					{successMessage && <div className={styles.successMessage}>{successMessage}</div>}
				</section>

				{/* User Data Section */}
				{data && (
					<section className={styles.adminSection}>
						<h3 className="tla-text_ui__title">User Data</h3>
						<UserDataSummary data={data} />
						<div className={styles.userActions}>
							<TlaButton
								onClick={() => {
									navigator.clipboard.writeText(JSON.stringify(data, null, 2))
									setSuccessMessage('User data copied to clipboard')
								}}
								variant="secondary"
							>
								Copy Data
							</TlaButton>
							<TlaButton
								disabled={isRebooting}
								onClick={doReboot}
								variant="warning"
								isLoading={isRebooting}
							>
								Force Reboot
							</TlaButton>
						</div>
						<StructuredDataDisplay data={data} />
					</section>
				)}

				{/* System Data Section */}
				{replicatorData && (
					<section className={styles.adminSection}>
						<h3 className="tla-text_ui__title">System Health</h3>
						<StructuredDataDisplay data={replicatorData} />
					</section>
				)}

				{/* File Operations Section */}
				<section className={styles.adminSection}>
					<h3 className="tla-text_ui__title">File Operations</h3>
					<div className={styles.fileOperations}>
						<DownloadTldrFile legacy={false} />
						<DownloadTldrFile legacy={true} />
						<CreateLegacyFile />
					</div>
				</section>

				{/* Danger Zone Section */}
				<section className={styles.adminSection}>
					<h3 className="tla-text_ui__title">Danger Zone</h3>
					<HardDeleteFile />
					<DeleteUser />
				</section>
			</main>
		</div>
	)
}

function HardDeleteFile() {
	const inputRef = useRef<HTMLInputElement>(null)
	const [error, setError] = useState(null as string | null)
	const [successMessage, setSuccessMessage] = useState(null as string | null)

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
		setSuccessMessage(null)
		const res = await fetch(`/api/app/admin/hard_delete_file/${fileId}`, {
			method: 'POST',
		})
		if (!res.ok) {
			setError(res.statusText + ': ' + (await res.text()))
			return
		} else {
			setSuccessMessage('File deleted successfully! 🧹')
			inputRef.current!.value = ''
		}
	}, [])

	// Clear success message after 3 seconds
	useEffect(() => {
		if (successMessage) {
			const timer = setTimeout(() => setSuccessMessage(null), 3000)
			return () => clearTimeout(timer)
		}
	}, [successMessage])

	return (
		<div className={styles.dangerZone}>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{successMessage && <div className={styles.successMessage}>{successMessage}</div>}
			<div className={styles.deleteContainer}>
				<input type="text" placeholder="File ID" ref={inputRef} className={styles.searchInput} />
				<TlaButton onClick={onDelete} variant="warning" className={styles.deleteButton}>
					Delete (cannot be undone)
				</TlaButton>
			</div>
		</div>
	)
}

function CreateLegacyFile() {
	const [isCreating, setIsCreating] = useState(false)
	const [successMessage, setSuccessMessage] = useState(null as string | null)

	const handleCreate = useCallback(async () => {
		setIsCreating(true)
		setSuccessMessage(null)
		try {
			const res = await fetch(`/api/app/admin/create_legacy_file`, { method: 'POST' })
			const { slug } = await res.json()
			window.open(`/r/${slug}`, '_blank')?.focus()
		} catch (err) {
			console.error('Failed to create legacy file:', err)
		} finally {
			setIsCreating(false)
		}
	}, [])

	// Clear success message after 3 seconds
	useEffect(() => {
		if (successMessage) {
			const timer = setTimeout(() => setSuccessMessage(null), 3000)
			return () => clearTimeout(timer)
		}
	}, [successMessage])

	return (
		<div className={styles.fileOperation}>
			{successMessage && <div className={styles.successMessage}>{successMessage}</div>}
			<TlaButton onClick={handleCreate} variant="secondary" isLoading={isCreating}>
				Create Legacy File
			</TlaButton>
		</div>
	)
}

function DownloadTldrFile({ legacy }: { legacy: boolean }) {
	const inputRef = useRef<HTMLInputElement>(null)
	const [error, setError] = useState(null as string | null)
	const [isDownloading, setIsDownloading] = useState(false)
	const [successMessage, setSuccessMessage] = useState(null as string | null)

	const onDownload = useCallback(async () => {
		setError(null)
		setSuccessMessage(null)
		const fileSlug = inputRef.current?.value
		if (!fileSlug) {
			setError('Please enter a file slug')
			return
		}
		const path = legacy ? 'download-legacy-tldr' : 'download-tldr'

		setIsDownloading(true)
		try {
			const res = await fetch(`/api/app/admin/${path}/${fileSlug}`)
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
		} finally {
			setIsDownloading(false)
		}
	}, [legacy])

	// Clear success message after 3 seconds
	useEffect(() => {
		if (successMessage) {
			const timer = setTimeout(() => setSuccessMessage(null), 3000)
			return () => clearTimeout(timer)
		}
	}, [successMessage])

	return (
		<div className={styles.fileOperation}>
			<h4 className="tla-text_ui__medium">
				{legacy ? 'Download Legacy .tldr File' : 'Download .tldr File'}
			</h4>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{successMessage && <div className={styles.successMessage}>{successMessage}</div>}
			<div className={styles.downloadContainer}>
				<input type="text" placeholder="File ID" ref={inputRef} className={styles.searchInput} />
				<TlaButton onClick={onDownload} variant="primary" isLoading={isDownloading}>
					Download
				</TlaButton>
			</div>
		</div>
	)
}

function DeleteUser() {
	const inputRef = useRef<HTMLInputElement>(null)
	const [isDeleting, setIsDeleting] = useState(false)
	const [progressLog, setProgressLog] = useState<string[]>([])
	const [error, setError] = useState(null as string | null)
	const [isComplete, setIsComplete] = useState(false)

	const onDelete = useCallback(async () => {
		const userId = inputRef.current?.value?.trim()
		if (!userId) {
			setError('Please enter a user ID or email')
			return
		}

		if (
			!window.confirm(
				`Are you sure you want to permanently delete user "${userId}"? This action cannot be undone and will delete all their files, data, and account.`
			)
		) {
			return
		}

		setIsDeleting(true)
		setError(null)
		setProgressLog([]) // Only clear log when starting a new deletion
		setIsComplete(false)

		try {
			const eventSource = new EventSource(
				`/api/app/admin/delete_user_sse?q=${encodeURIComponent(userId)}`
			)

			eventSource.onmessage = (event) => {
				const data = JSON.parse(event.data)

				const timestamp = new Date(data.timestamp).toLocaleTimeString()
				const logEntry = `[${timestamp}] ${data.message}`

				setProgressLog((prev) => [...prev, logEntry])

				if (data.type === 'complete') {
					setIsComplete(true)
					setIsDeleting(false)
					eventSource.close()
				} else if (data.type === 'error') {
					setError(data.message)
					setIsDeleting(false)
					eventSource.close()
				}
			}

			eventSource.onerror = () => {
				setError('Connection failed')
				setIsDeleting(false)
				eventSource.close()
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error occurred')
			setIsDeleting(false)
		}
	}, [])

	return (
		<div className={styles.dangerZone}>
			<h4>Delete User</h4>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{isComplete && <div className={styles.successMessage}>User deleted successfully! 🧹</div>}

			<div className={styles.deleteContainer}>
				<input
					type="text"
					placeholder="User ID or Email"
					ref={inputRef}
					className={styles.searchInput}
					disabled={isDeleting}
				/>
				<TlaButton
					onClick={onDelete}
					variant="warning"
					className={styles.deleteButton}
					disabled={isDeleting}
					isLoading={isDeleting}
				>
					{isDeleting ? 'Deleting...' : 'Delete User (cannot be undone)'}
				</TlaButton>
			</div>

			{/* Progress Log */}
			{progressLog.length > 0 && (
				<div className={styles.progressLog}>
					<h5>Deletion Progress:</h5>
					<div className={styles.logContainer}>
						{progressLog.map((log, index) => (
							<div key={index} className={styles.logEntry}>
								{log}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
