import { Fragment, useState } from 'react'
import { uniqueId, useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { F } from '../../../utils/i18n'
import styles from '../sidebar.module.css'
import { RecentFile } from './sidebar-shared'
import { TlaSidebarFileLink } from './TlaSidebarFileLink'
import { TlaSidebarFileSection } from './TlaSidebarFileSection'
import { TlaSidebarGroupItem } from './TlaSidebarGroupItem'

export function TlaSidebarRecentFilesNew() {
	const app = useApp()

	const [isShowingAll, setIsShowingAll] = useState(false)

	const results = useValue(
		'recent user files',
		() => {
			const recentFiles = app.getUserRecentFiles()
			if (!recentFiles) return null

			const pinnedFiles: RecentFile[] = []
			const otherFiles: RecentFile[] = []

			for (const item of recentFiles) {
				const { isPinned } = item
				if (isPinned) {
					pinnedFiles.push(item)
				} else {
					otherFiles.push(item)
				}
			}

			return {
				pinnedFiles,
				otherFiles,
			}
		},
		[app]
	)

	const groupMemberships = useValue('groupMemberships', () => app.getGroupMemberships(), [app])

	const handleCreateGroup = () => {
		const name = window.prompt('Enter a name for the new group')
		if (!name) return
		app.z.mutate.group.create({ id: uniqueId(), name })
	}

	if (!results) throw Error('Could not get files')

	const MAX_FILES_TO_SHOW = groupMemberships.length > 0 ? 6 : +Infinity
	const isOverflowing = results.otherFiles.length > MAX_FILES_TO_SHOW
	const filesToShow =
		isShowingAll || !isOverflowing
			? results.otherFiles
			: results.otherFiles.slice(0, MAX_FILES_TO_SHOW)

	return (
		<Fragment>
			{results.pinnedFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="Pinned" />} onePixelOfPaddingAtTheTop>
					{results.pinnedFiles.map((item, i) => (
						<TlaSidebarFileLink
							key={'file_link_pinned_' + item.fileId}
							item={item}
							testId={`tla-file-link-pinned-${i}`}
						/>
					))}
				</TlaSidebarFileSection>
			) : null}
			{filesToShow.length ? (
				<TlaSidebarFileSection
					className={styles.sidebarFileSectionRecent}
					title={<F defaultMessage="Recent" />}
				>
					{filesToShow.map((item, i) => (
						<TlaSidebarFileLink
							key={'file_link_today_' + item.fileId}
							item={item}
							testId={`tla-file-link-today-${i}`}
						/>
					))}
				</TlaSidebarFileSection>
			) : null}
			{isOverflowing &&
				(isShowingAll ? (
					<button className={styles.showAllButton} onClick={() => setIsShowingAll(false)}>
						<F defaultMessage="See less" />
					</button>
				) : (
					<button className={styles.showAllButton} onClick={() => setIsShowingAll(true)}>
						<F defaultMessage="See more" />
					</button>
				))}
			{groupMemberships.length > 0 && (
				<TlaSidebarFileSection
					className={styles.sidebarFileSectionGroups}
					title={<F defaultMessage="Groups" />}
					iconButton={{
						icon: 'plus',
						onClick: handleCreateGroup,
						title: 'Create new group',
					}}
				>
					{groupMemberships.map((group) => (
						<TlaSidebarGroupItem key={group.group.id} groupId={group.group.id} />
					))}
				</TlaSidebarFileSection>
			)}
		</Fragment>
	)
}
