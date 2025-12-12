import { useCallback, useEffect, useRef, useState } from 'react'
import { fetch } from 'tldraw'
import { TlaButton } from '../../tla/components/TlaButton/TlaButton'
import styles from '../admin.module.css'
import { saveMigrationLog } from '../migrationLogsDB'

export function AdminBatchMigration() {
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

	useEffect(() => {
		return () => {
			if (eventSource) {
				eventSource.close()
			}
		}
	}, [eventSource])

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

						setProgressLog((prev) => {
							const updated = [...prev, logEntry]
							return updated.length > 500 ? updated.slice(-500) : updated
						})

						if (data.step === 'failure') {
							try {
								await saveMigrationLog(data)
							} catch (err) {
								console.error('Failed to save migration log to IndexedDB:', err)
							}
						}

						if (data.details) {
							setStats(data.details)
						}

						if (data.type === 'complete') {
							es.close()
							setEventSource(null)
							if (data.hasMore && shouldContinueRef.current) {
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
