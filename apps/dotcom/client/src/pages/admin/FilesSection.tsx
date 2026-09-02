import { AdminFileAssetsResponseBody } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetch } from 'tldraw'
import { AdminButton } from './AdminButton'
import { FileStats } from './FileStats'
import { formatBytes, StructuredDataDisplay } from './shared'
import styles from './admin.module.css'

export function FilesSection() {
	return (
		<>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Downloads</h3>
				<div className={styles.fileOperations}>
					<DownloadTldrFile legacy={false} />
					<DownloadTldrFile legacy={true} />
					<CreateLegacyFile />
				</div>
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Board stats</h3>
				<FileStats />
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Asset diagnostics</h3>
				<AssetDiagnostics />
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Undelete file</h3>
				<UndeleteFileById />
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Durable object lookup</h3>
				<ResolveDoId />
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Welcome template</h3>
				<WelcomeTemplate />
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Danger zone</h3>
				<HardDeleteFile />
			</section>
		</>
	)
}

interface ResolvedDoRoom {
	slug: string
	isApp: boolean
	deleted: boolean
	connectedSockets: number
	roomLoaded: boolean
}

interface ResolvedDoHistory {
	saves: number
	firstSaveAt: string | null
	lastSaveAt: string | null
	avgSecondsBetweenSaves: number | null
	latestSizeBytes: number | null
	totalSizeBytes: number
	listTruncated: boolean
}

function formatAgo(iso: string) {
	const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
	if (seconds < 120) return `${seconds}s ago`
	if (seconds < 7200) return `${Math.round(seconds / 60)}m ago`
	if (seconds < 172800) return `${Math.round(seconds / 3600)}h ago`
	return `${Math.round(seconds / 86400)}d ago`
}

function formatInterval(seconds: number) {
	if (seconds < 120) return `${seconds}s`
	if (seconds < 7200) return `${Math.round(seconds / 60)}m`
	return `${(seconds / 3600).toFixed(1)}h`
}

/** The question this section exists to answer: is anyone actually using this room? */
function activityVerdict(match: ResolvedDoRoom, history: ResolvedDoHistory) {
	const lastSaveAgeMs = history.lastSaveAt
		? Date.now() - new Date(history.lastSaveAt).getTime()
		: Infinity
	if (match.connectedSockets === 0) {
		return 'idle — no tabs connected'
	}
	if (lastSaveAgeMs < 60 * 60 * 1000) {
		return 'actively edited — connected and saving'
	}
	return 'parked tab(s) — connected but not editing'
}

// Cloudflare dash coordinates for the production TLDR_DOC namespace, for metrics deep links only
const CF_ACCOUNT_TAG = 'c34edc4e76350954b63adebde86d5eb1'
const CF_TLDR_DOC_NAMESPACE_ID = '5864db4344ac4c55bfd94e81dd25a043'

/**
 * Looks up a room by durable object id (from Cloudflare analytics or the dash) or by room slug,
 * with liveness and persist-history signals. The server distinguishes the two forms and returns
 * the canonical object id either way.
 */
function ResolveDoId() {
	const [input, setInput] = useState('')
	const [isRunning, setIsRunning] = useState(false)
	const [error, setError] = useState(null as string | null)
	const [copied, setCopied] = useState(false)
	const [result, setResult] = useState(
		null as {
			objectId: string
			match: ResolvedDoRoom | null
			history: ResolvedDoHistory | null
		} | null
	)

	const resolve = useCallback(async (idOrSlug: string) => {
		setError(null)
		setResult(null)
		setCopied(false)
		setIsRunning(true)
		try {
			// the server resolves either form and returns the canonical object id
			const res = await fetch(`/api/app/admin/resolve-do-id/${encodeURIComponent(idOrSlug)}`)
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			setResult(await res.json())
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Resolve failed')
		} finally {
			setIsRunning(false)
		}
	}, [])

	const onResolve = useCallback(async () => {
		const idOrSlug = input.trim()
		// hex is a subset of the slug charset — catch truncated/uppercase ids before they hash as slugs
		if (/^[0-9a-fA-F]{16,}$/.test(idOrSlug) && !/^[0-9a-f]{64}$/.test(idOrSlug)) {
			setError(
				'Looks like a truncated or uppercase durable object id — paste the full 64-char lowercase hex'
			)
			return
		}
		if (!/^[0-9a-f]{64}$/.test(idOrSlug) && !/^[a-zA-Z0-9_-]+$/.test(idOrSlug)) {
			setError('Paste a 64-character hex durable object id or a room slug')
			return
		}
		await resolve(idOrSlug)
	}, [input, resolve])

	const onCopySlug = useCallback(async (slug: string) => {
		await navigator.clipboard.writeText(slug)
		setCopied(true)
		setTimeout(() => setCopied(false), 1500)
	}, [])

	const match = result?.match
	const history = result?.history

	const [isClosing, setIsClosing] = useState(false)
	const onForceClose = useCallback(async () => {
		// target the id that was resolved, not the live input — the admin may have edited the
		// input since, and the button describes the resolved room
		if (!result || !match) return
		if (
			!window.confirm(
				`Force-close ${match.connectedSockets} session(s) on ${match.slug}? ` +
					'Every connected tab (including anyone actively editing) is disconnected and shown ' +
					'a "please reload" screen.'
			)
		) {
			return
		}
		setError(null)
		setIsClosing(true)
		try {
			const res = await fetch(`/api/app/admin/close-do-sessions/${result.objectId}`, {
				method: 'POST',
			})
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			// re-resolve the same object so the socket count and verdict reflect the drain
			await resolve(result.objectId)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Force-close failed')
		} finally {
			setIsClosing(false)
		}
	}, [result, match, resolve])

	return (
		<div>
			<p>
				Paste a durable object id (full 64-character hex — dash lists truncate, grab the full id
				from the search dropdown or GraphQL) or a room slug — either resolves to the room&apos;s
				activity. <b>Sockets</b> are live tabs; save stats come from the snapshot history bucket.
				Frequent recent saves = someone editing; sockets with stale saves = parked background tabs;
				no sockets = idle. The slug is copyable instead of linked — we do not open users&apos;
				files.
			</p>
			<div className={styles.searchContainer}>
				<input
					className={styles.searchInput}
					placeholder="Durable object id (64-char hex) or room slug"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => e.key === 'Enter' && onResolve()}
					disabled={isRunning}
				/>
				<AdminButton variant="primary" onClick={onResolve} isLoading={isRunning}>
					Resolve
				</AdminButton>
			</div>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{result && !match && (
				<div className={styles.subTitle}>No room for that id or slug (never initialized)</div>
			)}
			{match && result && (
				<div className={styles.subTitle}>
					<div>
						{/* deliberately not a file link — we don't open users' files, we copy the slug */}
						<code>{match.slug}</code>{' '}
						<AdminButton onClick={() => onCopySlug(match.slug)}>
							{copied ? 'Copied' : 'Copy slug'}
						</AdminButton>{' '}
						<a
							href={`https://dash.cloudflare.com/${CF_ACCOUNT_TAG}/workers/durable-objects/view/${CF_TLDR_DOC_NAMESPACE_ID}?id=${result.objectId}&name=${encodeURIComponent(`/r/${match.slug}`)}`}
							target="_blank"
							rel="noreferrer"
						>
							metrics ↗
						</a>{' '}
						— {match.isApp ? 'app file' : 'legacy room'}
						{match.deleted ? ' (deleted)' : ''}
					</div>
					<div>
						{history ? <b>{activityVerdict(match, history)}</b> : null} · {match.connectedSockets}{' '}
						socket{match.connectedSockets === 1 ? '' : 's'} connected · room{' '}
						{match.roomLoaded ? 'loaded in memory' : 'not loaded (hibernated or idle)'}
					</div>
					{history && (
						<div>
							{history.saves === 0
								? 'No snapshots in the history bucket (retention window)'
								: `${history.saves.toLocaleString()}${history.listTruncated ? '+' : ''} saves · ` +
									`last ${history.lastSaveAt ? formatAgo(history.lastSaveAt) : '-'} · ` +
									`first ${history.firstSaveAt ? formatAgo(history.firstSaveAt) : '-'} · ` +
									(history.avgSecondsBetweenSaves !== null
										? `every ~${formatInterval(history.avgSecondsBetweenSaves)} · `
										: '') +
									`latest ${history.latestSizeBytes !== null ? formatBytes(history.latestSizeBytes) : '-'} · ` +
									`total ${formatBytes(history.totalSizeBytes)}`}
						</div>
					)}
					{match.connectedSockets > 0 && (
						<div>
							<AdminButton variant="danger" onClick={onForceClose} isLoading={isClosing}>
								Force-close {match.connectedSockets} session
								{match.connectedSockets === 1 ? '' : 's'}
							</AdminButton>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

function WelcomeTemplate() {
	const inputRef = useRef<HTMLInputElement>(null)
	const [current, setCurrent] = useState(
		null as { fileId: string; publishedSlug: string; live?: boolean } | null
	)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState(null as string | null)
	const [successMessage, setSuccessMessage] = useState(null as string | null)

	const load = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			const res = await fetch('/api/app/admin/welcome-template')
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
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
		setError(null)
		setSuccessMessage(null)
		try {
			const res = await fetch('/api/app/admin/welcome-template', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileId }),
			})
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			setCurrent(await res.json())
			setSuccessMessage('Welcome template set ✨')
			inputRef.current!.value = ''
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to set welcome template')
		}
	}, [])

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
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			setCurrent(null)
			setSuccessMessage('Welcome template cleared — using the built-in default')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to clear welcome template')
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
				<AdminButton onClick={onDelete} variant="danger" className={styles.deleteButton}>
					Delete (cannot be undone)
				</AdminButton>
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
			<p>Creates an empty legacy multiplayer room and opens it.</p>
			<AdminButton onClick={handleCreate} variant="primary" isLoading={isCreating}>
				Create legacy file
			</AdminButton>
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
			<h4 className={styles.subTitle}>
				{legacy ? 'Download legacy .tldr file' : 'Download .tldr file'}
			</h4>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{successMessage && <div className={styles.successMessage}>{successMessage}</div>}
			<div className={styles.downloadContainer}>
				<input type="text" placeholder="File ID" ref={inputRef} className={styles.searchInput} />
				<AdminButton onClick={onDownload} variant="primary" isLoading={isDownloading}>
					Download
				</AdminButton>
			</div>
		</div>
	)
}

function UndeleteFileById() {
	const inputRef = useRef<HTMLInputElement>(null)
	const [error, setError] = useState(null as string | null)
	const [successMessage, setSuccessMessage] = useState(null as string | null)
	const [isLoading, setIsLoading] = useState(false)

	const onUndelete = useCallback(async () => {
		const fileId = inputRef.current?.value?.trim()
		if (!fileId) {
			setError('Please enter a file ID')
			return
		}
		if (!window.confirm(`Undelete file ${fileId}?`)) return
		setError(null)
		setSuccessMessage(null)
		setIsLoading(true)
		try {
			const res = await fetch(`/api/app/admin/undelete_file/${encodeURIComponent(fileId)}`, {
				method: 'POST',
			})
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			setSuccessMessage('File undeleted')
			inputRef.current!.value = ''
		} finally {
			setIsLoading(false)
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
			<p>Restores a soft-deleted file by ID.</p>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{successMessage && <div className={styles.successMessage}>{successMessage}</div>}
			<div className={styles.searchContainer}>
				<input type="text" placeholder="File ID" ref={inputRef} className={styles.searchInput} />
				<AdminButton onClick={onUndelete} variant="primary" isLoading={isLoading}>
					Undelete
				</AdminButton>
			</div>
		</div>
	)
}

function AssetDiagnostics() {
	const inputRef = useRef<HTMLInputElement>(null)
	const [error, setError] = useState(null as string | null)
	const [isLoading, setIsLoading] = useState(false)
	const [report, setReport] = useState(null as AdminFileAssetsResponseBody | null)

	const onCheck = useCallback(async () => {
		const slug = inputRef.current?.value?.trim()
		if (!slug) {
			setError('Please enter a file slug')
			return
		}
		setError(null)
		setReport(null)
		setIsLoading(true)
		try {
			const res = await fetch(`/api/app/admin/file-assets/${encodeURIComponent(slug)}`)
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			setReport((await res.json()) as AdminFileAssetsResponseBody)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to check assets')
		} finally {
			setIsLoading(false)
		}
	}, [])

	return (
		<div className={styles.fileOperation}>
			<p>
				Checks whether each asset in the file&apos;s last persisted snapshot exists in the uploads
				bucket and is associated with the file.
			</p>
			{error && <div className={styles.errorMessage}>{error}</div>}
			<div className={styles.searchContainer}>
				<input
					type="text"
					placeholder="File slug"
					ref={inputRef}
					className={styles.searchInput}
					onKeyDown={(e) => {
						if (e.key === 'Enter') onCheck()
					}}
				/>
				<AdminButton onClick={onCheck} variant="primary" isLoading={isLoading}>
					Check assets
				</AdminButton>
			</div>
			{report && (
				<>
					{report.warnings.length > 0 && (
						<div className={styles.errorMessage}>
							{report.warnings.length} check(s) failed — counts below may be incomplete.{' '}
							{report.warnings.slice(0, 3).join('; ')}
						</div>
					)}
					<div className={styles.userSummary}>
						<div className={styles.summaryGrid}>
							{[
								[
									'Shapes',
									`${report.shapes.total}${
										report.shapes.total > 0
											? ` (${Object.entries(report.shapes.byType)
													.sort((a, b) => b[1] - a[1])
													.map(([type, count]) => `${count} ${type}`)
													.join(', ')})`
											: ''
									}`,
								],
								['Total assets', report.assets.total],
								[
									'Asset size',
									`${formatBytes(report.assets.totalSizeBytes)} (largest ${formatBytes(report.assets.largestSizeBytes)})`,
								],
								['Associated', report.assets.associated],
								['Pending association', report.assets.pending],
								['External (bookmarks etc.)', report.assets.external],
								['Missing in bucket', report.assets.missingInBucket],
								['Head check failures', report.assets.headFailures],
								['Old-format URLs', report.assets.oldFormatUrls],
								[
									'DB asset rows',
									`${report.dbRows.forThisFile} (${report.dbRows.orphaned} orphaned)`,
								],
								[
									'Create source',
									report.source
										? `${report.source.raw} ${
												report.source.exists === null
													? '(not checked)'
													: report.source.exists
														? '(exists)'
														: '⚠️ (missing)'
											}`
										: 'none',
								],
							].map(([label, value]) => (
								<div key={label} className={styles.summaryItem}>
									<span className={styles.fieldLabel}>{label}:</span>
									<span className={styles.fieldValue}>{value}</span>
								</div>
							))}
						</div>
					</div>
					{report.assets.problems.length > 0 && (
						<table className={styles.diagnosticsTable}>
							<thead>
								<tr>
									<th>Asset</th>
									<th>Object name</th>
									<th>In bucket</th>
									<th>Meta fileId</th>
									<th>DB fileId</th>
								</tr>
							</thead>
							<tbody>
								{report.assets.problems.map((p) => (
									<tr key={p.assetId}>
										<td>{p.assetId}</td>
										<td>{p.objectName}</td>
										<td>{p.inBucket === null ? 'check failed' : p.inBucket ? 'yes' : 'MISSING'}</td>
										<td>{p.fileIdMeta ?? 'none'}</td>
										<td>{p.dbRow?.fileId ?? 'none'}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
					<StructuredDataDisplay data={report} />
				</>
			)}
		</div>
	)
}
