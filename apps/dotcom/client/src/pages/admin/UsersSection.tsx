import { TlaFile, TlaUser } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetch } from 'tldraw'
import { AdminButton } from './AdminButton'
import { StructuredDataDisplay } from './shared'
import styles from './admin.module.css'

// Helper component for user data summary. deletedFileCount comes from the dedicated endpoint —
// `data.files` excludes the user's own deleted files, so it can't be derived from `data`.
function UserDataSummary({
	data,
	deletedFileCount,
}: {
	data: { user: TlaUser; memberships: unknown[]; files: TlaFile[] }
	deletedFileCount: number
}) {
	const getUserInfo = () => {
		const user = data.user
		const files = data.files || []
		const activeFiles = files.filter((f: TlaFile) => !f.isDeleted)

		return {
			name: user?.name || 'Unknown',
			email: user?.email || 'No email',
			activeFiles: activeFiles.length,
			deletedFiles: deletedFileCount,
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

type DeletedFileRow = TlaFile & { workspaceName: string | null; workspaceRole: string | null }

function DeletedFilesTable({
	files,
	userId,
	onUndeleted,
}: {
	files: DeletedFileRow[]
	userId: string
	onUndeleted(): void
}) {
	const [busyId, setBusyId] = useState(null as string | null)
	const [error, setError] = useState(null as string | null)

	const onUndelete = useCallback(
		async (file: DeletedFileRow) => {
			if (
				!window.confirm(
					`Undelete "${file.name || file.id}"? It will reappear in the owner's sidebar.`
				)
			) {
				return
			}
			setBusyId(file.id)
			setError(null)
			try {
				const res = await fetch(`/api/app/admin/undelete_file/${encodeURIComponent(file.id)}`, {
					method: 'POST',
				})
				if (!res.ok) {
					setError(res.statusText + ': ' + (await res.text()))
					return
				}
				onUndeleted()
			} finally {
				setBusyId(null)
			}
		},
		[onUndeleted]
	)

	if (files.length === 0) return null

	return (
		<div className={styles.fileOperation}>
			<h4 className={styles.subTitle}>Deleted files</h4>
			{error && <div className={styles.errorMessage}>{error}</div>}
			<div className={styles.tableScroll}>
				<table className={`${styles.diagnosticsTable} ${styles.fitTable}`}>
					<thead>
						<tr>
							<th>Name</th>
							<th>File ID</th>
							<th>Workspace</th>
							<th>Role</th>
							<th>Updated</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{files.map((file) => (
							<tr key={file.id}>
								<td>{file.name || 'Untitled'}</td>
								<td className={styles.fileIdCell} title={file.id}>
									{file.id}
								</td>
								<td>{file.owningGroupId === userId ? 'Home' : (file.workspaceName ?? '—')}</td>
								<td>{file.workspaceRole ?? '—'}</td>
								<td>{new Date(file.updatedAt).toLocaleString()}</td>
								<td>
									<AdminButton
										variant="secondary"
										className={styles.btnCompact}
										disabled={busyId !== null}
										isLoading={busyId === file.id}
										onClick={() => onUndelete(file)}
									>
										Undelete
									</AdminButton>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}

export function UsersSection() {
	const [data, setData] = useState<any>(null)
	const [deletedFiles, setDeletedFiles] = useState<DeletedFileRow[]>([])
	const [error, setError] = useState(null as string | null)
	const [successMessage, setSuccessMessage] = useState(null as string | null)
	const inputRef = useRef<HTMLInputElement>(null)

	// The user's replicated store filters out their own deleted files, so the deleted-files
	// list comes from a dedicated Postgres-backed endpoint.
	const loadDeletedFiles = useCallback(async () => {
		const q = inputRef.current?.value?.trim() ?? ''
		if (!q) return
		const res = await fetch(`/api/app/admin/user/deleted_files?${new URLSearchParams({ q })}`)
		if (!res.ok) {
			setError(res.statusText + ': ' + (await res.text()))
			return
		}
		setDeletedFiles((await res.json()) as DeletedFileRow[])
	}, [])

	const loadData = useCallback(async () => {
		const q = inputRef.current?.value?.trim() ?? ''
		if (!q) {
			setError('Please enter an email or ID')
			return
		}

		setError(null)
		setSuccessMessage(null)
		setDeletedFiles([])

		const res = await fetch(`/api/app/admin/user?${new URLSearchParams({ q })}`)
		if (!res.ok) {
			setError(res.statusText + ': ' + (await res.text()))
			return
		}
		setError(null)
		setData(await res.json())
		await loadDeletedFiles()
	}, [loadDeletedFiles])

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
				<h2 className={styles.sectionTitle}>User management</h2>
				<p>
					Look up a user by email or ID to inspect their data, restore deleted files, or delete the
					account.
				</p>
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
					<AdminButton onClick={loadData} variant="primary">
						Find user
					</AdminButton>
				</div>
				{error && <div className={styles.errorMessage}>{error}</div>}
				{successMessage && <div className={styles.successMessage}>{successMessage}</div>}
			</section>

			{/* User Data Section */}
			{data && (
				<section className={styles.adminSection}>
					<h3 className={styles.sectionTitle}>User data</h3>
					<UserDataSummary data={data} deletedFileCount={deletedFiles.length} />
					<div className={styles.userActions}>
						<AdminButton
							onClick={() => {
								navigator.clipboard.writeText(JSON.stringify(data, null, 2))
								setSuccessMessage('User data copied to clipboard')
							}}
							variant="secondary"
						>
							Copy data
						</AdminButton>
					</div>
					<DeletedFilesTable files={deletedFiles} userId={data.user?.id} onUndeleted={loadData} />
					<StructuredDataDisplay data={data} />
				</section>
			)}

			{/* Danger Zone Section */}
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Danger zone</h3>
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
			<h4 className={styles.subTitle}>Delete user</h4>
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
				<AdminButton
					onClick={onDelete}
					variant="danger"
					className={styles.deleteButton}
					disabled={isDeleting}
					isLoading={isDeleting}
				>
					{isDeleting ? 'Deleting...' : 'Delete user (cannot be undone)'}
				</AdminButton>
			</div>

			{/* Progress Log */}
			{progressLog.length > 0 && (
				<div className={styles.progressLog}>
					<h5>Deletion progress</h5>
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
