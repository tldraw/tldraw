import { CommentsMenuItem } from '@tldraw/commenting'
import { librariesPanelOpen, toggleLibrariesPanel } from '@tldraw/libraries'
import classNames from 'classnames'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import { useNavigate, useParams } from 'react-router-dom'
import {
	AccessibilityMenu,
	ColorSchemeMenu,
	CommandPaletteMenuItem,
	DefaultPageMenu,
	defineMessages,
	EditSubmenu,
	ExportFileContentSubMenu,
	ExtrasGroup,
	InputModeMenu,
	KeyboardShortcutsMenuItem,
	LanguageMenu,
	PreferencesGroup,
	TldrawUiButton,
	TldrawUiButtonLabel,
	TldrawUiDropdownMenuContent,
	TldrawUiDropdownMenuRoot,
	TldrawUiDropdownMenuTrigger,
	TldrawUiInput,
	TldrawUiMenuActionItem,
	TldrawUiMenuContextProvider,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	TldrawUiMenuSubmenu,
	ToggleDebugModeItem,
	ToggleDynamicSizeModeItem,
	ToggleEdgeScrollingItem,
	ToggleFocusModeItem,
	ToggleGridItem,
	TogglePasteAtCursorItem,
	ToggleSnapModeItem,
	ToggleToolLockItem,
	ToggleWrapModeItem,
	useDialogs,
	useEditor,
	usePassThroughWheelEvents,
	useTranslation,
	useValue,
	ZoomTo100MenuItem,
	ZoomToFitMenuItem,
	ZoomToSelectionMenuItem,
} from 'tldraw'
import { routes } from '../../../routeDefs'
import { useActiveWorkspaceId } from '../../hooks/useActiveWorkspaceId'
import { useApp, useMaybeApp } from '../../hooks/useAppState'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { useIsCommentingEnabledForUser } from '../../hooks/useIsCommentingEnabledForUser'
import { useHasFileAdminRights } from '../../hooks/useIsFileOwner'
import { useIsUiV3 } from '../../hooks/useIsUiV3'
import { useRoomInfo } from '../../hooks/useRoomInfo'
import { TLAppUiEventSource, useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { useDesignSwitch } from '../../utils/designSwitches'
import { getIsCoarsePointer } from '../../utils/getIsCoarsePointer'
import { TlaSettingsDialog } from '../dialogs/TlaSettingsDialog'
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
import { messages as sidebarMessages } from '../TlaSidebar/components/sidebar-shared'
import { editorMessages } from './editor-messages'
import { TlaEditorWorkspaceSwitcher } from './TlaEditorWorkspaceSwitcher'
import styles from './top.module.css'

/** tldraw's default View submenu plus a "Comments" show/hide toggle (its own group, signed-in
 *  only) and, in `ui_v3`, the per-file display toggles that otherwise sit under Preferences.
 *  Rebuilt here because tldraw's `ViewSubmenu` is a fixed component with no slot to inject into. */
function TlaViewSubmenu() {
	const commentingEnabled = useIsCommentingEnabledForUser()
	const isUiV3 = useIsUiV3()
	return (
		<TldrawUiMenuSubmenu id="view" label="menu.view">
			<TldrawUiMenuGroup id="view-actions">
				<TldrawUiMenuActionItem actionId="zoom-in" />
				<TldrawUiMenuActionItem actionId="zoom-out" />
				<ZoomTo100MenuItem />
				<ZoomToFitMenuItem />
				<ZoomToSelectionMenuItem />
			</TldrawUiMenuGroup>
			{isUiV3 && (
				<TldrawUiMenuGroup id="view-toggles">
					<ToggleGridItem />
					<ToggleFocusModeItem />
					<ToggleDebugModeItem />
				</TldrawUiMenuGroup>
			)}
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
	signInToSave: { defaultMessage: 'Sign in to save' },
	unsavedFile: { defaultMessage: 'Unsaved file' },
	settings: { defaultMessage: 'Settings' },
	pageMenu: { defaultMessage: 'Page menu' },
	home: { defaultMessage: 'Home' },
	libraries: { defaultMessage: 'Libraries' },
})

const SEPARATOR = '/'

// There are some styles in tla.css that adjust the regular tlui top panels

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
	const msg = useTranslation()
	const pageMenuLbl = msg(messages.pageMenu)
	// GOTCHA: 'anonymous' doesn't always mean logged out
	// we show this version of the panel for published files as well.
	const app = useMaybeApp()

	const roomInfo = useRoomInfo()

	const canCopyToApp = app && roomInfo?.prefix
	const isUiV3 = useIsUiV3()
	const intl = useIntl()
	const fileId = useCurrentFileId()

	const editor = useEditor()
	const anonFileName = useValue(
		'fileName',
		() =>
			editor.getDocumentSettings().name ||
			// v3 names an unnamed file as the signed-in header does. The scratch board is not a file.
			(isUiV3 && fileId ? intl.formatMessage(editorMessages.untitledProject) : undefined),
		[editor, isUiV3, fileId, intl]
	)

	// v3 always shows the page menu, as the signed-in header does.
	const hasPageMenu = useValue('hasPageMenu', () => isUiV3 || editor.getPages().length > 1, [
		editor,
		isUiV3,
	])

	const hasLogoMenu = useDesignSwitch('logoMenu')
	const menuLbl = msg('menu.title')
	// The scratch board at the root, which is neither a file nor a legacy or published room.
	const isUnsavedFile = isUiV3 && !app && !fileId && !roomInfo

	// This is used in three places
	// - root, ie tldraw.com
	// - being an anonymous guest on someone else's file
	// - being a logged out viewer of a published file

	const mainMenu = (
		<TldrawUiDropdownMenuRoot id={`file-menu-anon`}>
			<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
				<TldrawUiDropdownMenuTrigger>
					{hasLogoMenu ? (
						<TldrawUiButton
							type="icon"
							className={styles.topLeftLogoButton}
							tooltip={menuLbl}
							title={menuLbl}
							data-testid="tla-main-menu"
						>
							<TlaLogo data-testid="tla-top-left-logo-icon" />
						</TldrawUiButton>
					) : (
						<TldrawUiButton
							type="icon"
							className={styles.topLeftMainMenuTrigger}
							tooltip={pageMenuLbl}
							title={pageMenuLbl}
							data-testid="tla-main-menu"
						>
							<TlaIcon icon="dots-vertical-strong" />
						</TldrawUiButton>
					)}
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
					{isUiV3 ? (
						<TlaSettingsGroup />
					) : (
						<>
							<TlaPreferencesGroup />
							<TldrawUiMenuGroup id="misc">
								<UserManualMenuItem />
								<GiveUsFeedbackMenuItem />
								<LegalSummaryMenuItem />
								<CookieConsentMenuItem />
							</TldrawUiMenuGroup>
						</>
					)}
					{!app && (
						<TldrawUiMenuGroup id="signin">
							<SignInMenuItem />
						</TldrawUiMenuGroup>
					)}
				</TldrawUiDropdownMenuContent>
			</TldrawUiMenuContextProvider>
		</TldrawUiDropdownMenuRoot>
	)

	return (
		<>
			{hasLogoMenu ? (
				mainMenu
			) : isUiV3 ? (
				<TlaEditorHomeLogoButton />
			) : (
				<ExternalLink
					to="https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=top-left-logo"
					eventName="top-left-logo-clicked"
					aria-label="tldraw.dev"
					className={styles.topLeftOfflineLogo}
				>
					<TlaLogo data-testid="tla-top-left-logo-icon" />
				</ExternalLink>
			)}
			{isUnsavedFile && (
				<>
					<span className={styles.topLeftPanelSeparator} style={{ marginRight: 0 }}>
						{SEPARATOR}
					</span>
					<TlaUnsavedFileMenu />
				</>
			)}
			{anonFileName && !isUnsavedFile && (
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
			{hasPageMenu && (
				<>
					<span className={styles.topLeftPanelSeparator}>{SEPARATOR}</span>
					<DefaultPageMenu />
				</>
			)}
			{!hasLogoMenu && mainMenu}
		</>
	)
}

function TlaEditorTopLeftPanelSignedIn() {
	const msg = useTranslation()
	const editor = useEditor()
	const isUiV3 = useIsUiV3()
	const intl = useIntl()
	const [isRenaming, setIsRenaming] = useState(false)
	const pageMenuLbl = msg(messages.pageMenu)

	const isEmbed = !!new URLSearchParams(window.location.search).get('embed')

	const fileSlug = useParams<{ fileSlug: string }>().fileSlug ?? '_not_a_file_' // fall back to a string that will not match any file
	const isOwner = useHasFileAdminRights(fileSlug)

	const app = useApp()
	// Undefined on legacy routes (/r, /ro, /v, /s): the file-bound actions have nothing to act on.
	const fileId = useCurrentFileId()
	const fileName = useValue(
		'fileName',
		// TODO(david): This is a temporary fix for allowing guests to see the file name.
		// We update the name in the document record on it's DO when the file record changes.
		// We should figure out a way to have a single source of truth for the file name.
		// And to allow guests to 'subscribe' to file metadata updates somehow.
		() =>
			// we need that backup file name for empty file names (the initial value for the name is empty)
			app.getFileName(fileId ?? null, false)?.trim() ||
			editor.getDocumentSettings().name ||
			// rather than displaying the date for the project here, display Untitled project
			intl.formatMessage(editorMessages.untitledProject),
		[app, editor, fileId, intl]
	)
	const handleFileNameChange = useCallback(
		(name: string) => {
			if (!isOwner || !fileId) return
			setIsRenaming(false)
			// only actually update the name if name is a value, otherwise keep the previous name
			if (name) {
				// don't allow guests to update the file name
				app.updateFile(fileId, { name })
				editor.updateDocumentSettings({ name })
			}
		},
		[app, editor, fileId, isOwner]
	)

	const handleRenameAction = () => {
		if (getIsCoarsePointer()) {
			const newName = prompt(intl.formatMessage(sidebarMessages.renameFile), fileName)?.trim()
			if (newName && fileId) {
				app.updateFile(fileId, { name: newName })
			}
		} else {
			setIsRenaming(true)
		}
	}
	const handleRenameEnd = () => setIsRenaming(false)

	// An embed has no logo to hang the menu on.
	const hasLogoMenu = useDesignSwitch('logoMenu') && !isEmbed
	const menuLbl = msg('menu.title')

	const mainMenu = (
		<TlaFileMenu
			fileId={fileId ?? ''}
			workspaceId={null}
			source="file-header"
			onRenameAction={handleRenameAction}
			align={hasLogoMenu ? 'start' : undefined}
			trigger={
				hasLogoMenu ? (
					<TldrawUiButton type="icon" tooltip={menuLbl} title={menuLbl} data-testid="tla-main-menu">
						<TlaIcon icon="tldraw" />
					</TldrawUiButton>
				) : (
					<TldrawUiButton
						type="icon"
						className={styles.topLeftMainMenuTrigger}
						tooltip={pageMenuLbl}
						title={pageMenuLbl}
						data-testid="tla-main-menu"
					>
						<TlaIcon icon="dots-vertical-strong" />
					</TldrawUiButton>
				)
			}
		>
			{/* The logo no longer goes home, so the menu does. */}
			{hasLogoMenu && (
				<TldrawUiMenuGroup id="home">
					<HomeMenuItem />
				</TldrawUiMenuGroup>
			)}
			<TldrawUiMenuGroup id="regular-stuff">
				{fileId && (
					<TldrawUiMenuSubmenu id="file" label={msg(editorMessages.file)}>
						<FileItems
							source="file-header"
							fileId={fileId}
							onRenameAction={handleRenameAction}
							workspaceId={null}
						/>
						<ImportFileActionItem />
					</TldrawUiMenuSubmenu>
				)}
				<EditSubmenu />
				<TlaViewSubmenu />
				<ExportFileContentSubMenu />
				<ExtrasGroup />
			</TldrawUiMenuGroup>
			{isUiV3 ? (
				<TlaSettingsGroup />
			) : (
				<TldrawUiMenuGroup id="preferences">
					<PreferencesGroup />
				</TldrawUiMenuGroup>
			)}
		</TlaFileMenu>
	)

	return (
		<>
			{isEmbed ? null : hasLogoMenu ? (
				mainMenu
			) : isUiV3 ? (
				<TlaEditorHomeButton />
			) : (
				// spacer for the sidebar toggle button
				<div style={{ width: 40, flexShrink: 0 }} />
			)}
			{/* Only where v3 hides the sidebar, which holds the switcher everywhere else. */}
			{isUiV3 && fileId && !isEmbed && (
				<>
					<TlaEditorWorkspaceSwitcher className={styles.topLeftWorkspace} />
					<span className={classNames(styles.topLeftPanelSeparator, styles.topLeftWorkspace)}>
						{SEPARATOR}
					</span>
				</>
			)}
			<TlaFileNameEditor
				source="file-header"
				isRenaming={isRenaming}
				fileName={fileName}
				onChange={isOwner ? handleFileNameChange : undefined}
				onEnd={handleRenameEnd}
			/>
			<span className={styles.topLeftPanelSeparator}>{SEPARATOR}</span>
			<DefaultPageMenu />
			{/* Only file editors mount the libraries panel (see TlaEditor); on legacy routes there is
			    no file and the button would toggle state nothing reads. */}
			{fileId && <LibrariesPanelButton />}
			{!hasLogoMenu && mainMenu}
		</>
	)
}

function TlaEditorHomeButton() {
	const msg = useTranslation()
	const navigate = useNavigate()
	const workspaceId = useActiveWorkspaceId()
	const lbl = msg(messages.home)
	return (
		<TldrawUiButton
			type="icon"
			tooltip={lbl}
			title={lbl}
			onClick={() => navigate(routes.tlaWorkspace(workspaceId))}
			data-testid="tla-editor-home-button"
		>
			<TlaIcon icon="tldraw" />
		</TldrawUiButton>
	)
}

/**
 * The signed-out wordmark as v3's Home button. Home is the workspace page, which needs an account,
 * so signed out it goes by way of the sign-in route.
 */
function TlaEditorHomeLogoButton() {
	const msg = useTranslation()
	const navigate = useNavigate()
	// Published files show this panel to signed-in users too.
	const app = useMaybeApp()
	const lbl = msg(messages.home)
	return (
		<TldrawUiButton
			type="icon"
			className={styles.topLeftLogoButton}
			tooltip={lbl}
			title={lbl}
			onClick={() =>
				navigate(app ? routes.tlaWorkspace(app.getHomeWorkspaceId()) : routes.tlaSignIn())
			}
			data-testid="tla-editor-home-button"
		>
			<TlaLogo data-testid="tla-top-left-logo-icon" />
		</TldrawUiButton>
	)
}

function HomeMenuItem() {
	const msg = useTranslation()
	const navigate = useNavigate()
	const workspaceId = useActiveWorkspaceId()
	return (
		<TldrawUiMenuItem
			id="home"
			label={msg(messages.home)}
			readonlyOk
			onSelect={() => {
				navigate(routes.tlaWorkspace(workspaceId))
			}}
		/>
	)
}

function LibrariesPanelButton() {
	const msg = useTranslation()
	const editor = useEditor()
	const hasLibraries = !!useMaybeApp()?.libraries
	const open = useValue('libraries panel open', () => librariesPanelOpen.get(editor), [editor])
	const label = msg(messages.libraries)

	if (!hasLibraries) return null

	return (
		<TldrawUiButton
			type="icon"
			className={styles.topLeftMainMenuTrigger}
			data-testid="tla-libraries-button"
			aria-pressed={open}
			tooltip={label}
			title={label}
			onClick={() => toggleLibrariesPanel(editor)}
		>
			<TlaIcon icon="library" />
		</TldrawUiButton>
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
		// restore original filename from file
		setTemporaryFileName(fileName)
		rTemporaryName.current = fileName
		onBlur()
	}, [onBlur, fileName])

	const handleBlur = useCallback(() => {
		// dispatch the new filename via onComplete
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

function SignInMenuItem({
	label,
	testId = 'tla-sign-in-menu-button',
}: {
	label?: string
	testId?: string
}) {
	const msg = useTranslation()
	const { addDialog } = useDialogs()

	return (
		<TldrawUiButton
			type="menu"
			data-testid={testId}
			onClick={() => {
				addDialog({ component: TlaSignInDialog })
			}}
		>
			<TldrawUiButtonLabel>{label ?? msg(messages.signIn)}</TldrawUiButtonLabel>
			<TlaIcon icon="sign-in" />
		</TldrawUiButton>
	)
}

/**
 * Where a file's name would be on the signed-out scratch board. That board is one local document
 * per browser, and signing in at the root is what saves it, as a new file in the home workspace
 * (see `slurpFile`), so sign-in is the only thing this menu offers.
 */
function TlaUnsavedFileMenu() {
	const msg = useTranslation()
	return (
		<div className={classNames(styles.topLeftInputWrapper, styles.topLeftInputWrapperEditable)}>
			<TldrawUiDropdownMenuRoot id="unsaved-file">
				<TldrawUiMenuContextProvider type="menu" sourceId="dialog">
					<TldrawUiDropdownMenuTrigger>
						<button
							className={classNames(styles.topLeftInputNameWidthSetter, styles.topLeftUnsavedFile)}
							data-testid="tla-file-name"
						>
							{msg(messages.unsavedFile).replace(/ /g, '\u00a0')}
						</button>
					</TldrawUiDropdownMenuTrigger>
					<TldrawUiDropdownMenuContent side="bottom" align="start" alignOffset={0} sideOffset={0}>
						<TldrawUiMenuGroup id="signin">
							<SignInMenuItem
								label={msg(messages.signInToSave)}
								testId="tla-sign-in-to-save-button"
							/>
						</TldrawUiMenuGroup>
					</TldrawUiDropdownMenuContent>
				</TldrawUiMenuContextProvider>
			</TldrawUiDropdownMenuRoot>
		</div>
	)
}

/**
 * In v3 the settings dialog holds preferences, language and help, signed in or out. The v3 canvas
 * has no sidebar, so without this entry the dialog is only reachable from the workspace page. The
 * settingsIcon design switch moves the entry to the top right panel.
 */
function TlaSettingsGroup() {
	const msg = useTranslation()
	const { addDialog } = useDialogs()
	const hasSettingsIcon = useDesignSwitch('settingsIcon')
	return (
		<TldrawUiMenuGroup id="settings">
			{!hasSettingsIcon && (
				<TldrawUiMenuItem
					id="settings"
					label={msg(messages.settings)}
					readonlyOk
					onSelect={() => {
						addDialog({ component: () => <TlaSettingsDialog /> })
					}}
				/>
			)}
			<CommandPaletteMenuItem />
		</TldrawUiMenuGroup>
	)
}

/** Outside v3 the anonymous menu holds the account-wide preferences itself. */
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
			<CommandPaletteMenuItem />
		</TldrawUiMenuGroup>
	)
}
