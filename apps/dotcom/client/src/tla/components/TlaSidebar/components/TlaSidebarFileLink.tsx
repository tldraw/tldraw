import classNames from 'classnames'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../../../hooks/useAppState'
import { useIsFileOwner } from '../../../hooks/useIsFileOwner'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getFilePath } from '../../../utils/urls'
import { TlaCollaborator } from '../../TlaCollaborator/TlaCollaborator'
import styles from '../sidebar.module.css'
import { TlaSidebarFileLinkMenu } from './TlaSidebarFileLinkMenu'
import { TlaSidebarRenameInline } from './TlaSidebarRenameInline'
import { RecentFile } from './sidebar-shared'

const ACTIVE_FILE_LINK_ID = 'tla-active-file-link'
function scrollActiveFileLinkIntoView() {
	const el = document.getElementById(ACTIVE_FILE_LINK_ID)
	if (el) {
		el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
	}
}

export function TlaSidebarFileLink({ item, testId }: { item: RecentFile; testId: string }) {
	const app = useApp()
	const { fileSlug } = useParams<{ fileSlug: string }>()
	const { fileId } = item
	const isOwnFile = useIsFileOwner(fileId)
	const isActive = fileSlug === fileId
	useEffect(() => {
		if (isActive) {
			scrollActiveFileLinkIntoView()
		}
	}, [isActive])

	return (
		<TlaSidebarFileLinkInner
			fileId={fileId}
			testId={testId}
			isActive={isActive}
			isOwnFile={isOwnFile}
			fileName={app.getFileName(fileId)}
			href={getFilePath(fileId)}
		/>
	)
}

export function TlaSidebarFileLinkInner({
	testId,
	fileId,
	isActive,
	isOwnFile,
	// owner,
	fileName,
	href,
	debugIsRenaming = false,
}: {
	fileId: string
	testId: string | number
	isActive: boolean
	isOwnFile: boolean
	fileName: string
	href: string
	debugIsRenaming?: boolean
}) {
	const trackEvent = useTldrawAppUiEvents()

	const [isRenaming, setIsRenaming] = useState(debugIsRenaming)
	const handleRenameAction = () => setIsRenaming(true)
	const handleRenameClose = () => setIsRenaming(false)

	if (isRenaming) {
		return <TlaSidebarRenameInline source="sidebar" fileId={fileId} onClose={handleRenameClose} />
	}

	return (
		<div
			className={classNames(styles.link, styles.hoverable)}
			data-active={isActive}
			data-element="file-link"
			data-testid={testId}
			onDoubleClick={isOwnFile ? handleRenameAction : undefined}
			// We use this id to scroll the active file link into view when creating or deleting files.
			id={isActive ? ACTIVE_FILE_LINK_ID : undefined}
		>
			<div className={styles.linkContent}>
				<div
					className={classNames(styles.label, 'tla-text_ui__regular', 'notranslate')}
					data-testid={`${testId}-name`}
				>
					{fileName}
				</div>
				{isOwnFile ? null : (
					<div className={styles.collaborator}>
						<TlaCollaborator size="small" idle />
					</div>
				)}
			</div>
			<Link
				onClick={() => trackEvent('click-file-link', { source: 'sidebar' })}
				to={href}
				className={styles.linkButton}
			/>
			<TlaSidebarFileLinkMenu fileId={fileId} onRenameAction={handleRenameAction} />
		</div>
	)
}
