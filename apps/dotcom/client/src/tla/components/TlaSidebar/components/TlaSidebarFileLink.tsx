import { TlaFile } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useContainer, useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'
import { useIsFileOwner } from '../../../hooks/useIsFileOwner'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { F } from '../../../utils/i18n'
import { getFilePath } from '../../../utils/urls'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import {
	TlaTooltipArrow,
	TlaTooltipContent,
	TlaTooltipPortal,
	TlaTooltipRoot,
	TlaTooltipTrigger,
} from '../../TlaTooltip/TlaTooltip'
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
	const linkRef = useRef<HTMLAnchorElement | null>(null)
	const app = useApp()

	const [isRenaming, setIsRenaming] = useState(debugIsRenaming)
	const handleRenameAction = () => setIsRenaming(true)
	const handleRenameClose = () => setIsRenaming(false)
	const handleKeyDown = (e: KeyboardEvent) => {
		if (!isActive) return
		if (e.key === 'Enter') {
			handleRenameAction()
		}
	}

	useEffect(() => {
		if (!isActive || !linkRef.current) return
		linkRef.current?.focus()
	}, [isActive, linkRef])

	const file = useValue('file', () => app.getFile(fileId), [fileId, app])
	if (!file) return null

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
			{!isOwnFile && <GuestBadge file={file} />}
			<div className={styles.linkContent}>
				<div
					className={classNames(styles.label, 'tla-text_ui__regular', 'notranslate')}
					data-testid={`${testId}-name`}
				>
					{fileName}
				</div>
			</div>
			<Link
				ref={linkRef}
				onKeyDown={handleKeyDown}
				onClick={() => trackEvent('click-file-link', { source: 'sidebar' })}
				to={href}
				className={styles.linkButton}
			/>
			<TlaSidebarFileLinkMenu fileId={fileId} onRenameAction={handleRenameAction} />
		</div>
	)
}

function GuestBadge({ file }: { file: TlaFile }) {
	const container = useContainer()
	const ownerName = file.ownerName.trim()
	const avatar = file.ownerAvatar
	return (
		<div className={styles.guestBadge}>
			<TlaTooltipRoot>
				<TlaTooltipTrigger
					dir="ltr"
					// this is needed to prevent the tooltip from closing when clicking the badge
					onClick={(e) => {
						e.preventDefault()
					}}
					className={styles.guestBadgeTrigger}
				>
					{avatar ? <img src={avatar} style={{ objectFit: 'cover' }} /> : <TlaIcon icon="group" />}
				</TlaTooltipTrigger>
				<TlaTooltipPortal container={container}>
					<TlaTooltipContent
						style={{ zIndex: 200 }}
						// this is also needed to prevent the tooltip from closing when clicking the badge
						onPointerDownOutside={(event) => {
							event.preventDefault()
						}}
					>
						{ownerName ? (
							<F defaultMessage={`Shared by {ownerName}`} values={{ ownerName }} />
						) : (
							<F defaultMessage="Shared with you" />
						)}
						<TlaTooltipArrow />
					</TlaTooltipContent>
				</TlaTooltipPortal>
			</TlaTooltipRoot>
		</div>
	)
}
