import { useState } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { F } from '../../../utils/i18n'
import styles from '../sidebar.module.css'
import { TlaSidebarFileLink } from './TlaSidebarFileLink'

const TriangleIcon = () => {
	return (
		<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path d="M4.5 6.5H11.5L8 11L4.5 6.5Z" fill="currentColor" />
		</svg>
	)
}

export function TlaSidebarGroupItem({ groupId }: { groupId: string }) {
	const app = useApp()
	const [isCollapsed, setIsCollapsed] = useState(false)
	const [isShowingAll, setIsShowingAll] = useState(false)

	const group = useValue('group', () => app.getGroupMembership(groupId), [app, groupId])

	if (!group) return null

	const files = group.groupFiles.map((gf) => gf.file)
	const MAX_FILES_TO_SHOW = 4
	const isOverflowing = files.length > MAX_FILES_TO_SHOW
	const filesToShow = isShowingAll || !isOverflowing ? files : files.slice(0, MAX_FILES_TO_SHOW)

	return (
		<div className={styles.sidebarGroupItem}>
			<button
				className={styles.sidebarGroupItemHeader}
				onClick={() => setIsCollapsed(!isCollapsed)}
				aria-expanded={!isCollapsed}
			>
				<span className={styles.sidebarGroupItemTitle}>{group.group.name}</span>

				<TriangleIcon />
			</button>

			{!isCollapsed && (
				<div className={styles.sidebarGroupItemContent}>
					{filesToShow.map((file, i) => (
						<TlaSidebarFileLink
							key={`group-file-${file.id}`}
							item={{
								fileId: file.id,
								date: file.updatedAt,
								isPinned: false,
							}}
							testId={`tla-group-file-${i}`}
						/>
					))}
					{isOverflowing && !isShowingAll && (
						<button className={styles.showAllButton} onClick={() => setIsShowingAll(true)}>
							<F defaultMessage="Show more" />
						</button>
					)}
				</div>
			)}
		</div>
	)
}
