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

export function TlaSidebarFileLink({ item, index }: { item: RecentFile; index: number }) {
	const { fileId } = item
	const isOwnFile = useIsFileOwner(fileId)
	const { fileSlug } = useParams<{ fileSlug: string }>()
	const isActive = fileSlug === fileId
	const [isRenaming, setIsRenaming] = useState(false)
	const trackEvent = useTldrawAppUiEvents()

	const handleRenameAction = () => setIsRenaming(true)

	const handleRenameClose = () => setIsRenaming(false)

	const app = useApp()

	if (isRenaming) {
		return <TlaSidebarRenameInline source="sidebar" fileId={fileId} onClose={handleRenameClose} />
	}

	return (
		<div
			className={classNames(styles.link, styles.hoverable)}
			data-active={isActive}
			data-element="file-link"
			data-testid={`tla-file-link-${index}`}
			onDoubleClick={handleRenameAction}
		>
			<div className={styles.linkContent}>
				<div
					className={classNames(styles.label, 'tla-text_ui__regular', 'notranslate')}
					data-testid={`tla-file-name-${index}`}
				>
					{app.getFileName(fileId)} {isOwnFile ? null : <F defaultMessage="(Guest)" />}
				</div>
			</div>
			<Link
				onClick={() => trackEvent('click-file-link', { source: 'sidebar' })}
				to={getFilePath(fileId)}
				className={styles.linkButton}
			/>
			<TlaSidebarFileLinkMenu fileId={fileId} onRenameAction={handleRenameAction} />
		</div>
	)
}
