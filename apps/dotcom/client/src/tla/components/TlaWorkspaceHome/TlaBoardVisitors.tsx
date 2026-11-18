import { QueryResultType } from '@rocicorp/zero'
import { MENTIONABLE_VISITORS_LIMIT, queries } from '@tldraw/dotcom-shared'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../hooks/useAppState'
import { useBoardPresentUserIds } from '../../hooks/useBoardPresence'
import { TlaUserAvatar } from '../TlaUserAvatar/TlaUserAvatar'
import styles from './workspace-home.module.css'

type FileVisitors = QueryResultType<typeof queries.fileVisitors>

const MAX_VISIBLE_VISITORS = 3

/**
 * Everyone else who has opened the board, most recent first, with whoever is on it now pulled to
 * the front. The caller is left out: they have opened every board in their recents, so their own
 * avatar would be on every card.
 */
export function TlaBoardVisitors({ fileId }: { fileId: string }) {
	const visitors = useFileVisitors(fileId)
	const present = useBoardPresentUserIds(fileId)

	const sorted = useMemo(() => {
		if (!present?.size) return visitors
		// Stable, so each group keeps the query's most-recent-first order.
		return [...visitors].sort((a, b) => +present.has(b.userId) - +present.has(a.userId))
	}, [visitors, present])

	if (!sorted.length) return null

	const shown = sorted.slice(0, MAX_VISIBLE_VISITORS)
	const overflow = sorted.slice(MAX_VISIBLE_VISITORS)
	// The roster query stops at its limit, so past it the true count is unknown.
	const overflowLabel =
		sorted.length >= MENTIONABLE_VISITORS_LIMIT ? `+${overflow.length}+` : `+${overflow.length}`

	return (
		<div className={styles.visitors} data-testid="tla-board-visitors">
			{shown.map((visitor) => (
				<div
					key={visitor.userId}
					className={styles.visitor}
					data-present={!!present?.has(visitor.userId)}
					title={visitor.userName}
				>
					<TlaUserAvatar
						user={{ name: visitor.userName, email: '', color: visitor.userColor }}
						className={styles.visitorAvatar}
					/>
				</div>
			))}
			{overflow.length > 0 && (
				<div
					className={styles.visitor}
					data-present={overflow.some((v) => present?.has(v.userId))}
					title={overflow.map((v) => v.userName).join(', ')}
				>
					<div className={styles.visitorOverflow} aria-hidden>
						{overflowLabel}
					</div>
				</div>
			)}
		</div>
	)
}

function useFileVisitors(fileId: string): FileVisitors {
	const app = useApp()
	const [data, setData] = useState<FileVisitors>([])
	useEffect(() => {
		const view = app.materializeQuery<FileVisitors>(queries.fileVisitors({ fileId }))
		setData(view.data)
		const unlisten = view.addListener((next) => setData(next as FileVisitors))
		return () => {
			unlisten()
			view.destroy()
		}
	}, [app, fileId])
	return data
}
