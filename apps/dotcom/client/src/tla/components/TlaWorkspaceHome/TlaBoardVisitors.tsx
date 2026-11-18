import { QueryResultType } from '@rocicorp/zero'
import { MENTIONABLE_VISITORS_LIMIT, queries } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { useEffect, useMemo, useState } from 'react'
import { getFirstCharacter, useValue } from 'tldraw'
import { getFileVisitDate } from '../../app/TldrawApp'
import { useApp } from '../../hooks/useAppState'
import { useBoardPresentUserIds } from '../../hooks/useBoardPresence'
import styles from './workspace-home.module.css'

type FileVisitors = QueryResultType<typeof queries.fileVisitors>
type Visitor = FileVisitors[number]

const MAX_VISIBLE_VISITORS = 3

/**
 * Everyone who has opened the board, the caller included, most recent first, with whoever is on it
 * now pulled to the front.
 */
export function TlaBoardVisitors({ fileId }: { fileId: string }) {
	const others = useFileVisitors(fileId)
	const me = useOwnVisit(fileId)
	const present = useBoardPresentUserIds(fileId)

	const sorted = useMemo(() => {
		const visitors = me ? [...others, me].sort((a, b) => b.lastVisitAt - a.lastVisitAt) : others
		if (!present?.size) return visitors
		// Stable, so each group keeps its most-recent-first order.
		return [...visitors].sort((a, b) => +present.has(b.userId) - +present.has(a.userId))
	}, [others, me, present])

	if (!sorted.length) return null

	const shown = sorted.slice(0, MAX_VISIBLE_VISITORS)
	const overflow = sorted.slice(MAX_VISIBLE_VISITORS)
	// The roster query stops at its limit, so past it the true count is unknown.
	const overflowLabel =
		others.length >= MENTIONABLE_VISITORS_LIMIT ? `+${overflow.length}+` : `+${overflow.length}`

	// The markup and classes of the editor's people menu facepile (DefaultPeopleMenuFacePile), which
	// can't be mounted here: its avatars read presence from an editor, and the gallery has none.
	return (
		<div className={classNames('tlui-people-menu__avatars', styles.visitors)}>
			{shown.map((visitor) => (
				<div
					key={visitor.userId}
					className={classNames('tlui-people-menu__avatar', styles.visitor)}
					style={{ backgroundColor: visitor.userColor || undefined }}
					data-present={!!present?.has(visitor.userId)}
					title={visitor.userName}
				>
					{getFirstCharacter(visitor.userName)}
				</div>
			))}
			{overflow.length > 0 && (
				<div
					className={classNames(
						'tlui-people-menu__avatar',
						'tlui-people-menu__more',
						styles.visitor
					)}
					data-present={overflow.some((v) => present?.has(v.userId))}
					title={overflow.map((v) => v.userName).join(', ')}
				>
					{overflowLabel}
				</div>
			)}
		</div>
	)
}

/**
 * The caller's own roster entry. `fileVisitors` leaves the caller out, since the mention picker it
 * serves must not offer you yourself, so it is rebuilt here from the caller's own file state.
 */
function useOwnVisit(fileId: string): Visitor | null {
	const app = useApp()
	return useValue(
		'own board visit',
		() => {
			const lastVisitAt = getFileVisitDate(app.getFileState(fileId))
			if (lastVisitAt === undefined) return null
			const user = app.getUser()
			return { userId: app.userId, fileId, userName: user.name, userColor: user.color, lastVisitAt }
		},
		[app, fileId]
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
