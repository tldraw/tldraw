import classNames from 'classnames'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
	DefaultActionsMenu,
	DefaultDebugMenu,
	DefaultDebugMenuContent,
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultMainMenu,
	DefaultQuickActions,
	DefaultToolbarContent,
	EditSubmenu,
	Editor,
	ExportFileContentSubMenu,
	ExtrasGroup,
	MobileStylePanel,
	OverflowingToolbar,
	PORTRAIT_BREAKPOINT,
	PeopleMenu,
	PreferencesGroup,
	TLComponents,
	Tldraw,
	ViewSubmenu,
	useBreakpoint,
	useEditor,
	useReactor,
	useReadonly,
	useTldrawUiComponents,
	useValue,
} from 'tldraw'

// eslint-disable-next-line local/no-internal-imports
import { ToggleToolLockedButton } from 'tldraw/src/lib/ui/components/Toolbar/ToggleToolLockedButton'

import { Links } from '../../components/Links'
import { ShareMenu } from '../../components/ShareMenu'
import { SneakyOnDropOverride } from '../../components/SneakyOnDropOverride'
import { ThemeUpdater } from '../../components/ThemeUpdater/ThemeUpdater'
import { assetUrls } from '../../utils/assetUrls'
import { createAssetFromUrl } from '../../utils/createAssetFromUrl'
import { DebugMenuItems } from '../../utils/migration/DebugMenuItems'
import { LocalMigration } from '../../utils/migration/LocalMigration'
import { useSharing } from '../../utils/sharing'
import { useFileSystem } from '../../utils/useFileSystem'
import { useHandleUiEvents } from '../../utils/useHandleUiEvent'
import { useApp } from '../hooks/useAppState'
import { useFlags } from '../hooks/useFlags'
import { TldrawApp } from '../utils/TldrawApp'
import {
	TldrawAppFile,
	TldrawAppFileId,
	TldrawAppFileRecordType,
} from '../utils/schema/TldrawAppFile'
import { TlaIcon } from './TlaIcon'
import { TlaSidebarToggle } from './TlaSidebarToggle'

// const shittyOfflineAtom = atom('shitty offline atom', false)

const components: TLComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
	// HelpMenu: () => (
	// 	<DefaultHelpMenu>
	// 		<TldrawUiMenuGroup id="help">
	// 			<DefaultHelpMenuContent />
	// 		</TldrawUiMenuGroup>
	// 		<Links />
	// 	</DefaultHelpMenu>
	// ),
	MainMenu: () => (
		<DefaultMainMenu icon="dots-vertical">
			{/* <MultiplayerFileMenu /> */}
			<EditSubmenu />
			<ViewSubmenu />
			<ExportFileContentSubMenu />
			<ExtrasGroup />
			<PreferencesGroup />
			<Links />
		</DefaultMainMenu>
	),
	MenuPanel: function MenuPanel() {
		const app = useApp()
		const { MainMenu } = useTldrawUiComponents()

		const { fileId } = useParams<{ fileId?: TldrawAppFileId }>()
		if (!MainMenu) return null
		return (
			<div className="tla-file-navbar" style={{ paddingLeft: 0 }}>
				<TlaSidebarToggle />
				{fileId && (
					<div
						className="tla-file-navbar__breadcrumbs tla-text_ui__regular"
						style={{
							color: 'var(--tla-color-text-2)',
						}}
					>
						<span>My Files</span>
						<span style={{ opacity: 0.5 }}>
							<TlaIcon icon="chevron-right" />
						</span>
						<button
							style={{ color: 'var(--tla-color-text-2)' }}
							className="tla-file-navbar__filename-button"
						>
							{TldrawApp.getFileName(app.store.get(TldrawAppFileRecordType.createId(fileId))!)}
						</button>
						<MainMenu />
					</div>
				)}
			</div>
		)
	},
	Toolbar: () => {
		const editor = useEditor()
		const isReadonlyMode = useReadonly()
		const activeToolId = useValue('current tool id', () => editor.getCurrentToolId(), [editor])

		const breakpoint = useBreakpoint()

		return (
			<div className="tlui-toolbar">
				<div className="tlui-toolbar__inner">
					<div className="tlui-toolbar__left">
						{!isReadonlyMode && (
							<div className="tlui-toolbar__extras">
								<div className="tlui-toolbar__extras__controls tlui-buttons__horizontal">
									<DefaultQuickActions />
									<DefaultActionsMenu />
								</div>
								<ToggleToolLockedButton activeToolId={activeToolId} />
							</div>
						)}
						<OverflowingToolbar>
							<DefaultToolbarContent />
						</OverflowingToolbar>
					</div>
					{breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM && !isReadonlyMode && (
						<div className="tlui-toolbar__tools tlui-transparent-panel">
							<MobileStylePanel />
						</div>
					)}
				</div>
			</div>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		// const actions = useActions()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				{/* <TldrawUiMenuGroup label="shortcuts-dialog.file" id="file">
					<TldrawUiMenuItem {...actions[SAVE_FILE_COPY_ACTION]} />
					<TldrawUiMenuItem {...actions[OPEN_FILE_ACTION]} />
				</TldrawUiMenuGroup> */}
				<DefaultKeyboardShortcutsDialogContent />
				{/* <TldrawUiMenuGroup label="shortcuts-dialog.collaboration" id="collaboration">
					<TldrawUiMenuItem {...actions[CURSOR_CHAT_ACTION]} />
				</TldrawUiMenuGroup> */}
			</DefaultKeyboardShortcutsDialog>
		)
	},
	DebugMenu: () => {
		return (
			<DefaultDebugMenu>
				<DefaultDebugMenuContent />
				<DebugMenuItems />
			</DefaultDebugMenu>
		)
	},
	// TopPanel: () => {
	// 	const isOffline = useValue('offline', () => shittyOfflineAtom.get(), [])
	// 	return <TlaDocumentTopZone isOffline={isOffline} />
	// },
	SharePanel: () => {
		return (
			<div className="tlui-share-zone" draggable={false}>
				<PeopleMenu />
				<ShareMenu />
			</div>
		)
	},
}

export function TlaEditor({
	file,
	onDocumentChange,
}: {
	file: TldrawAppFile
	onDocumentChange?(): void
}) {
	const handleUiEvent = useHandleUiEvents()
	const app = useApp()

	const { id: fileId } = file

	const [ready, setReady] = useState(false)
	const rPrevFileId = useRef(fileId)
	useEffect(() => {
		if (rPrevFileId.current !== fileId) {
			setReady(false)
			rPrevFileId.current = fileId
		}
	}, [fileId])

	const persistenceKey = `tla-2_${fileId}`

	const sharingUiOverrides = useSharing()
	const fileSystemUiOverrides = useFileSystem({ isMultiplayer: false })

	const handleMount = useCallback(
		(editor: Editor) => {
			;(window as any).app = editor
			;(window as any).editor = editor
			editor.registerExternalAssetHandler('url', createAssetFromUrl)
			app.setCurrentEditor(editor)
			editor.timers.setTimeout(() => {
				setReady(true)
			}, 200)

			editor.updateInstanceState({ isDebugMode: false })

			const fileStartTime = Date.now()

			editor.store.listen(
				() => {
					// Update the user's edited session date for this file
					const sessionState = app.getSessionState()
					if (!sessionState.auth) throw Error('Auth not found')
					const user = app.getUser(sessionState.auth.userId)
					if (!user) throw Error('User not found')

					app.onFileEdit(user.id, fileId, sessionState.createdAt, fileStartTime)

					if (onDocumentChange) {
						onDocumentChange()
					}
				},
				{ scope: 'document', source: 'user' }
			)
		},
		[app, onDocumentChange, fileId]
	)

	useEffect(() => {
		const { auth } = app.getSessionState()
		if (!auth) throw Error('Auth not found')

		const user = app.getUser(auth.userId)
		if (!user) throw Error('User not found')

		if (user.presence.fileIds.includes(fileId)) {
			return
		}

		let cancelled = false
		let didEnter = false

		const timeout = setTimeout(() => {
			if (cancelled) return
			didEnter = true
			app.onFileEnter(auth.userId, fileId)
		}, 1000)

		return () => {
			cancelled = true
			clearTimeout(timeout)

			if (didEnter) {
				app.onFileExit(auth.userId, fileId)
			}
		}
	}, [app, fileId])

	const flags = useFlags()

	return (
		<div className={classNames('tldraw__editor', flags.sicko_mode && 'tla-sicko')}>
			<Tldraw
				key={persistenceKey}
				assetUrls={assetUrls}
				persistenceKey={persistenceKey}
				onMount={handleMount}
				overrides={[sharingUiOverrides, fileSystemUiOverrides]}
				onUiEvent={handleUiEvent}
				components={components}
			>
				<LocalMigration />
				<SneakyOnDropOverride isMultiplayer={false} />
				<ThemeUpdater />
				{/* <CursorChatBubble /> */}
				<SneakyDarkModeSync />
			</Tldraw>
			{ready ? null : <div key={persistenceKey + 'overlay'} className="tla-editor__overlay" />}
		</div>
	)
}

function SneakyDarkModeSync() {
	const app = useApp()
	const editor = useEditor()

	useReactor(
		'dark mode sync',
		() => {
			const appIsDark =
				app.store.unsafeGetWithoutCapture(TldrawApp.SessionStateId)!.theme === 'dark'
			const editorIsDark = editor.user.getIsDarkMode()

			if (appIsDark && !editorIsDark) {
				app.setSessionState({ ...app.getSessionState(), theme: 'light' })
			} else if (!appIsDark && editorIsDark) {
				app.setSessionState({ ...app.getSessionState(), theme: 'dark' })
			}
		},
		[app, editor]
	)

	return null
}
