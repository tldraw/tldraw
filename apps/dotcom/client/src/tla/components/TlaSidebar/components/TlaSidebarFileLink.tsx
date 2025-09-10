import { useDraggable } from '@dnd-kit/core'
import { TlaFile } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { patch } from 'patchfork'
import { ContextMenu as _ContextMenu } from 'radix-ui'
import { KeyboardEvent, MouseEvent, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
	TldrawUiMenuContextProvider,
	isEqual,
	preventDefault,
	useContainer,
	useMenuIsOpen,
	useValue,
} from 'tldraw'
import { routes } from '../../../../routeDefs'
import { SidebarFileContext } from '../../../app/TldrawApp'
import { useApp } from '../../../hooks/useAppState'
import { useCanUpdateFile } from '../../../hooks/useCanUpdateFile'
import { useIsFileOwner } from '../../../hooks/useIsFileOwner'
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
let preventScrollOnNavigation = false

function scrollActiveFileLinkIntoView() {
	const el = document.getElementById(ACTIVE_FILE_LINK_ID)
	if (el) {
		// Check if we should prevent scrolling due to sidebar click
		if (preventScrollOnNavigation) {
			return
		}
		el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
	}
}

export function setPreventScrollOnNavigation(value: boolean) {
	preventScrollOnNavigation = value
	if (value) {
		// Clear the flag after a short delay to allow for immediate navigation
		setTimeout(() => {
			preventScrollOnNavigation = false
		}, 100)
	}
}

export function TlaSidebarFileLink({
	item,
	testId,
	className,
	context,
}: {
	item: RecentFile
	testId: string
	className?: string
	context: SidebarFileContext
}) {
	const app = useApp()
	const intl = useIntl()
	const { fileSlug } = useParams<{ fileSlug: string }>()
	const { fileId } = item
	const isActive = fileSlug === fileId
	const fileName = useValue('file name', () => app.getFileName(fileId), [fileId, app])
	const isMobile = getIsCoarsePointer()
	useEffect(() => {
		if (isActive) {
			scrollActiveFileLinkIntoView()
		}
	}, [isActive, fileId])

	const isRenaming = useValue(
		'shouldRename',
		() => isEqual(app.sidebarState.get().renameState, { fileId, context }),
		[fileId, app]
	)

	const isPinned = useValue('isPinned', () => !!app.getFileState(fileId)?.isPinned, [fileId, app])

	const handleRenameAction = () => {
		if (isMobile) {
			const newName = prompt(intl.formatMessage(sidebarMessages.renameFile), fileName)?.trim()
			if (newName) {
				app.updateFile(fileId, { name: newName })
			}
		} else {
			patch(app.sidebarState).renameState({ fileId, context })
		}
	}

	const [_, handleOpenChange] = useMenuIsOpen(`file-context-menu-${fileId}`)

	return (
		<_ContextMenu.Root onOpenChange={handleOpenChange} modal={false}>
			<_ContextMenu.Trigger>
				<TlaSidebarFileLinkInner
					fileId={fileId}
					fileName={fileName}
					isPinned={isPinned}
					testId={testId}
					isActive={isActive}
					href={routes.tlaFile(fileId)}
					onClose={() => patch(app.sidebarState).renameState(null)}
					isRenaming={isRenaming}
					handleRenameAction={handleRenameAction}
					className={className}
					context={context}
				/>
			</_ContextMenu.Trigger>
			<_ContextMenu.Content className="tlui-menu tlui-scrollable">
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

const pinIcon = (
	<svg
		style={{
			position: 'relative',
			top: '1px',
			left: '-1px',
		}}
		width="7"
		height="12"
		viewBox="0 0 7 12"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<line
			x1="3.5"
			y1="2.5"
			x2="3.5"
			y2="12.5"
			stroke="var(--tla-color-text-3)"
			strokeLinecap="round"
		/>
		<path
			d="M0.886038 5.34189C0.954095 5.13772 1.14516 5 1.36038 5H5.63962C5.85484 5 6.04591 5.13772 6.11396 5.34189L6.78063 7.34189C6.88855 7.66565 6.64757 8 6.30629 8H0.693713C0.352434 8 0.111449 7.66565 0.219371 7.34189L0.886038 5.34189Z"
			fill="var(--tla-color-text-3)"
		/>
		<path d="M2.38314 1H4.61686L5.17529 5H1.82471L2.38314 1Z" fill="var(--tla-color-text-3)" />
		<path
			d="M0.655317 0.621268C0.576424 0.305694 0.815103 0 1.14039 0H5.85961C6.1849 0 6.42358 0.305695 6.34468 0.621268L6.09468 1.62127C6.03904 1.84385 5.83905 2 5.60961 2H1.39039C1.16095 2 0.960963 1.84385 0.905317 1.62127L0.655317 0.621268Z"
			fill="var(--tla-color-text-3)"
		/>
	</svg>
)

export function TlaSidebarFileLinkInner({
	isPinned,
	testId,
	fileId,
	isActive,
	// owner,
	fileName,
	href,
	isRenaming,
	handleRenameAction,
	onClose,
	className,
	context,
}: {
	fileId: string
	isPinned: boolean
	testId: string | number
	isActive: boolean
	fileName: string
	href: string
	isRenaming: boolean
	handleRenameAction(): void
	onClose(): void
	className?: string
	context: SidebarFileContext
}) {
	const trackEvent = useTldrawAppUiEvents()
	const linkRef = useRef<HTMLAnchorElement | null>(null)
	const app = useApp()
	const isSidebarOpenMobile = useIsSidebarOpenMobile()

	const canUpdateFile = useCanUpdateFile(fileId)
	const isOwnFile = useIsFileOwner(fileId)
	const file = useValue('file', () => app.getFile(fileId), [fileId, app])

	const dnd = useDraggable({
		id: context === 'my-files-pinned' ? fileId : `${fileId}:${context}`,
		data:
			context === 'my-files-pinned'
				? {
						type: 'pinned',
						fileId,
					}
				: {
						type: 'file',
						fileId,
					},
		disabled: false,
	})

	const handleKeyDown = (e: KeyboardEvent) => {
		if (!isActive) return
		if (e.key === 'Enter') {
			handleRenameAction()
		}
	}

	useEffect(() => {
		if (!isActive || !linkRef.current) return

		// Focus the element, but prevent scroll if we're in prevent mode
		linkRef.current.focus({ preventScroll: preventScrollOnNavigation })
	}, [isActive, linkRef])

	if (!file) return null

	if (isRenaming) {
		return <TlaSidebarRenameInline source="sidebar" fileId={fileId} onClose={onClose} />
	}

	return (
		<div
			className={classNames(styles.sidebarFileListItem, styles.hoverable, className)}
			data-dragging={dnd.isDragging}
			data-active={isActive}
			data-element="file-link"
			data-testid={testId}
			data-is-own-file={isOwnFile}
			{...(context === 'my-files-pinned' && {
				'data-pinned-file-id': fileId,
				'data-pinned-index': app.getFileState(fileId)?.pinnedIndex || 'a0',
			})}
			onDoubleClick={canUpdateFile ? handleRenameAction : undefined}
			// We use this id to scroll the active file link into view when creating or deleting files.
			id={isActive ? ACTIVE_FILE_LINK_ID : undefined}
			{...dnd.attributes}
			{...dnd.listeners}
			ref={dnd.setNodeRef}
			role="listitem"
			draggable={false}
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
					} else {
						// Set flag to prevent scrolling when navigation occurs due to sidebar click
						setPreventScrollOnNavigation(true)
					}
					if (isSidebarOpenMobile) {
						toggleMobileSidebar(false)
					}
					trackEvent('click-file-link', { source: 'sidebar' })
				}}
				to={href}
				className={styles.sidebarFileListItemButton}
				draggable={false}
			/>
			<div className={styles.sidebarFileListItemContent}>
				{isPinned && pinIcon}
				<div
					className={classNames(
						styles.sidebarFileListItemLabel,
						'tla-text_ui__regular',
						'notranslate'
					)}
					data-testid={`${testId}-name`}
				>
					{fileName}
				</div>
				{!isOwnFile && !file.owningGroupId && <GuestBadge file={file} href={href} />}
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

	const ownedByGroup = !!file.owningGroupId

	return (
		<div className={styles.sidebarFileListItemGuestBadge} data-testid={testId}>
			<TlaTooltipRoot disableHoverableContent>
				<TlaTooltipTrigger
					dir="ltr"
					// this is needed to prevent the tooltip from closing when clicking the badge
					onClick={handleToolTipClick}
					className={styles.sidebarFileListItemGuestBadgeTrigger}
				>
					<TlaIcon icon={'group'} className="tlui-guest-icon" />
				</TlaTooltipTrigger>
				<TlaTooltipPortal container={container}>
					<TlaTooltipContent
						// this is also needed to prevent the tooltip from closing when clicking the badge
						onPointerDownOutside={preventDefault}
					>
						{ownerName && ownedByGroup ? (
							// <F defaultMessage={`In group {ownerName}`} values={{ ownerName }} />
							`In group ${ownerName}`
						) : ownerName ? (
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
