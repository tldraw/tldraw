import { useDraggable } from '@dnd-kit/core'
import { TlaFile } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { Collapsible, ContextMenu as _ContextMenu } from 'radix-ui'
import { KeyboardEvent, MouseEvent, PropsWithChildren, useCallback, useEffect, useRef } from 'react'
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
import { useHasFlag } from '../../../hooks/useHasFlag'
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
import { PresenceBadges } from '../TempGroupsUi'
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
	}, [isActive])

	const isRenaming = useValue(
		'shouldRename',
		() => isEqual(app.sidebarState.get().renameState, { fileId, context }),
		[fileId, app]
	)

	const handleRenameAction = () => {
		if (isMobile) {
			const newName = prompt(intl.formatMessage(sidebarMessages.renameFile), fileName)?.trim()
			if (newName) {
				app.updateFile(fileId, { name: newName })
			}
		} else {
			app.sidebarState.update((state) => ({ ...state, renameState: { fileId, context } }))
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
					href={routes.tlaFile(fileId)}
					onClose={() => app.sidebarState.update((state) => ({ ...state, renameState: null }))}
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

export function TlaSidebarFileLinkInner({
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
		linkRef.current.focus()
	}, [isActive, linkRef])

	const hasGroups = useHasFlag('groups')

	if (!file) return null

	if (isRenaming) {
		return <TlaSidebarRenameInline source="sidebar" fileId={fileId} onClose={onClose} />
	}

	return (
		<Collapse isOpen={!dnd.isDragging || context === 'my-files-pinned'}>
			<div
				className={classNames(
					styles.sidebarFileListItem,
					styles.hoverable,
					{
						[styles.sidebarFileListItemDragging]: dnd.isDragging,
					},
					className
				)}
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
					{hasGroups && (
						<PresenceBadges
							fileId={fileId}
							className={styles.sidebarFileListItemPresenceBadges}
							badgeClassName={styles.sidebarFileListItemPresenceBadge}
						/>
					)}
				</div>
				<TlaSidebarFileLinkMenu fileId={fileId} onRenameAction={handleRenameAction} />
			</div>
		</Collapse>
	)
}

function Collapse({ children, isOpen }: PropsWithChildren<{ isOpen: boolean }>) {
	return (
		<Collapsible.Root open={isOpen} asChild>
			<Collapsible.Content className={styles.CollapsibleContent}>{children}</Collapsible.Content>
		</Collapsible.Root>
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
