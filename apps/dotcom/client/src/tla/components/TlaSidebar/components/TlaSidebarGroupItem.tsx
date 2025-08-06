import { useCallback, useState } from 'react'
import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { F } from '../../../utils/i18n'
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
			<path d="M4.5 6.5H11.5L8 11L4.5 6.5Z" fill="currentColor" />
		</svg>
	)
}

export function TlaSidebarGroupItem({ groupId }: { groupId: string }) {
	const app = useApp()
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

	if (!group) return null

	const files = group.groupFiles.map((gf) => gf.file)
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
