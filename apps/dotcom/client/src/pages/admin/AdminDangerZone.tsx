import { useCallback, useEffect, useRef, useState } from 'react'
import { fetch } from 'tldraw'
import { TlaButton } from '../../tla/components/TlaButton/TlaButton'
import styles from '../admin.module.css'

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
		setProgressLog([])
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

export function AdminDangerZone() {
	return (
		<>
			<HardDeleteFile />
			<DeleteUser />
		</>
	)
}
