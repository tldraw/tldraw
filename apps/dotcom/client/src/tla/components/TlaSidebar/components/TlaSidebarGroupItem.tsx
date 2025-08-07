import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { tltime, useValue } from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useApp } from '../../../hooks/useAppState'
import { useFileSidebarFocusContext } from '../../../providers/FileInputFocusProvider'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { F } from '../../../utils/i18n'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'
import { TlaSidebarFileLink } from './TlaSidebarFileLink'

const TriangleIcon = ({ angle = 0 }: { angle?: number }) => {
	return (
		<svg
			width="8"
			height="8"
			viewBox="4 4 8 8"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			style={{
				transform: `rotate(${angle + 180}deg)`,
			}}
		>
			<path
				d="M5.12764 7.30697C4.8722 6.97854 5.10625 6.5 5.52232 6.5H10.4777C10.8938 6.5 11.1278 6.97854 10.8724 7.30697L8.39468 10.4926C8.1945 10.7499 7.8055 10.7499 7.60532 10.4926L5.12764 7.30697Z"
				fill="currentColor"
			/>
		</svg>
	)
}

export function TlaSidebarGroupItem({ groupId }: { groupId: string }) {
	const app = useApp()
	const navigate = useNavigate()
	const trackEvent = useTldrawAppUiEvents()
	const focusCtx = useFileSidebarFocusContext()
	const rCanCreate = useRef(true)

	const isExpanded = useValue(
		'isExpanded',
		() => app.sidebarState.get().expandedGroups.has(groupId),
		[app, groupId]
	)
	const setIsExpanded = useCallback(
		(isExpanded: boolean) => {
			const expandedGroups = new Set(app.sidebarState.get().expandedGroups)
			if (isExpanded) {
				expandedGroups.add(groupId)
			} else {
				expandedGroups.delete(groupId)
			}
			app.sidebarState.set({ expandedGroups })
		},
		[app, groupId]
	)
	const [isShowingAll, setIsShowingAll] = useState(false)

	const group = useValue('group', () => app.getGroupMembership(groupId), [app, groupId])

	const handleCreateFile = useCallback(async () => {
		if (!rCanCreate.current) return

		const res = await app.createGroupFile(groupId)

		if (res.ok) {
			const isMobile = getIsCoarsePointer()
			if (!isMobile) {
				focusCtx.shouldRenameNextNewFile = true
			}
			navigate(routes.tlaFile(res.value.fileId))
			trackEvent('create-file', { source: 'sidebar' })
			rCanCreate.current = false
			tltime.setTimeout('can create again', () => (rCanCreate.current = true), 1000)
		}
	}, [app, groupId, navigate, trackEvent, focusCtx])

	if (!group) return null

	let files = group.groupFiles.map((gf) => gf.file)
	files = files.slice().sort((a, b) => b.updatedAt - a.updatedAt)
	const MAX_FILES_TO_SHOW = 4
	const isOverflowing = files.length > MAX_FILES_TO_SHOW
	const filesToShow = isShowingAll || !isOverflowing ? files : files.slice(0, MAX_FILES_TO_SHOW)

	return (
		<div className={styles.sidebarGroupItem} data-expanded={isExpanded}>
			<button
				className={styles.sidebarGroupItemHeader}
				onClick={() => setIsExpanded(!isExpanded)}
				aria-expanded={isExpanded}
			>
				<span className={styles.sidebarGroupItemTitle}>{group.group.name}</span>
				<TriangleIcon angle={isExpanded ? 180 : 90} />
				<div className={styles.sidebarGroupItemButtons}>
					<button
						className={styles.sidebarGroupItemButton}
						onClick={(e) => {
							e.stopPropagation()
							// TODO: Implement menu functionality
						}}
						title="More options"
						type="button"
					>
						<TlaIcon icon="dots-vertical-strong" />
					</button>
					<button
						className={styles.sidebarGroupItemButton}
						onClick={(e) => {
							e.stopPropagation()
							handleCreateFile()
						}}
						title="New file"
						type="button"
					>
						<TlaIcon icon="edit" />
					</button>
				</div>
			</button>

			{isExpanded && (
				<div className={styles.sidebarGroupItemContent}>
					{filesToShow.map((file, i) => (
						<TlaSidebarFileLink
							key={`group-file-${file.id}`}
							className={styles.sidebarGroupItemFile}
							item={{
								fileId: file.id,
								date: file.updatedAt,
								isPinned: false,
							}}
							testId={`tla-group-file-${i}`}
						/>
					))}
					{isOverflowing &&
						(isShowingAll ? (
							<button className={styles.showAllButton} onClick={() => setIsShowingAll(false)}>
								<F defaultMessage="Show less" />
							</button>
						) : (
							<button className={styles.showAllButton} onClick={() => setIsShowingAll(true)}>
								<F defaultMessage="Show more" />
							</button>
						))}
				</div>
			)}
		</div>
	)
}
