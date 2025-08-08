import { Collapsible } from 'radix-ui'
import { Fragment, useState } from 'react'
import { uniqueId, useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { F } from '../../../utils/i18n'
import styles from '../sidebar.module.css'
import { RecentFile } from './sidebar-shared'
import { TlaSidebarFileLink } from './TlaSidebarFileLink'
import { TlaSidebarFileSection } from './TlaSidebarFileSection'
import { TlaSidebarGroupItem } from './TlaSidebarGroupItem'
import { TlaSidebarInlineInput } from './TlaSidebarInlineInput'

export function TlaSidebarRecentFilesNew() {
	const app = useApp()

	const [isShowingAll, setIsShowingAll] = useState(false)
	const [isCreatingGroup, setIsCreatingGroup] = useState(false)
	const groupMemberships = useValue('groupMemberships', () => app.getGroupMemberships(), [app])

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
				} else if (
					!groupMemberships.some(
						(group) => group.group.id === app.getFile(item.fileId)?.owningGroupId
					)
				) {
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

	const handleCreateGroup = () => {
		const isMobile = getIsCoarsePointer()
		if (isMobile) {
			const name = window.prompt('Enter a name for the new group')
			if (!name) return
			app.z.mutate.group.create({ id: uniqueId(), name })
		} else {
			setIsCreatingGroup(true)
		}
	}

	const handleGroupCreateComplete = (name: string) => {
		app.z.mutate.group.create({ id: uniqueId(), name })
		setIsCreatingGroup(false)
	}

	const handleGroupCreateCancel = () => {
		setIsCreatingGroup(false)
	}

	if (!results) throw Error('Could not get files')

	const MAX_FILES_TO_SHOW = groupMemberships.length > 0 ? 6 : +Infinity
	const isOverflowing = results.otherFiles.length > MAX_FILES_TO_SHOW
	const filesToShow = results.otherFiles.slice(0, MAX_FILES_TO_SHOW)
	const hiddenFiles = results.otherFiles.slice(MAX_FILES_TO_SHOW)

	return (
		<Fragment>
			{results.pinnedFiles.length ? (
				<TlaSidebarFileSection title={<F defaultMessage="Favorites" />} onePixelOfPaddingAtTheTop>
					{results.pinnedFiles.map((item, i) => (
						<TlaSidebarFileLink
							context="my-files"
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
					title={<F defaultMessage="My files" />}
				>
					{filesToShow.map((item, i) => (
						<TlaSidebarFileLink
							context="my-files"
							key={'file_link_today_' + item.fileId}
							item={item}
							testId={`tla-file-link-today-${i}`}
						/>
					))}
				</TlaSidebarFileSection>
			) : null}
			<Collapsible.Root open={isShowingAll}>
				<Collapsible.Content className={styles.CollapsibleContent}>
					{hiddenFiles.map((item, i) => (
						<TlaSidebarFileLink
							context="my-files"
							key={'file_link_today_' + item.fileId}
							item={item}
							testId={`tla-file-link-today-${i}`}
						/>
					))}
				</Collapsible.Content>
				<Collapsible.Trigger asChild>
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
				</Collapsible.Trigger>
			</Collapsible.Root>
			<TlaSidebarFileSection
				className={styles.sidebarFileSectionGroups}
				title={<F defaultMessage="Groups" />}
				iconButton={
					isCreatingGroup
						? undefined
						: {
								icon: 'plus',
								onClick: handleCreateGroup,
								title: 'Create new group',
							}
				}
			>
				{isCreatingGroup && (
					<TlaSidebarInlineInput
						data-testid="tla-sidebar-create-group-input"
						defaultValue="New group"
						placeholder="Enter group name..."
						onComplete={handleGroupCreateComplete}
						onCancel={handleGroupCreateCancel}
						className={styles.sidebarGroupCreateInput}
						wrapperClassName={styles.sidebarGroupCreateInputWrapper}
					/>
				)}
				{groupMemberships.map((group) => (
					<TlaSidebarGroupItem key={group.group.id} groupId={group.group.id} />
				))}
			</TlaSidebarFileSection>
		</Fragment>
	)
}
