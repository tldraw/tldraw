import { useCallback, useEffect, useRef, useState } from 'react'
import { fetch } from 'tldraw'
import { TlaButton } from '../../tla/components/TlaButton/TlaButton'
import styles from '../admin.module.css'

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

export function AdminFileOperations() {
	return (
		<div className={styles.fileOperations}>
			<DownloadTldrFile legacy={false} />
			<DownloadTldrFile legacy={true} />
			<CreateLegacyFile />
		</div>
	)
}
