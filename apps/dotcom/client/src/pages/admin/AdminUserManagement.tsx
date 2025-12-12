import { TlaUser, userHasFlag, ZStoreData } from '@tldraw/dotcom-shared'
import { RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { fetch } from 'tldraw'
import { TlaButton } from '../../tla/components/TlaButton/TlaButton'
import styles from '../admin.module.css'

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
		const deletedFiles = files.filter((f: any) => f.isDeleted)
		const activeFiles = files.filter((f: any) => !f.isDeleted)

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

function MigrateUserToGroups({
	inputRef,
	onSuccess,
	onError,
	onSuccessMessage,
	didMigrate,
}: {
	inputRef: RefObject<HTMLInputElement>
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

export function AdminUserManagement() {
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
	}, [])

	useEffect(() => {
		if (successMessage) {
			const timer = setTimeout(() => setSuccessMessage(null), 3000)
			return () => clearTimeout(timer)
		}
	}, [successMessage])

	return (
		<div className={styles.fileOperation}>
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

			{data && (
				<>
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
				</>
			)}

			{replicatorData && <StructuredDataDisplay data={replicatorData} />}
		</div>
	)
}
