import { FeatureFlagValue, TlaFile, TlaUser, userHasFlag, ZStoreData } from '@tldraw/dotcom-shared'
import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { fetch } from 'tldraw'
import { TlaButton } from '../tla/components/TlaButton/TlaButton'
import { useTldrawUser } from '../tla/hooks/useUser'
import styles from './admin.module.css'
import { saveMigrationLog } from './migrationLogsDB'

// Helper component for structured data display.
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
								className={styles.userActionButton}
							>
								Force Reboot
							</TlaButton>
						</div>
						<MigrateUserToGroups
							inputRef={inputRef}
							onSuccess={loadData}
							onError={setError}
							onSuccessMessage={setSuccessMessage}
							didMigrate={userHasFlag((data.user[0] as TlaUser).flags, 'groups_backend')}
						/>
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

				{/* Batch Migration Section */}
				<section className={styles.adminSection}>
					<h3 className="tla-text_ui__title">Batch Migration</h3>
					<BatchMigrateUsersToGroups />
				</section>

				{/* Feature Flags Section */}
				<section className={styles.adminSection}>
					<h3 className="tla-text_ui__title">Feature Flags</h3>
					<FeatureFlags />
				</section>

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

function FeatureFlags() {
	const [flags, setFlags] = useState<Record<string, FeatureFlagValue>>({})
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState(null as string | null)
	const [successMessage, setSuccessMessage] = useState(null as string | null)

	const loadFlags = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/app/admin/feature-flags')
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			const data = await res.json()
			setFlags(data)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load flags')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		loadFlags()
	}, [loadFlags])

	const toggleFlag = useCallback(async (flag: string, enabled: boolean) => {
		const action = enabled ? 'enable' : 'disable'
		if (!window.confirm(`Are you sure you want to ${action} "${flag}" for ALL users?`)) {
			return
		}

		setIsSaving(true)
		setError(null)
		setSuccessMessage(null)
		try {
			const res = await fetch('/api/app/admin/feature-flags', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ flag, enabled }),
			})
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			setFlags((prev) => ({ ...prev, [flag]: { ...prev[flag], enabled } }))
			setSuccessMessage(`${flag} ${enabled ? 'enabled' : 'disabled'}`)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update flag')
		} finally {
			setIsSaving(false)
		}
	}, [])

	useEffect(() => {
		if (successMessage) {
			const timer = setTimeout(() => setSuccessMessage(null), 3000)
			return () => clearTimeout(timer)
		}
	}, [successMessage])

	return (
		<div className={styles.fileOperation}>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{successMessage && <div className={styles.successMessage}>{successMessage}</div>}

			<p className={`tla-text_ui__small ${styles.featureFlagsNote}`}>
				<strong>Global feature toggles.</strong> Changes take effect immediately for ALL users.
			</p>
			<p className={`tla-text_ui__small ${styles.featureFlagsDescription}`}>
				Unchecking these flags will completely disable the feature for everyone, regardless of their
				individual access settings.
			</p>

			{isLoading ? (
				<p className="tla-text_ui__small">Loading flags...</p>
			) : (
				<div className={styles.featureFlagsContainer}>
					{Object.entries(flags)
						.sort(([a], [b]) => a.localeCompare(b))
						.map(([flagName, flagValue]) => {
							const label = flagName
								.split('_')
								.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
								.join(' ')
							return (
								<div key={flagName} className={styles.featureFlagItem}>
									<label htmlFor={flagName} className={styles.featureFlagLabel}>
										<input
											id={flagName}
											type="checkbox"
											checked={flagValue.enabled}
											onChange={(e) => toggleFlag(flagName, e.target.checked)}
											disabled={isSaving}
										/>
										<span className="tla-text_ui__small">
											<strong>{label}</strong>
										</span>
									</label>
									{flagValue.description && (
										<span className={`tla-text_ui__small ${styles.featureFlagsDescription}`}>
											{flagValue.description}
										</span>
									)}
								</div>
							)
						})}
				</div>
			)}
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

function MigrateUserToGroups({
	inputRef,
	onSuccess,
	onError,
	onSuccessMessage,
	didMigrate,
}: {
	inputRef: RefObject<HTMLInputElement | null>
	onSuccess(): void
	onError(error: string): void
	onSuccessMessage(message: string): void
	didMigrate: boolean
}) {
	const [isMigrating, setIsMigrating] = useState(false)

	const handleMigrate = useCallback(async () => {
		const q = inputRef.current?.value?.trim() ?? ''
		if (!q) {
			onError('Please enter an email or ID')
			return
		}

		if (
			!window.confirm(
				`Are you sure you want to migrate user "${q}" to the groups backend? This action cannot be undone.`
			)
		) {
			return
		}

		setIsMigrating(true)
		onError('')

		try {
			const res = await fetch(`/api/app/admin/user/migrate?${new URLSearchParams({ q })}`, {
				method: 'POST',
			})

			if (!res.ok) {
				onError(res.statusText + ': ' + (await res.text()))
				return
			}

			const result = await res.json()
			onSuccessMessage(
				`User migrated successfully! Files: ${result.files_migrated}, Pinned: ${result.pinned_files_migrated}`
			)
			onSuccess()
		} catch (err) {
			onError(err instanceof Error ? err.message : 'Migration failed')
		} finally {
			setIsMigrating(false)
		}
	}, [inputRef, onError, onSuccess, onSuccessMessage])

	return didMigrate ? null : (
		<div className={styles.migrationSection}>
			<h4 className="tla-text_ui__medium">Migrate User to Groups Backend</h4>
			<p className="tla-text_ui__small">
				Migrate this user from the legacy file_state model to the new groups model.
			</p>
			<TlaButton
				onClick={handleMigrate}
				variant="primary"
				disabled={isMigrating}
				isLoading={isMigrating}
			>
				{isMigrating ? 'Migrating...' : 'Migrate to Groups'}
			</TlaButton>
		</div>
	)
}

function BatchMigrateUsersToGroups() {
	const [isMigrating, setIsMigrating] = useState(false)
	const [progressLog, setProgressLog] = useState<string[]>([])
	const [error, setError] = useState(null as string | null)
	const [isComplete, setIsComplete] = useState(false)
	const [stats, setStats] = useState(
		{} as {
			successCount: number
			failureCount: number
			totalUsers: number
			usersToMigrate: number
			progress: number
		}
	)
	const [unmigratedCount, setUnmigratedCount] = useState<number | null>(null)
	const [isLoadingCount, setIsLoadingCount] = useState(false)
	const [eventSource, setEventSource] = useState<EventSource | null>(null)
	const [sleepMs, setSleepMs] = useState(100)
	const logContainerRef = useRef<HTMLDivElement>(null)
	const shouldContinueRef = useRef(true)

	// Cleanup EventSource on unmount
	useEffect(() => {
		return () => {
			if (eventSource) {
				eventSource.close()
			}
		}
	}, [eventSource])

	// Auto-scroll log container to bottom when new entries are added
	useEffect(() => {
		if (logContainerRef.current) {
			logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
		}
	}, [progressLog])

	const fetchUnmigratedCount = useCallback(async () => {
		setIsLoadingCount(true)
		setError(null)
		try {
			const res = await fetch('/api/app/admin/unmigrated_users_count')
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			const data = await res.json()
			setUnmigratedCount(data.count)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to fetch count')
		} finally {
			setIsLoadingCount(false)
		}
	}, [])

	const stopMigration = useCallback(() => {
		shouldContinueRef.current = false
		if (eventSource) {
			eventSource.close()
			setEventSource(null)
			setIsMigrating(false)
		}
	}, [eventSource])

	const onMigrate = useCallback(async () => {
		const migrationMessage = `Are you sure you want to migrate ALL users without the groups_backend flag? This action cannot be undone.`

		if (!window.confirm(migrationMessage)) {
			return
		}

		setIsMigrating(true)
		shouldContinueRef.current = true
		setError(null)
		setProgressLog([])
		setIsComplete(false)
		setStats({ successCount: 0, failureCount: 0, totalUsers: 0, usersToMigrate: 0, progress: 0 })

		const startBatch = () => {
			return new Promise<void>((resolve, reject) => {
				try {
					const params = new URLSearchParams({
						sleepMs: sleepMs.toString(),
					})
					const es = new EventSource(`/api/app/admin/migrate_users_batch?${params}`)
					setEventSource(es)

					es.onmessage = async (event) => {
						const data = JSON.parse(event.data)

						const timestamp = new Date(data.timestamp).toLocaleTimeString()
						const logEntry = `[${timestamp}] ${data.message}`

						// Keep only the last 500 log entries to prevent memory issues
						setProgressLog((prev) => {
							const updated = [...prev, logEntry]
							return updated.length > 500 ? updated.slice(-500) : updated
						})

						// Save failure events to IndexedDB
						if (data.step === 'failure') {
							try {
								await saveMigrationLog(data)
							} catch (err) {
								console.error('Failed to save migration log to IndexedDB:', err)
							}
						}

						// Update stats from details
						if (data.details) {
							setStats(data.details)
						}

						if (data.type === 'complete') {
							es.close()
							setEventSource(null)
							if (data.hasMore && shouldContinueRef.current) {
								// Start next batch
								setTimeout(() => startBatch().then(resolve).catch(reject), 100)
							} else {
								setIsComplete(true)
								setIsMigrating(false)
								resolve()
							}
						} else if (data.type === 'error') {
							setError(data.message)
							setIsMigrating(false)
							es.close()
							setEventSource(null)
							reject(new Error(data.message))
						}
					}

					es.onerror = () => {
						setError('Connection failed')
						setIsMigrating(false)
						es.close()
						setEventSource(null)
						reject(new Error('Connection failed'))
					}
				} catch (err) {
					setError(err instanceof Error ? err.message : 'Unknown error occurred')
					setIsMigrating(false)
					setEventSource(null)
					reject(err)
				}
			})
		}

		try {
			await startBatch()
		} catch (_err) {
			// Error already handled in startBatch
		}
	}, [sleepMs])

	return (
		<div className={styles.dangerZone}>
			<h4 className="tla-text_ui__medium">Migrate All Users to Groups Backend</h4>

			{/* Unmigrated Users Count */}
			<div className={styles.countContainer}>
				<TlaButton
					onClick={fetchUnmigratedCount}
					variant="secondary"
					isLoading={isLoadingCount}
					disabled={isMigrating}
				>
					Check Unmigrated Users Count
				</TlaButton>
				{unmigratedCount !== null && (
					<span className={styles.countDisplay}>
						{unmigratedCount} user{unmigratedCount !== 1 ? 's' : ''} need migration
					</span>
				)}
			</div>

			<p className="tla-text_ui__small">
				This will migrate all users who don&apos;t have the groups_backend flag. The process will
				run sequentially (one user at a time) and report progress in real-time. Configure the sleep
				duration (milliseconds to wait between each user migration) below.
			</p>

			{error && <div className={styles.errorMessage}>{error}</div>}

			{/* Configuration Inputs */}
			<div className={styles.configContainer}>
				<div>
					<label htmlFor="sleepMs">Sleep between migrations (ms):</label>
					<input
						id="sleepMs"
						type="number"
						value={sleepMs}
						onChange={(e) => setSleepMs(Number(e.target.value))}
						disabled={isMigrating}
						min={0}
						className={`${styles.searchInput} ${styles.sleepInput}`}
					/>
				</div>
			</div>

			{/* Stats Display */}
			{stats.totalUsers > 0 && (
				<div className={styles.statsContainer}>
					<div className={styles.statItem}>
						<span className={styles.statLabel}>Total Users:</span>
						<span className={styles.statValue}>{stats.totalUsers}</span>
					</div>
					<div className={styles.statItem}>
						<span className={styles.statLabel}>Users to Migrate:</span>
						<span className={styles.statValue}>{stats.usersToMigrate}</span>
					</div>
					<div className={styles.statItem}>
						<span className={styles.statLabel}>Succeeded:</span>
						<span className={styles.statValue}>{stats.successCount}</span>
					</div>
					<div className={styles.statItem}>
						<span className={styles.statLabel}>Failed:</span>
						<span className={styles.statValue}>{stats.failureCount}</span>
					</div>
					<div className={styles.statItem}>
						<span className={styles.statLabel}>Progress:</span>
						<span className={styles.statValue}>{(stats.progress * 100).toFixed(2)}%</span>
					</div>
				</div>
			)}

			<div className={styles.deleteContainer}>
				<TlaButton
					onClick={isMigrating ? stopMigration : onMigrate}
					variant="warning"
					className={styles.deleteButton}
					disabled={!isMigrating && isLoadingCount}
				>
					{isMigrating ? 'Stop Migration' : 'Start Batch Migration'}
				</TlaButton>
			</div>

			{isComplete && (
				<div className={styles.successMessage}>
					Migration completed! {stats.successCount} user{stats.successCount !== 1 ? 's' : ''}{' '}
					migrated successfully, {stats.failureCount} failed
				</div>
			)}

			{/* Progress Log */}
			{progressLog.length > 0 && (
				<div className={styles.progressLog}>
					<h5>Migration Progress:</h5>
					<div ref={logContainerRef} className={styles.logContainer}>
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
