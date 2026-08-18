import { CommentsMenuItem } from '@tldraw/commenting'
import classNames from 'classnames'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
	AccessibilityMenu,
	ColorSchemeMenu,
	DefaultPageMenu,
	EditSubmenu,
	ExportFileContentSubMenu,
	ExtrasGroup,
	InputModeMenu,
	KeyboardShortcutsMenuItem,
	LanguageMenu,
	PreferencesGroup,
	ToggleDebugModeItem,
	ToggleDynamicSizeModeItem,
	ToggleEdgeScrollingItem,
	ToggleFocusModeItem,
	ToggleGridItem,
	TogglePasteAtCursorItem,
	TldrawUiButton,
	TldrawUiButtonLabel,
	ToggleSnapModeItem,
	ToggleToolLockItem,
	ToggleWrapModeItem,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiInput,
	TldrawUiMenuActionItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuSubmenu,
	ZoomTo100MenuItem,
	ZoomToFitMenuItem,
	ZoomToSelectionMenuItem,
	useDialogs,
	useEditor,
	usePassThroughWheelEvents,
	useValue,
} from 'tldraw'
import { useApp, useMaybeApp } from '../../hooks/useAppState'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { useIsCommentingEnabled } from '../../hooks/useIsCommentingEnabled'
import { useHasFileAdminRights } from '../../hooks/useIsFileOwner'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { getIsCoarsePointer } from '../../utils/getIsCoarsePointer'
import { defineMessages, useIntl, useMsg } from '../../utils/i18n'
import { TlaSignInDialog } from '../dialogs/TlaSignInDialog'
import { ExternalLink } from '../ExternalLink/ExternalLink'
import {
	CookieConsentMenuItem,
	GiveUsFeedbackMenuItem,
	ImportFileActionItem,
	LegalSummaryMenuItem,
	UserManualMenuItem,
	UIThemeSubmenu,
} from '../menu-items/menu-items'
import { FileItems, TlaFileMenu } from '../TlaFileMenu/TlaFileMenu'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import { TlaLogo } from '../TlaLogo/TlaLogo'
import { sidebarMessages } from '../TlaSidebar/components/TlaSidebarFileLink'
import { editorMessages } from './editor-messages'
import { useRoomInfo } from './TlaEditorTopRightPanel'
import styles from './top.module.css'

/** tldraw's default View submenu plus a "Comments" show/hide toggle (its own group, only for users
 *  the commenting flag covers). Rebuilt here because tldraw's `ViewSubmenu` is a fixed component
 *  with no slot to inject into. */
function TlaViewSubmenu() {
	const commentingEnabled = useIsCommentingEnabled()
	return (
		<TldrawUiMenuSubmenu id="view" label="menu.view">
			<TldrawUiMenuGroup id="view-actions">
				<TldrawUiMenuActionItem actionId="zoom-in" />
				<TldrawUiMenuActionItem actionId="zoom-out" />
				<ZoomTo100MenuItem />
				<ZoomToFitMenuItem />
				<ZoomToSelectionMenuItem />
			</TldrawUiMenuGroup>
			{commentingEnabled && (
				<TldrawUiMenuGroup id="view-comments">
					<CommentsMenuItem />
				</TldrawUiMenuGroup>
			)}
		</TldrawUiMenuSubmenu>
	)
}

const messages = defineMessages({
	signIn: { defaultMessage: 'Sign in' },
	pageMenu: { defaultMessage: 'Page menu' },
})

const SEPARATOR = '/'

export function TlaEditorTopLeftPanel({ isAnonUser }: { isAnonUser: boolean }) {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)

	return (
		<div ref={ref} className={classNames(styles.topLeftPanel)}>
			<div className={classNames(styles.topLeftPanelButtons)}>
				{isAnonUser ? <TlaEditorTopLeftPanelAnonymous /> : <TlaEditorTopLeftPanelSignedIn />}
			</div>
		</div>
	)
}

function TlaEditorTopLeftPanelAnonymous() {
	const pageMenuLbl = useMsg(messages.pageMenu)
	// GOTCHA: 'anonymous' doesn't always mean logged out
	// we show this version of the panel for published files as well.
	const app = useMaybeApp()

	const roomInfo = useRoomInfo()

	const canCopyToApp = app && roomInfo?.prefix

	const editor = useEditor()
	const anonFileName = useValue('fileName', () => editor.getDocumentSettings().name || undefined, [
		editor,
	])

	const hasPages = useValue('hasPages', () => editor.getPages().length > 1, [editor])

	return (
		<>
			<ExternalLink
				to="https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=top-left-logo"
				eventName="top-left-logo-clicked"
				aria-label="tldraw.dev"
				className={styles.topLeftOfflineLogo}
			>
				<TlaLogo data-testid="tla-top-left-logo-icon" />
			</ExternalLink>
			{anonFileName && (
				<>
					<span
						className={styles.topLeftPanelSeparator}
						// undo nth-last-of-type rule in top.module.css
						style={{ marginRight: 0 }}
					>
						{SEPARATOR}
					</span>
					<div className={classNames(styles.topLeftInputWrapper)}>
						<button className={styles.topLeftInputNameWidthSetter} data-testid="tla-file-name">
							{anonFileName.replace(/ /g, '\u00a0')}
						</button>
					</div>
				</>
			)}
			{hasPages && (
				<>
					<span className={styles.topLeftPanelSeparator}>{SEPARATOR}</span>
					<DefaultPageMenu />
				</>
			)}
			<TldrawUiDropdownMenuRoot id={`file-menu-anon`}>
				<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
					<TldrawUiDropdownMenuTrigger>
						<TldrawUiButton
							type="icon"
							className={styles.topLeftMainMenuTrigger}
							tooltip={pageMenuLbl}
							title={pageMenuLbl}
							data-testid="tla-main-menu"
						>
							<TlaIcon icon="dots-vertical-strong" />
						</TldrawUiButton>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={0}>
						<TldrawUiMenuGroup id="basic">
							<EditSubmenu />
							<TlaViewSubmenu />
							<ExportFileContentSubMenu />
							<ExtrasGroup />
							<TldrawUiMenuActionItem actionId={'save-file-copy'} />
							{canCopyToApp && <TldrawUiMenuActionItem actionId={'copy-to-my-files'} />}
						</TldrawUiMenuGroup>
						<TlaPreferencesGroup />
						<TldrawUiMenuGroup id="misc">
							<UserManualMenuItem />
							<GiveUsFeedbackMenuItem />
							<LegalSummaryMenuItem />
							<CookieConsentMenuItem />
						</TldrawUiMenuGroup>
						{!app && (
							<TldrawUiMenuGroup id="signin">
								<SignInMenuItem />
							</TldrawUiMenuGroup>
						)}
					</TldrawUiDropdownMenuContent>
				</TldrawUiMenuContextProvider>
			</TldrawUiDropdownMenuRoot>
		</>
	)
}

function TlaEditorTopLeftPanelSignedIn() {
	const editor = useEditor()
	const intl = useIntl()
	const [isRenaming, setIsRenaming] = useState(false)
	const pageMenuLbl = useMsg(messages.pageMenu)
	const fileSubmenuMsg = useMsg(editorMessages.file)

	const isEmbed = !!new URLSearchParams(window.location.search).get('embed')

	const fileSlug = useParams<{ fileSlug: string }>().fileSlug ?? '_not_a_file_' // fall back to a string that will not match any file
	const isOwner = useHasFileAdminRights(fileSlug)

	const app = useApp()
	const fileId = useCurrentFileId()!
	const fileName = useValue(
		'fileName',
		// TODO(david): This is a temporary fix for allowing guests to see the file name.
		// We update the name in the document record on it's DO when the file record changes.
		// We should figure out a way to have a single source of truth for the file name.
		// And to allow guests to 'subscribe' to file metadata updates somehow.
		() =>
			app.getFileName(fileId, false)?.trim() ||
			editor.getDocumentSettings().name ||
			intl.formatMessage(editorMessages.untitledProject),
		[app, editor, fileId, intl]
	)
	const handleFileNameChange = useCallback(
		(name: string) => {
			if (!isOwner) return
			setIsRenaming(false)
			// an empty name keeps the previous one
			if (name) {
				app.updateFile(fileId, { name })
				editor.updateDocumentSettings({ name })
			}
		},
		[app, editor, fileId, isOwner]
	)

	const handleRenameAction = () => {
		if (getIsCoarsePointer()) {
			const newName = prompt(intl.formatMessage(sidebarMessages.renameFile), fileName)?.trim()
			if (newName) {
				app.updateFile(fileId, { name: newName })
			}
		} else {
			setIsRenaming(true)
		}
	}
	const handleRenameEnd = () => setIsRenaming(false)

	return (
		<>
			{/* spacer for the sidebar toggle button */}
			{isEmbed ? null : <div style={{ width: 40, flexShrink: 0 }} />}
			<TlaFileNameEditor
				source="file-header"
				isRenaming={isRenaming}
				fileName={fileName}
				onChange={isOwner ? handleFileNameChange : undefined}
				onEnd={handleRenameEnd}
			/>
			<span className={styles.topLeftPanelSeparator}>{SEPARATOR}</span>
			<DefaultPageMenu />
			<TlaFileMenu
				fileId={fileId}
				workspaceId={null}
				source="file-header"
				onRenameAction={handleRenameAction}
				trigger={
					<TldrawUiButton
						type="icon"
						className={styles.topLeftMainMenuTrigger}
						tooltip={pageMenuLbl}
						title={pageMenuLbl}
						data-testid="tla-main-menu"
					>
						<TlaIcon icon="dots-vertical-strong" />
					</TldrawUiButton>
				}
			>
				<TldrawUiMenuGroup id="regular-stuff">
					<TldrawUiMenuSubmenu id="file" label={fileSubmenuMsg}>
						<FileItems
							source="file-header"
							fileId={fileId}
							onRenameAction={handleRenameAction}
							workspaceId={null}
						/>
						<ImportFileActionItem />
					</TldrawUiMenuSubmenu>
					<EditSubmenu />
					<TlaViewSubmenu />
					<ExportFileContentSubMenu />
					<ExtrasGroup />
				</TldrawUiMenuGroup>
				<TldrawUiMenuGroup id="preferences">
					<PreferencesGroup />
				</TldrawUiMenuGroup>
			</TlaFileMenu>
		</>
	)
}

function TlaFileNameEditor({
	fileName,
	onChange,
	onEnd,
	isRenaming,
	source,
}: {
	fileName: string
	onChange?(name: string): void
	onEnd?(): void
	isRenaming?: boolean
	source: TLAppUiEventSource
}) {
	const [isEditing, setIsEditing] = useState(false)
	const trackEvent = useTldrawAppUiEvents()

	const intl = useIntl()
	const handleEditingStart = useCallback(() => {
		if (!onChange) return
		if (getIsCoarsePointer()) {
			const newName = prompt(intl.formatMessage(sidebarMessages.renameFile), fileName)?.trim()
			if (newName) {
				onChange(newName)
			}
		} else {
			setIsEditing(true)
		}
	}, [fileName, intl, onChange])

	const handleEditingEnd = useCallback(() => {
		if (!onChange) return
		setIsEditing(false)
		onEnd?.()
	}, [onChange, onEnd])

	const handleEditingComplete = useCallback(
		(name: string) => {
			if (!onChange) return
			setIsEditing(false)
			onChange(name)
			onEnd?.()
			trackEvent('rename-file', { name, source })
		},
		[onChange, onEnd, trackEvent, source]
	)

	useEffect(() => {
		if (isRenaming && !isEditing) {
			// Wait a tick, otherwise the blur event immediately exits the input.
			setTimeout(() => setIsEditing(true), 0)
		}
	}, [isRenaming, isEditing])

	return (
		<div
			className={classNames(
				styles.topLeftInputWrapper,
				onChange && styles.topLeftInputWrapperEditable
			)}
		>
			{isEditing ? (
				<TlaFileNameEditorInput
					fileName={fileName}
					onComplete={handleEditingComplete}
					onBlur={handleEditingEnd}
				/>
			) : (
				<button
					className={styles.topLeftInputNameWidthSetter}
					onClick={onChange ? handleEditingStart : undefined}
					data-testid="tla-file-name"
				>
					{fileName.replace(/ /g, '\u00a0')}
				</button>
			)}
		</div>
	)
}

function TlaFileNameEditorInput({
	fileName,
	onComplete,
	onBlur,
}: {
	fileName: string
	onComplete(name: string): void
	onBlur(): void
}) {
	// Mirrors the state so blur reads the latest value: TldrawUiInput passes '' on blur after Escape,
	// which would otherwise commit an empty rename.
	const rTemporaryName = useRef<string>(fileName)
	const [temporaryFileName, setTemporaryFileName] = useState(fileName)

	const handleCancel = useCallback(() => {
		setTemporaryFileName(fileName)
		rTemporaryName.current = fileName
		onBlur()
	}, [onBlur, fileName])

	const handleBlur = useCallback(() => {
		const newFileName = rTemporaryName.current.replace(/\s+/g, ' ').trim()
		if (newFileName === fileName) return handleCancel()
		setTemporaryFileName(newFileName)
		rTemporaryName.current = newFileName
		onComplete(newFileName)
		onBlur()
	}, [onBlur, onComplete, fileName, handleCancel])

	const handleValueChange = useCallback((value: string) => {
		setTemporaryFileName(value)
		rTemporaryName.current = value
	}, [])

	return (
		<>
			<TldrawUiInput
				data-testid="tla-file-name-input"
				value={temporaryFileName}
				onValueChange={handleValueChange}
				onCancel={handleCancel}
				onBlur={handleBlur}
				autoSelect
				autoFocus
			/>
			<div className={styles.topLeftInputNameWidthSetter}>
				{temporaryFileName.replace(/ /g, '\u00a0')}
			</div>
		</>
	)
}

function SignInMenuItem() {
	const msg = useMsg(messages.signIn)
	const { addDialog } = useDialogs()

	return (
		<TldrawUiButton
			type="menu"
			data-testid="tla-sign-in-menu-button"
			onClick={() => {
				addDialog({ component: TlaSignInDialog })
			}}
		>
			<TldrawUiButtonLabel>{msg}</TldrawUiButtonLabel>
			<TlaIcon icon="sign-in" />
		</TldrawUiButton>
	)
}

function TlaPreferencesGroup() {
	return (
		<TldrawUiMenuGroup id="preferences">
			<TldrawUiMenuSubmenu id="preferences" label="menu.preferences">
				<TldrawUiMenuGroup id="preferences-actions">
					<ToggleSnapModeItem />
					<ToggleToolLockItem />
					<ToggleGridItem />
					<ToggleWrapModeItem />
					<ToggleFocusModeItem />
					<ToggleEdgeScrollingItem />
					<ToggleDynamicSizeModeItem />
					<TogglePasteAtCursorItem />
					<ToggleDebugModeItem />
				</TldrawUiMenuGroup>
				<TldrawUiMenuGroup id="user-interface-submenus">
					<ColorSchemeMenu />
					<UIThemeSubmenu />
					<AccessibilityMenu />
					<InputModeMenu />
				</TldrawUiMenuGroup>
			</TldrawUiMenuSubmenu>
			<LanguageMenu />
			<KeyboardShortcutsMenuItem />
		</TldrawUiMenuGroup>
	)
}
