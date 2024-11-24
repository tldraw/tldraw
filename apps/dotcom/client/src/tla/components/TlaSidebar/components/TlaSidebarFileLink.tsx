import classNames from 'classnames'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp } from '../../../hooks/useAppState'
import { useIsFileOwner } from '../../../hooks/useIsFileOwner'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { F } from '../../../utils/i18n'
import { getFilePath } from '../../../utils/urls'
import styles from '../sidebar.module.css'
import { TlaSidebarFileLinkMenu } from './TlaSidebarFileLinkMenu'
import { TlaSidebarRenameInline } from './TlaSidebarRenameInline'
import { RecentFile } from './sidebar-shared'

export function TlaSidebarFileLink({ item, testId }: { item: RecentFile; testId: string }) {
	const app = useApp()
	const { fileSlug } = useParams<{ fileSlug: string }>()
	const { fileId } = item
	const isOwnFile = useIsFileOwner(fileId)
	const isActive = fileSlug === fileId

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
			onDoubleClick={handleRenameAction}
		>
			<div className={styles.linkContent}>
				<div className={classNames(styles.label, 'tla-text_ui__regular', 'notranslate')}>
					{fileName} {isOwnFile ? null : <F defaultMessage="(Guest)" />}
				</div>
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
