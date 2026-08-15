import {
	AdminOutboxRow,
	AdminOutboxRowsResponseBody,
	AdminOutboxStatsResponseBody,
	TlaFile,
} from '@tldraw/dotcom-shared'
import { useCallback, useEffect, useState } from 'react'
import { fetch } from 'tldraw'
import { AdminButton } from './AdminButton'
import styles from './admin.module.css'

export function EffectsSection() {
	const [stats, setStats] = useState(null as AdminOutboxStatsResponseBody['outbox'] | null)
	const [rows, setRows] = useState(null as AdminOutboxRow[] | null)
	const [expandedId, setExpandedId] = useState(null as number | null)
	const [error, setError] = useState(null as string | null)
	const [isLoading, setIsLoading] = useState(true)
	const [busyId, setBusyId] = useState(null as number | null)

	const load = useCallback(async () => {
		setIsLoading(true)
		setError(null)
		try {
			const [statsRes, rowsRes] = await Promise.all([
				fetch('/api/app/admin/outbox'),
				fetch('/api/app/admin/outbox/rows'),
			])
			if (!statsRes.ok) {
				setError(statsRes.statusText + ': ' + (await statsRes.text()))
				return
			}
			if (!rowsRes.ok) {
				setError(rowsRes.statusText + ': ' + (await rowsRes.text()))
				return
			}
			const statsData = (await statsRes.json()) as AdminOutboxStatsResponseBody
			const rowsData = (await rowsRes.json()) as AdminOutboxRowsResponseBody
			setStats(statsData.outbox)
			setRows(rowsData.rows)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load the outbox')
		} finally {
			setIsLoading(false)
		}
	}, [])

	useEffect(() => {
		load()
	}, [load])

	const retryRow = useCallback(
		async (id: number) => {
			setBusyId(id)
			setError(null)
			try {
				const res = await fetch(`/api/app/admin/outbox/${id}/retry`, { method: 'POST' })
				if (!res.ok) {
					if (res.status === 404) {
						// A concurrent drain already consumed the row; refresh to show its current state.
						await load()
						setError('Row already gone - refreshed')
						return
					}
					const text = await res.text().catch(() => '')
					setError(`Retry failed: ${res.status} ${text}`)
					return
				}
				await load()
			} catch (err) {
				setError(err instanceof Error ? `Retry failed: ${err.message}` : 'Retry failed')
			} finally {
				setBusyId(null)
			}
		},
		[load]
	)

	const deleteRow = useCallback(
		async (id: number) => {
			if (!window.confirm(`Delete outbox row ${id}? This cannot be undone.`)) return
			setBusyId(id)
			setError(null)
			try {
				const res = await fetch(`/api/app/admin/outbox/${id}/delete`, { method: 'POST' })
				if (!res.ok) {
					if (res.status === 404) {
						// A concurrent drain already consumed the row; refresh to show its current state.
						await load()
						setError('Row already gone - refreshed')
						return
					}
					const text = await res.text().catch(() => '')
					setError(`Delete failed: ${res.status} ${text}`)
					return
				}
				await load()
			} catch (err) {
				setError(err instanceof Error ? `Delete failed: ${err.message}` : 'Delete failed')
			} finally {
				setBusyId(null)
			}
		},
		[load]
	)

	return (
		<section className={styles.adminSection}>
			<div className={styles.searchContainer}>
				<h3 className={styles.sectionTitle}>Effect outbox</h3>
				<AdminButton onClick={load} variant="secondary" isLoading={isLoading}>
					Refresh
				</AdminButton>
			</div>
			{error && <div className={styles.errorMessage}>{error}</div>}
			{stats && (
				<p className={styles.adminReleaseMeta}>
					<span className={styles.adminReleaseLabel}>Pending:</span> {stats.pending}
					{' · '}
					<span className={styles.adminReleaseLabel}>Parked:</span> {stats.parked}
					{' · '}
					<span className={styles.adminReleaseLabel}>Oldest pending age:</span>{' '}
					{stats.oldestPendingAgeSeconds === null ? 'n/a' : `${stats.oldestPendingAgeSeconds}s`}
				</p>
			)}
			{rows && rows.length === 0 && <p>No pending effects</p>}
			{rows && rows.length > 0 && (
				<div className={styles.tableScroll}>
					<table className={styles.diagnosticsTable}>
						<thead>
							<tr>
								<th>Id</th>
								<th>Entity</th>
								<th>Command</th>
								<th>Change</th>
								<th>Attempts</th>
								<th>Age</th>
								<th>Next retry</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => (
								<OutboxRowView
									key={row.id}
									row={row}
									expanded={expandedId === row.id}
									busy={busyId === row.id}
									onToggle={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
									onRetry={() => retryRow(row.id)}
									onDelete={() => deleteRow(row.id)}
								/>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	)
}

// Human-readable summary of what a row's effect represents, diffing the same columns
// the file trigger considers effect-relevant.
function describeChange(row: AdminOutboxRow): string {
	if (row.command === 'insert') return 'created'
	if (row.command === 'delete') return 'hard-deleted'
	const prev = row.prevPayload as Partial<TlaFile> | null
	const next = row.payload as Partial<TlaFile> | null
	if (!prev || !next) return 'updated'
	const changes: string[] = []
	if (prev.isDeleted !== next.isDeleted) changes.push(next.isDeleted ? 'trashed' : 'restored')
	if (prev.name !== next.name) changes.push(`renamed "${prev.name}" → "${next.name}"`)
	if (prev.published !== next.published) {
		changes.push(next.published ? 'published' : 'unpublished')
	} else if (next.published && prev.lastPublished !== next.lastPublished) {
		changes.push('republished')
	}
	if (prev.publishedSlug !== next.publishedSlug) changes.push('publish slug changed')
	if (prev.shared !== next.shared) changes.push(next.shared ? 'shared' : 'unshared')
	if (prev.sharedLinkType !== next.sharedLinkType) {
		changes.push(`link type → ${next.sharedLinkType}`)
	}
	if (prev.ownerId !== next.ownerId || prev.owningGroupId !== next.owningGroupId) {
		changes.push('ownership moved')
	}
	return changes.length ? changes.join(', ') : 'updated'
}

function OutboxRowView({
	row,
	expanded,
	busy,
	onToggle,
	onRetry,
	onDelete,
}: {
	row: AdminOutboxRow
	expanded: boolean
	busy: boolean
	onToggle(): void
	onRetry(): void
	onDelete(): void
}) {
	const attemptsClass = row.parked
		? styles.attemptsParked
		: row.attempts > 0
			? styles.attemptsWarn
			: undefined

	return (
		<>
			<tr className={styles.clickableRow} onClick={onToggle}>
				<td>{row.id}</td>
				<td className={styles.fileIdCell}>
					{row.tableName}:{row.entityId}
				</td>
				<td>{row.command}</td>
				<td>{describeChange(row)}</td>
				<td className={attemptsClass}>
					{row.attempts}
					{row.parked ? ' (parked)' : ''}
				</td>
				<td>{row.ageSeconds}s</td>
				<td>{row.nextRetryAt ? new Date(row.nextRetryAt).toLocaleString() : 'n/a'}</td>
				<td onClick={(e) => e.stopPropagation()}>
					<AdminButton
						onClick={onRetry}
						variant="secondary"
						className={styles.btnCompact}
						isLoading={busy}
					>
						Retry now
					</AdminButton>{' '}
					<AdminButton
						onClick={onDelete}
						variant="danger"
						className={styles.btnCompact}
						isLoading={busy}
					>
						Delete
					</AdminButton>
				</td>
			</tr>
			{expanded && (
				<tr>
					<td colSpan={8}>
						<div className={styles.outboxDetails}>
							<div className={styles.outboxDetailsColumn}>
								<div className={styles.fieldLabel}>Payload</div>
								<pre className={styles.dataDisplay}>{JSON.stringify(row.payload, null, 2)}</pre>
							</div>
							<div className={styles.outboxDetailsColumn}>
								<div className={styles.fieldLabel}>Prev payload</div>
								<pre className={styles.dataDisplay}>{JSON.stringify(row.prevPayload, null, 2)}</pre>
							</div>
							<div className={styles.outboxDetailsColumn}>
								<div className={styles.fieldLabel}>Current entity</div>
								<pre className={styles.dataDisplay}>
									{JSON.stringify(row.currentEntity, null, 2)}
								</pre>
							</div>
						</div>
					</td>
				</tr>
			)}
		</>
	)
}
