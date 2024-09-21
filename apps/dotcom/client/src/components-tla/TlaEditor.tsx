import { useCallback, useEffect, useRef, useState } from 'react'
import {
	DefaultDebugMenu,
	DefaultDebugMenuContent,
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultMainMenu,
	EditSubmenu,
	Editor,
	ExportFileContentSubMenu,
	ExtrasGroup,
	PreferencesGroup,
	TLComponents,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	ViewSubmenu,
	useActions,
	useBreakpoint,
	useEditor,
	useReactor,
	useTldrawUiComponents,
} from 'tldraw'
import { MultiplayerFileMenu } from '../components/FileMenu'
import { Links } from '../components/Links'
import { SneakyOnDropOverride } from '../components/SneakyOnDropOverride'
import { ThemeUpdater } from '../components/ThemeUpdater/ThemeUpdater'
import { useApp } from '../hooks/useAppState'
import { assetUrls } from '../utils/assetUrls'
import { createAssetFromUrl } from '../utils/createAssetFromUrl'
import { DebugMenuItems } from '../utils/migration/DebugMenuItems'
import { LocalMigration } from '../utils/migration/LocalMigration'
import { useSharing } from '../utils/sharing'
import { TldrawApp } from '../utils/tla/TldrawApp'
import { TldrawAppFile } from '../utils/tla/schema/TldrawAppFile'
import { OPEN_FILE_ACTION, SAVE_FILE_COPY_ACTION, useFileSystem } from '../utils/useFileSystem'
import { useHandleUiEvents } from '../utils/useHandleUiEvent'

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
		<DefaultMainMenu>
			<MultiplayerFileMenu />
			<EditSubmenu />
			<ViewSubmenu />
			<ExportFileContentSubMenu />
			<ExtrasGroup />
			<PreferencesGroup />
			<Links />
		</DefaultMainMenu>
	),
	MenuPanel: function MenuPanel() {
		const breakpoint = useBreakpoint()

		const { MainMenu, QuickActions, ActionsMenu, PageMenu } = useTldrawUiComponents()

		if (!MainMenu && !PageMenu && breakpoint < 6) return null

		return (
			<div className="tlui-menu-zone">
				<div className="tlui-buttons__horizontal">
					{MainMenu && <MainMenu />}
					{breakpoint < 6 ? null : (
						<>
							{QuickActions && <QuickActions />}
							{ActionsMenu && <ActionsMenu />}
						</>
					)}
				</div>
			</div>
		)
	},
	KeyboardShortcutsDialog: (props) => {
		const actions = useActions()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuGroup label="shortcuts-dialog.file" id="file">
					<TldrawUiMenuItem {...actions[SAVE_FILE_COPY_ACTION]} />
					<TldrawUiMenuItem {...actions[OPEN_FILE_ACTION]} />
				</TldrawUiMenuGroup>
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
		return null
		// return (
		// 	<div className="tlui-share-zone" draggable={false}>
		// 		<PeopleMenu />
		// 		<ShareMenu />
		// 	</div>
		// )
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

	const { id: fileId, workspaceId } = file

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
			if (onDocumentChange) {
				editor.store.listen(() => onDocumentChange(), { scope: 'document', source: 'user' })
			}
		},
		[app, onDocumentChange]
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
			app.onFileEnter(auth.userId, workspaceId, fileId)
		}, 1000)

		return () => {
			cancelled = true
			clearTimeout(timeout)

			if (didEnter) {
				app.onFileExit(auth.userId, workspaceId, fileId)
			}
		}
	}, [app, fileId, workspaceId])

	return (
		<div className="tldraw__editor">
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
