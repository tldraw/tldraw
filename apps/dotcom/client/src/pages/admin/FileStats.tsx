import { AdminFileStatsResponseBody } from '@tldraw/dotcom-shared'
import { useCallback, useRef, useState } from 'react'
import { fetch } from 'tldraw'
import { AdminButton } from './AdminButton'
import { formatBytes, StructuredDataDisplay } from './shared'
import styles from './admin.module.css'

function formatNumber(value: number) {
	return value.toLocaleString()
}

/** "412 geo, 88 arrow, 3 frame" — biggest first, so the summary line leads with what matters. */
function formatTally(tally: Record<string, number>) {
	const entries = Object.entries(tally).sort((a, b) => b[1] - a[1])
	if (entries.length === 0) return 'none'
	return entries.map(([name, count]) => `${formatNumber(count)} ${name}`).join(', ')
}

function formatTimestamp(value: number) {
	if (!value) return 'unknown'
	return new Date(value).toISOString().slice(0, 10)
}

/**
 * A content-free profile of a board: how many shapes, how deeply nested, how much text, how big the
 * snapshot. Enough to reason about a slow or broken board — or to answer "what does a board this
 * size actually look like" — without opening it or seeing anything on it.
 */
export function FileStats() {
	const inputRef = useRef<HTMLInputElement>(null)
	const [error, setError] = useState(null as string | null)
	const [isLoading, setIsLoading] = useState(false)
	const [stats, setStats] = useState(null as AdminFileStatsResponseBody | null)

	const onGetStats = useCallback(async () => {
		const slug = inputRef.current?.value?.trim()
		if (!slug) {
			setError('Please enter a file slug')
			return
		}
		setError(null)
		setStats(null)
		setIsLoading(true)
		try {
			const res = await fetch(`/api/app/admin/file-stats/${encodeURIComponent(slug)}`)
			if (!res.ok) {
				setError(res.statusText + ': ' + (await res.text()))
				return
			}
			setStats((await res.json()) as AdminFileStatsResponseBody)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to get board stats')
		} finally {
			setIsLoading(false)
		}
	}, [])

	return (
		<div className={styles.fileOperation}>
			<p>
				Counts and sizes for a board&apos;s last persisted snapshot. Nothing here is board content
				or a person&apos;s identity, so a report is safe to paste into an issue or a support reply.
			</p>
			{error && <div className={styles.errorMessage}>{error}</div>}
			<div className={styles.searchContainer}>
				<input
					type="text"
					placeholder="File slug"
					ref={inputRef}
					className={styles.searchInput}
					onKeyDown={(e) => {
						if (e.key === 'Enter') onGetStats()
					}}
				/>
				<AdminButton onClick={onGetStats} variant="primary" isLoading={isLoading}>
					Get stats
				</AdminButton>
			</div>
			{stats && <FileStatsReport stats={stats} />}
		</div>
	)
}

function FileStatsReport({ stats }: { stats: AdminFileStatsResponseBody }) {
	const { file, snapshot, pages, shapes, text, bindings, assets, collaboration } = stats
	const { arrows } = bindings

	const summary: Array<[string, string]> = [
		[
			'Snapshot size',
			snapshot.sizeBytes === null ? 'check failed' : formatBytes(snapshot.sizeBytes),
		],
		['Records', `${formatNumber(snapshot.records)} (${formatTally(snapshot.recordsByTypeName)})`],
		['Tombstones', formatNumber(snapshot.tombstones)],
		[
			'Pages',
			`${formatNumber(pages.total)} (largest ${formatNumber(pages.maxShapesOnAPage)} shapes${
				pages.empty > 0 ? `, ${formatNumber(pages.empty)} empty` : ''
			})`,
		],
		['Shapes', `${formatNumber(shapes.total)} (${formatTally(shapes.byType)})`],
		[
			'Nesting depth',
			shapes.maxDepth <= 1 ? 'flat' : `${shapes.maxDepth} levels of frames and groups`,
		],
		['Locked / rotated', `${formatNumber(shapes.locked)} / ${formatNumber(shapes.rotated)}`],
		[
			'Orphaned shapes',
			shapes.orphaned === 0 ? 'none' : `⚠️ ${formatNumber(shapes.orphaned)} with no page`,
		],
		[
			'Extent',
			shapes.extent
				? `${formatNumber(shapes.extent.width)} × ${formatNumber(shapes.extent.height)} (top-level shapes, unrotated)`
				: 'no shapes',
		],
		[
			'Text',
			text.shapesWithText === 0
				? 'none'
				: `${formatNumber(text.shapesWithText)} shapes, ${formatNumber(text.totalCharacters)} chars (longest ${formatNumber(text.longestCharacters)})`,
		],
		['Bindings', `${formatNumber(bindings.total)} (${formatTally(bindings.byType)})`],
		[
			'Arrow ends',
			`${formatNumber(arrows.boundBothEnds)} bound both, ${formatNumber(arrows.boundOneEnd)} bound one, ${formatNumber(arrows.unbound)} free${
				arrows.dangling > 0 ? `, ⚠️ ${formatNumber(arrows.dangling)} dangling` : ''
			}`,
		],
		[
			'Assets',
			assets.total === 0
				? 'none'
				: `${formatNumber(assets.total)} (${formatTally(assets.byType)}), ${formatBytes(assets.totalSizeBytes)} declared`,
		],
		[
			'Collaboration',
			`${formatNumber(collaboration.visitors)} visitors, ${formatNumber(collaboration.commentThreads)} threads, ${formatNumber(collaboration.comments)} comments`,
		],
		['Schema', snapshot.schemaVersion === null ? 'unknown' : `version ${snapshot.schemaVersion}`],
		['Clock', `${snapshot.clock ?? 'unknown'} (document ${snapshot.documentClock ?? 'unknown'})`],
		[
			'File row',
			file
				? `${file.ownerType}-owned, created ${formatTimestamp(file.createdAt)}, updated ${formatTimestamp(file.updatedAt)}`
				: 'none (legacy room?)',
		],
		[
			'Sharing',
			file
				? [
						file.shared ? `shared (${file.sharedLinkType})` : 'not shared',
						file.published ? 'published' : null,
						file.isDeleted ? 'deleted' : null,
						file.isEmpty ? 'marked empty' : null,
						file.createSourceKind ? `from ${file.createSourceKind}` : null,
					]
						.filter(Boolean)
						.join(', ')
				: 'unknown',
		],
	]

	return (
		<>
			{stats.warnings.length > 0 && (
				<div className={styles.errorMessage}>
					{stats.warnings.length} check(s) failed — some counts below may be incomplete.{' '}
					{stats.warnings.slice(0, 3).join('; ')}
				</div>
			)}
			<div className={styles.userSummary}>
				<div className={styles.summaryGrid}>
					{summary.map(([label, value]) => (
						<div key={label} className={styles.summaryItem}>
							<span className={styles.fieldLabel}>{label}:</span>
							<span className={styles.fieldValue}>{value}</span>
						</div>
					))}
				</div>
			</div>
			{Object.keys(stats.styles).length > 0 && (
				<>
					<h4 className={styles.subTitle}>Styles</h4>
					<div className={styles.summaryGrid}>
						{Object.entries(stats.styles)
							.sort((a, b) => a[0].localeCompare(b[0]))
							.map(([prop, tally]) => (
								<div key={prop} className={styles.summaryItem}>
									<span className={styles.fieldLabel}>{prop}:</span>
									<span className={styles.fieldValue}>{formatTally(tally)}</span>
								</div>
							))}
					</div>
				</>
			)}
			<StructuredDataDisplay data={stats} />
		</>
	)
}
