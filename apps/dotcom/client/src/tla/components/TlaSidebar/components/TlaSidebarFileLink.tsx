import { TlaFile } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { ContextMenu as _ContextMenu } from 'radix-ui'
import { KeyboardEvent, MouseEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
	TldrawUiMenuContextProvider,
	preventDefault,
	useContainer,
	useMenuIsOpen,
	useValue,
} from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useApp } from '../../../hooks/useAppState'
import { useIsFileOwner } from '../../../hooks/useIsFileOwner'
import { useFileSidebarFocusContext } from '../../../providers/FileInputFocusProvider'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { F, defineMessages, useIntl } from '../../../utils/i18n'
import { toggleMobileSidebar, useIsSidebarOpenMobile } from '../../../utils/local-session-state'
import { FileItems, FileItemsWrapper } from '../../TlaFileMenu/TlaFileMenu'
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
	const intl = useIntl()
	const { fileSlug } = useParams<{ fileSlug: string }>()
	const { fileId } = item
	const isOwnFile = useIsFileOwner(fileId)
	const isActive = fileSlug === fileId
	const fileName = app.getFileName(fileId)
	const isMobile = getIsCoarsePointer()
	useEffect(() => {
		if (isActive) {
			scrollActiveFileLinkIntoView()
		}
	}, [isActive])

	const [isRenaming, setIsRenaming] = useState(false)
	const handleRenameAction = () => {
		if (isMobile) {
			const newName = prompt(intl.formatMessage(sidebarMessages.renameFile), fileName)?.trim()
			if (newName) {
				app.updateFile(fileId, { name: newName })
			}
		} else {
			setIsRenaming(true)
		}
	}

	const [_, handleOpenChange] = useMenuIsOpen(`file-context-menu-${fileId}`)

	return (
		<_ContextMenu.Root onOpenChange={handleOpenChange} modal={false}>
			<_ContextMenu.Trigger>
				<TlaSidebarFileLinkInner
					fileId={fileId}
					fileName={fileName}
					testId={testId}
					isActive={isActive}
					isOwnFile={isOwnFile}
					href={routes.tlaFile(fileId)}
					onClose={() => setIsRenaming(false)}
					isRenaming={isRenaming}
					handleRenameAction={handleRenameAction}
				/>
			</_ContextMenu.Trigger>
			<_ContextMenu.Content className="tlui-menu scrollable">
				{/* Don't show the context menu on mobile */}
				{!isMobile && (
					<TldrawUiMenuContextProvider type="context-menu" sourceId="context-menu">
						<FileItemsWrapper showAsSubMenu={false}>
							<FileItems
								source="sidebar-context-menu"
								fileId={fileId}
								onRenameAction={handleRenameAction}
							/>
						</FileItemsWrapper>
					</TldrawUiMenuContextProvider>
				)}
			</_ContextMenu.Content>
		</_ContextMenu.Root>
	)
}

export const sidebarMessages = defineMessages({
	renameFile: { defaultMessage: 'Rename file' },
})

export function TlaSidebarFileLinkInner({
	testId,
	fileId,
	isActive,
	isOwnFile,
	// owner,
	fileName,
	href,
	isRenaming,
	handleRenameAction,
	onClose,
}: {
	fileId: string
	testId: string | number
	isActive: boolean
	isOwnFile: boolean
	fileName: string
	href: string
	isRenaming: boolean
	handleRenameAction(): void
	onClose(): void
}) {
	const trackEvent = useTldrawAppUiEvents()
	const linkRef = useRef<HTMLAnchorElement | null>(null)
	const app = useApp()
	const focusCtx = useFileSidebarFocusContext()
	const isSidebarOpenMobile = useIsSidebarOpenMobile()

	useEffect(() => {
		// on mount, trigger rename action if this is a new file.
		if (isActive && focusCtx.shouldRenameNextNewFile) {
			focusCtx.shouldRenameNextNewFile = false
			handleRenameAction()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const handleKeyDown = (e: KeyboardEvent) => {
		if (!isActive) return
		if (e.key === 'Enter') {
			handleRenameAction()
		}
	}

	useEffect(() => {
		if (!isActive || !linkRef.current) return
		linkRef.current.focus()
	}, [isActive, linkRef])

	const file = useValue('file', () => app.getFile(fileId), [fileId, app])
	if (!file) return null

	if (isRenaming) {
		return <TlaSidebarRenameInline source="sidebar" fileId={fileId} onClose={onClose} />
	}

	return (
		<div
			className={classNames(styles.link, styles.hoverable)}
			data-active={isActive}
			data-element="file-link"
			data-testid={testId}
			data-is-own-file={isOwnFile}
			onDoubleClick={isOwnFile ? handleRenameAction : undefined}
			// We use this id to scroll the active file link into view when creating or deleting files.
			id={isActive ? ACTIVE_FILE_LINK_ID : undefined}
			role="listitem"
		>
			<Link
				ref={linkRef}
				onKeyDown={handleKeyDown}
				aria-label={fileName}
				onClick={(event) => {
					// Don't navigate if we are already on the file page
					// unless the user is holding ctrl or cmd to open in a new tab
					if (isActive && !(event.ctrlKey || event.metaKey)) {
						preventDefault(event)
					}
					if (isSidebarOpenMobile) {
						toggleMobileSidebar(false)
					}
					trackEvent('click-file-link', { source: 'sidebar' })
				}}
				to={href}
				className={styles.linkButton}
			/>
			<div className={styles.linkContent}>
				<div
					className={classNames(styles.label, 'tla-text_ui__regular', 'notranslate')}
					data-testid={`${testId}-name`}
				>
					{fileName}
				</div>
				{!isOwnFile && <GuestBadge file={file} href={href} />}
			</div>
			<TlaSidebarFileLinkMenu fileId={fileId} onRenameAction={handleRenameAction} />
		</div>
	)
}

function GuestBadge({ file, href }: { file: TlaFile; href: string }) {
	const container = useContainer()
	const ownerName = file.ownerName.trim()
	const testId = `guest-badge-${file.name}`
	const navigate = useNavigate()

	const handleToolTipClick = useCallback(
		(e: MouseEvent) => {
			e.preventDefault()
			// the tool tip needs pointer events in order to accept the click...
			// but that means it also blocks the link to the file. Here we bend
			// the world to our will, ruling by desire: clicking the tooltip will
			// navigate to the file
			navigate(href)
		},
		[navigate, href]
	)

	return (
		<div className={styles.guestBadge} data-testid={testId}>
			<TlaTooltipRoot disableHoverableContent>
				<TlaTooltipTrigger
					dir="ltr"
					// this is needed to prevent the tooltip from closing when clicking the badge
					onClick={handleToolTipClick}
					className={styles.guestBadgeTrigger}
				>
					<TlaIcon icon="group" className="tlui-guest-icon" />
				</TlaTooltipTrigger>
				<TlaTooltipPortal container={container}>
					<TlaTooltipContent
						// this is also needed to prevent the tooltip from closing when clicking the badge
						onPointerDownOutside={preventDefault}
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
