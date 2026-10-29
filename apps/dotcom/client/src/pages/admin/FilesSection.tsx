import { AdminFileAssetsResponseBody } from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetch } from 'tldraw'
import { AdminButton } from './AdminButton'
import { FileStats } from './FileStats'
import { parseFileId } from './parseFileId'
import {
	formatBytes,
	formatTally,
	getResponseError,
	StructuredDataDisplay,
	useTransientMessage,
} from './shared'
import styles from './admin.module.css'

export function FilesSection({ fileId }: { fileId?: string }) {
	return fileId ? <FilePage key={fileId} fileId={fileId} /> : <FilesLanding />
}

function FilesLanding() {
	return (
		<>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Inspect a file</h3>
				<InspectFile />
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Durable object lookup</h3>
				<ResolveDoId />
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Legacy rooms</h3>
				<CreateLegacyFile />
			</section>
		</>
	)
}

function InspectFile() {
	const navigate = useNavigate()
	const [input, setInput] = useState('')
	const [error, setError] = useState(null as string | null)

	const onInspect = useCallback(() => {
		const fileId = parseFileId(input)
		if (!fileId) {
			setError('Paste a file ID, or a tldraw.com /f/ or /r/ link')
			return
		}
		navigate(`/admin/files/${encodeURIComponent(fileId)}`)
	}, [input, navigate])

	return (
		<div className={styles.fileOperation}>
			<p>
				Paste a file ID or a link to the file. Published (/p/) and read-only (/ro/) links use a
				different slug, so use the file&apos;s /f/ or /r/ link.
			</p>
			{error && <div className={styles.errorMessage}>{error}</div>}
			<div className={styles.searchContainer}>
				<input
					type="text"
					placeholder="File ID or URL"
					className={styles.searchInput}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => e.key === 'Enter' && onInspect()}
				/>
				<AdminButton onClick={onInspect} variant="primary">
					Inspect
				</AdminButton>
			</div>
		</div>
	)
}

function FilePage({ fileId }: { fileId: string }) {
	return (
		<>
			<section className={styles.adminSection}>
				<Link to="/admin/files">← All files</Link>
				<h3 className={styles.sectionTitle}>
					File <code>{fileId}</code>
				</h3>
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Room</h3>
				<ResolveDoId slug={fileId} />
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Downloads</h3>
				<div className={styles.fileOperations}>
					<DownloadTldrFile fileId={fileId} legacy={false} />
					<DownloadTldrFile fileId={fileId} legacy={true} />
				</div>
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Board stats</h3>
				<FileStats fileId={fileId} />
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Asset diagnostics</h3>
				<AssetDiagnostics fileId={fileId} />
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Delete and restore</h3>
				<SoftDeleteFile fileId={fileId} />
			</section>
			<section className={styles.adminSection}>
				<h3 className={styles.sectionTitle}>Danger zone</h3>
				<HardDeleteFile fileId={fileId} />
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
	bootStage: string | null
	bootStageAgeMs: number | null
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
 * the canonical object id either way. With `slug`, it looks up that one room and shows no input.
 */
function ResolveDoId({ slug }: { slug?: string }) {
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
				setError(await getResponseError(res))
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
		if (slug) {
			await resolve(slug)
			return
		}
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
	}, [slug, input, resolve])

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
				setError(await getResponseError(res))
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
			{slug ? (
				<p>
					Whether anyone is using this file&apos;s room. <b>Sockets</b> are live tabs; save stats
					come from the snapshot history bucket.
				</p>
			) : (
				<p>
					Paste a durable object id (full 64-character hex — dash lists truncate, grab the full id
					from the search dropdown or GraphQL) or a room slug — either resolves to the room&apos;s
					activity. <b>Sockets</b> are live tabs; save stats come from the snapshot history bucket.
					Frequent recent saves = someone editing; sockets with stale saves = parked background
					tabs; no sockets = idle. The slug is copyable instead of linked — we do not open
					users&apos; files.
				</p>
			)}
			<div className={styles.searchContainer}>
				{!slug && (
					<input
						className={styles.searchInput}
						placeholder="Durable object id (64-char hex) or room slug"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && onResolve()}
						disabled={isRunning}
					/>
				)}
				<AdminButton variant="primary" onClick={onResolve} isLoading={isRunning}>
					{slug ? 'Look up room' : 'Resolve'}
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
						{!slug && (
							<>
								<Link to={`/admin/files/${encodeURIComponent(match.slug)}`}>file tools</Link>{' '}
							</>
						)}
						— {match.isApp ? 'app file' : 'legacy room'}
						{match.deleted ? ' (deleted)' : ''}
					</div>
					<div>
						{history ? <b>{activityVerdict(match, history)}</b> : null} · {match.connectedSockets}{' '}
						socket{match.connectedSockets === 1 ? '' : 's'} connected · room{' '}
						{match.bootStage !== null
							? `booting: ${match.bootStage} for ${Math.round((match.bootStageAgeMs ?? 0) / 1000)}s`
							: match.roomLoaded
								? 'loaded in memory'
								: 'not loaded (hibernated or idle)'}
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

function HardDeleteFile({ fileId }: { fileId: string }) {
	const [error, setError] = useState(null as string | null)
	const [successMessage, setSuccessMessage] = useTransientMessage()
	const [isLoading, setIsLoading] = useState(false)

	const onDelete = useCallback(async () => {
		if (
			!window.confirm(
				`Are you sure you want to permanently delete file ${fileId}? This action cannot be undone.`
			)
		) {
			return
		}

		setError(null)
		setSuccessMessage(null)
		setIsLoading(true)
		try {
			const res = await fetch(`/api/app/admin/hard_delete_file/${encodeURIComponent(fileId)}`, {
				method: 'POST',
			})
			if (!res.ok) {
				setError(await getResponseError(res))
				return
			}
			setSuccessMessage('File deleted successfully! 🧹')
		} finally {
			setIsLoading(false)
		}
	}, [fileId, setSuccessMessage])

	return (
		<div className={styles.dangerZone}>
			<p>Deletes the file, its snapshots, and its assets. Works for legacy rooms too.</p>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{successMessage && <div className={styles.successMessage}>{successMessage}</div>}
			<AdminButton onClick={onDelete} variant="danger" isLoading={isLoading}>
				Hard delete (cannot be undone)
			</AdminButton>
		</div>
	)
}

function CreateLegacyFile() {
	const [isCreating, setIsCreating] = useState(false)

	const handleCreate = useCallback(async () => {
		if (!window.confirm('Create a new empty legacy room?')) return
		setIsCreating(true)
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

	return (
		<div className={styles.fileOperation}>
			<p>Creates an empty legacy multiplayer room and opens it.</p>
			<AdminButton onClick={handleCreate} variant="primary" isLoading={isCreating}>
				Create legacy file
			</AdminButton>
		</div>
	)
}

function DownloadTldrFile({ fileId, legacy }: { fileId: string; legacy: boolean }) {
	const [error, setError] = useState(null as string | null)
	const [isDownloading, setIsDownloading] = useState(false)

	const onDownload = useCallback(async () => {
		setError(null)
		const path = legacy ? 'download-legacy-tldr' : 'download-tldr'

		setIsDownloading(true)
		try {
			const res = await fetch(`/api/app/admin/${path}/${encodeURIComponent(fileId)}`)
			if (!res.ok) {
				setError(await getResponseError(res))
				return
			}

			// Create a blob from the response and trigger download
			const blob = await res.blob()
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `${fileId}.tldr`
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			document.body.removeChild(a)
		} finally {
			setIsDownloading(false)
		}
	}, [fileId, legacy])

	return (
		<div className={styles.fileOperation}>
			{error && <div className={styles.errorMessage}>{error}</div>}
			<AdminButton onClick={onDownload} variant="primary" isLoading={isDownloading}>
				{legacy ? 'Download legacy .tldr' : 'Download .tldr'}
			</AdminButton>
		</div>
	)
}

function SoftDeleteFile({ fileId }: { fileId: string }) {
	// null while loading; 'none' for a legacy room, which has no file row
	const [status, setStatus] = useState(null as 'live' | 'deleted' | 'none' | null)
	const [error, setError] = useState(null as string | null)
	const [successMessage, setSuccessMessage] = useTransientMessage()
	const [isBusy, setIsBusy] = useState(false)

	useEffect(() => {
		fetch(`/api/app/admin/file/${encodeURIComponent(fileId)}`)
			.then(async (res) => {
				if (res.status === 404) return setStatus('none')
				if (!res.ok) return setError(await getResponseError(res))
				const file = (await res.json()) as { isDeleted: boolean }
				setStatus(file.isDeleted ? 'deleted' : 'live')
			})
			.catch((err) => setError(err instanceof Error ? err.message : 'Failed to load file'))
	}, [fileId])

	const run = useCallback(async () => {
		const action = status === 'deleted' ? 'undelete_file' : 'soft_delete_file'
		const prompt =
			action === 'soft_delete_file'
				? `Soft-delete file ${fileId}? It leaves every sidebar. Undelete restores it.`
				: `Undelete file ${fileId}? It reappears in its workspace.`
		if (!window.confirm(prompt)) return
		setError(null)
		setSuccessMessage(null)
		setIsBusy(true)
		try {
			const res = await fetch(`/api/app/admin/${action}/${encodeURIComponent(fileId)}`, {
				method: 'POST',
			})
			if (!res.ok) {
				setError(await getResponseError(res))
				return
			}
			setStatus(action === 'soft_delete_file' ? 'deleted' : 'live')
			setSuccessMessage(action === 'soft_delete_file' ? 'File soft-deleted' : 'File undeleted')
		} finally {
			setIsBusy(false)
		}
	}, [fileId, status, setSuccessMessage])

	return (
		<div className={styles.fileOperation}>
			<p>
				{status === null
					? 'Loading…'
					: status === 'none'
						? 'No file row (legacy room), so soft delete does not apply.'
						: status === 'deleted'
							? 'This file is soft-deleted. Undelete restores it to its workspace.'
							: 'This file is live. Soft delete marks it deleted, the same as an owner deleting it.'}
			</p>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{successMessage && <div className={styles.successMessage}>{successMessage}</div>}
			{status === 'live' && (
				<AdminButton onClick={run} variant="danger" isLoading={isBusy}>
					Soft delete
				</AdminButton>
			)}
			{status === 'deleted' && (
				<AdminButton onClick={run} variant="primary" isLoading={isBusy}>
					Undelete
				</AdminButton>
			)}
		</div>
	)
}

function AssetDiagnostics({ fileId }: { fileId: string }) {
	const [error, setError] = useState(null as string | null)
	const [isLoading, setIsLoading] = useState(false)
	const [report, setReport] = useState(null as AdminFileAssetsResponseBody | null)

	const onCheck = useCallback(async () => {
		setError(null)
		setReport(null)
		setIsLoading(true)
		try {
			const res = await fetch(`/api/app/admin/file-assets/${encodeURIComponent(fileId)}`)
			if (!res.ok) {
				setError(await getResponseError(res))
				return
			}
			setReport((await res.json()) as AdminFileAssetsResponseBody)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to check assets')
		} finally {
			setIsLoading(false)
		}
	}, [fileId])

	return (
		<div className={styles.fileOperation}>
			<p>
				Checks whether each asset in the file&apos;s last persisted snapshot exists in the uploads
				bucket and is associated with the file.
			</p>
			{error && <div className={styles.errorMessage}>{error}</div>}
			<AdminButton onClick={onCheck} variant="primary" isLoading={isLoading}>
				Check assets
			</AdminButton>
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
										report.shapes.total > 0 ? ` (${formatTally(report.shapes.byType)})` : ''
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
