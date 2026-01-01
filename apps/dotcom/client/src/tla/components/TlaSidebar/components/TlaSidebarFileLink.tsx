import { TlaFile } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { ContextMenu as _ContextMenu } from 'radix-ui'
import { KeyboardEvent, MouseEvent, useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
	TldrawUiMenuContextProvider,
	TldrawUiTooltip,
	isEqual,
	preventDefault,
	useMaybeEditor,
	useMenuIsOpen,
	useValue,
} from 'tldraw'
import { routes } from '../../../../routeDefs'
import { useApp } from '../../../hooks/useAppState'
import { useDragTracking } from '../../../hooks/useDragTracking'
import { useHasFlag } from '../../../hooks/useHasFlag'
import { useIsDragging } from '../../../hooks/useIsDragging'
import { useHasFileAdminRights } from '../../../hooks/useIsFileOwner'
import { useIsFilePinned } from '../../../hooks/useIsFilePinned'
import { useTldrawAppUiEvents } from '../../../utils/app-ui-events'
import { getIsCoarsePointer } from '../../../utils/getIsCoarsePointer'
import { F, defineMessages, useIntl } from '../../../utils/i18n'
import { toggleMobileSidebar, useIsSidebarOpenMobile } from '../../../utils/local-session-state'
import { FileItems } from '../../TlaFileMenu/TlaFileMenu'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'
import { TlaSidebarFileLinkMenu } from './TlaSidebarFileLinkMenu'
import { TlaSidebarRenameInline } from './TlaSidebarRenameInline'
import { pinIcon } from './pinIcon'
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
	groupId,
}: {
	item: RecentFile
	testId: string
	groupId: string
	className?: string
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
		() => isEqual(app.sidebarState.get().renameState, { fileId, groupId }),
		[fileId, app]
	)

	const isPinned = useIsFilePinned(fileId, groupId)

	const handleRenameAction = () => {
		if (isMobile) {
			const newName = prompt(intl.formatMessage(sidebarMessages.renameFile), fileName)?.trim()
			if (newName) {
				app.updateFile(fileId, { name: newName })
			}
		} else {
			app.sidebarState.update((prev) => ({ ...prev, renameState: { fileId, groupId } }))
		}
	}

	const [_, handleOpenChange] = useMenuIsOpen(`file-context-menu-${fileId}`)

	return (
		<_ContextMenu.Root onOpenChange={handleOpenChange} modal={false}>
			<_ContextMenu.Trigger>
				<TlaSidebarFileLinkInner
					fileId={fileId}
					groupId={groupId}
					fileName={fileName}
					isPinned={isPinned}
					testId={testId}
					isActive={isActive}
					href={routes.tlaFile(fileId)}
					onClose={() => app.sidebarState.update((prev) => ({ ...prev, renameState: null }))}
					isRenaming={isRenaming}
					handleRenameAction={handleRenameAction}
					className={className}
				/>
			</_ContextMenu.Trigger>
			<_ContextMenu.Content className="tlui-menu tlui-scrollable">
				{/* Don't show the context menu on mobile */}
				{!isMobile && (
					<TldrawUiMenuContextProvider type="context-menu" sourceId="context-menu">
						<FileItems
							source="sidebar-context-menu"
							fileId={fileId}
							onRenameAction={handleRenameAction}
							groupId={groupId}
						/>
					</TldrawUiMenuContextProvider>
				)}
			</_ContextMenu.Content>
		</_ContextMenu.Root>
	)
}

export const sidebarMessages = defineMessages({
	renameFile: { defaultMessage: 'Rename file' },
	selected: { defaultMessage: 'selected' },
})

export function TlaSidebarFileLinkInner({
	isPinned,
	testId,
	fileId,
	isActive,
	fileName,
	href,
	isRenaming,
	handleRenameAction,
	onClose,
	groupId,
	className,
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
	groupId: string
	className?: string
}) {
	const trackEvent = useTldrawAppUiEvents()
	const linkRef = useRef<HTMLAnchorElement | null>(null)
	const app = useApp()
	const isSidebarOpenMobile = useIsSidebarOpenMobile()
	const editor = useMaybeEditor()
	const intl = useIntl()
	const enhancedA11yMode = useValue('enhancedA11yMode', () => editor?.user.getEnhancedA11yMode(), [
		editor,
	])

	const { startDragTracking } = useDragTracking()

	const handleKeyDown = (e: KeyboardEvent) => {
		if (!isActive) return
		if (e.key === 'Enter') {
			handleRenameAction()
		}
	}

	useEffect(() => {
		if (!isActive || !linkRef.current) return
		// Don't focus if any menus are open to prevent dismissing them
		if (editor?.menus.hasAnyOpenMenus()) return
		linkRef.current.focus({ preventScroll: preventScrollOnNavigation })
	}, [isActive, linkRef, editor])

	const file = useValue('file', () => app.getFile(fileId), [fileId, app])
	const hasAdminRights = useHasFileAdminRights(fileId)

	const isDragging = useIsDragging(fileId)
	// disable dragging on mobile
	const isCoarsePointer = getIsCoarsePointer()

	const wrapperRef = useRef<HTMLDivElement>(null)
	const hasGroups = useHasFlag('groups_frontend')
	const isDragEnabled = hasGroups && !isCoarsePointer

	if (!file) return null

	if (isRenaming) {
		return (
			<TlaSidebarRenameInline
				source="sidebar"
				fileId={fileId}
				groupId={groupId}
				onClose={onClose}
			/>
		)
	}

	return (
		<div
			className={classNames(styles.sidebarFileListItem, styles.hoverable, className)}
			data-enhanced-a11y-mode={enhancedA11yMode}
			ref={wrapperRef}
			data-active={isActive}
			data-element="file-link"
			data-testid={testId}
			data-is-own-file={hasAdminRights}
			onDoubleClick={hasAdminRights ? handleRenameAction : undefined}
			data-drop-target-id={`file:${fileId}`}
			data-is-dragging={isDragging}
			data-is-pinned={isPinned}
			// We use this id to scroll the active file link into view when creating or deleting files.
			id={isActive ? ACTIVE_FILE_LINK_ID : undefined}
			role="listitem"
			draggable={isDragEnabled}
			onDragStart={
				isDragEnabled
					? (event) => {
							// Set native drag data for drag-to-new-tab functionality
							const fileUrl = routes.tlaFile(fileId, { asUrl: true })
							event.dataTransfer.effectAllowed = 'move'
							event.dataTransfer.setData('text/uri-list', fileUrl)
							startDragTracking({
								groupId,
								fileId,
								clientX: event.clientX,
								clientY: event.clientY,
							})
						}
					: undefined
			}
		>
			<Link
				ref={linkRef}
				onKeyDown={handleKeyDown}
				aria-label={
					fileName + (isActive ? ` (${intl.formatMessage(sidebarMessages.selected)})` : '')
				}
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
				{isPinned && hasGroups && pinIcon}
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
				{!hasAdminRights && <GuestBadge file={file} href={href} />}
			</div>
			<TlaSidebarFileLinkMenu
				groupId={groupId}
				fileId={fileId}
				onRenameAction={handleRenameAction}
			/>
		</div>
	)
}

function GuestBadge({ file, href }: { file: TlaFile; href: string }) {
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
		<div className={styles.sidebarFileListItemGuestBadge} data-testid={testId}>
			<TldrawUiTooltip
				content={
					<>
						{ownerName ? (
							<F defaultMessage={`Shared by {ownerName}`} values={{ ownerName }} />
						) : (
							<F defaultMessage="Shared with you" />
						)}
					</>
				}
			>
				<div
					dir="ltr"
					// this is needed to prevent the tooltip from closing when clicking the badge
					onClick={handleToolTipClick}
					className={styles.sidebarFileListItemGuestBadgeTrigger}
				>
					<TlaIcon icon="group" className="tlui-guest-icon" />
				</div>
			</TldrawUiTooltip>
		</div>
	)
}
