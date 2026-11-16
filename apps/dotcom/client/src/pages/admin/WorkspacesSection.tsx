import { useCallback, useEffect, useRef, useState } from 'react'
import { fetch } from 'tldraw'
import { AdminButton } from './AdminButton'
import { getResponseError, useTransientMessage } from './shared'
import styles from './admin.module.css'

export function WorkspacesSection() {
	return (
		<section className={styles.adminSection}>
			<h3 className={styles.sectionTitle}>Welcome template</h3>
			<WelcomeTemplate />
		</section>
	)
}

function WelcomeTemplate() {
	const inputRef = useRef<HTMLInputElement>(null)
	const [current, setCurrent] = useState(
		null as { fileId: string; publishedSlug: string; live?: boolean } | null
	)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState(null as string | null)
	const [successMessage, setSuccessMessage] = useTransientMessage()

	const load = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/app/admin/welcome-template')
			if (!res.ok) {
				setError(await getResponseError(res))
				return
			}
			setCurrent(await res.json())
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load welcome template')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		load()
	}, [load])

	const onSet = useCallback(async () => {
		const fileId = inputRef.current?.value?.trim()
		if (!fileId) {
			setError('Please enter a published file ID')
			return
		}
		if (!window.confirm(`Set ${fileId} as the welcome template? New workspaces will fork it.`)) {
			return
		}
		setError(null)
		setSuccessMessage(null)
		try {
			const res = await fetch('/api/app/admin/welcome-template', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileId }),
			})
			if (!res.ok) {
				setError(await getResponseError(res))
				return
			}
			setCurrent(await res.json())
			setSuccessMessage('Welcome template set ✨')
			inputRef.current!.value = ''
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to set welcome template')
		}
	}, [setSuccessMessage])

	const onClear = useCallback(async () => {
		if (
			!window.confirm('Clear the welcome template? New workspaces will use the built-in default.')
		)
			return
		setError(null)
		setSuccessMessage(null)
		try {
			const res = await fetch('/api/app/admin/welcome-template/clear', { method: 'POST' })
			if (!res.ok) {
				setError(await getResponseError(res))
				return
			}
			setCurrent(null)
			setSuccessMessage('Welcome template cleared — using the built-in default')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to clear welcome template')
		}
	}, [setSuccessMessage])

	return (
		<div className={styles.fileOperation}>
			<p>
				The file new workspaces fork their first file from. Publish the file first, then set it here
				by its file ID. Clear it to use the built-in default.
			</p>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{successMessage && <div className={styles.successMessage}>{successMessage}</div>}
			<div className={styles.summaryItem}>
				<span className={styles.fieldLabel}>Current:</span>
				<span className={styles.fieldValue}>
					{isLoading
						? 'Loading…'
						: current
							? `${current.fileId} (published slug ${current.publishedSlug})${
									current.live ? '' : ' ⚠️ not published — new workspaces fall back to the default'
								}`
							: 'none — using the built-in default'}
				</span>
			</div>
			<div className={styles.searchContainer}>
				<input
					type="text"
					placeholder="Published file ID"
					ref={inputRef}
					className={styles.searchInput}
				/>
				<AdminButton onClick={onSet} variant="primary">
					Set as welcome template
				</AdminButton>
				<AdminButton onClick={onClear} variant="secondary" disabled={!current}>
					Clear
				</AdminButton>
			</div>
		</div>
	)
}
