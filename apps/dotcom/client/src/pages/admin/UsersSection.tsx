import { TlaFile, ZStoreData } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetch } from 'tldraw'
import { TlaButton } from '../../tla/components/TlaButton/TlaButton'
import { StructuredDataDisplay } from './shared'
import styles from './admin.module.css'

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

export function UsersSection() {
	const [data, setData] = useState<any>(null)
	const [error, setError] = useState(null as string | null)
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

	// Clear success message after 3 seconds
	useEffect(() => {
		if (successMessage) {
			const timer = setTimeout(() => setSuccessMessage(null), 3000)
			return () => clearTimeout(timer)
		}
	}, [successMessage])

	return (
		<>
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
							isLoading={isRebooting}
							className={styles.userActionButton}
						>
							Force Reboot
						</TlaButton>
					</div>
					<StructuredDataDisplay data={data} />
				</section>
			)}

			{/* Danger Zone Section */}
			<section className={styles.adminSection}>
				<h3 className="tla-text_ui__title">Danger Zone</h3>
				<DeleteUser />
			</section>
		</>
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
