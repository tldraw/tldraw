import { TldrawAppFile } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
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
	ViewSubmenu,
	useBreakpoint,
	useEditor,
	useReactor,
	useTldrawUiComponents,
} from 'tldraw'
import { Links } from '../../components/Links'
import { SneakyOnDropOverride } from '../../components/SneakyOnDropOverride'
import { ThemeUpdater } from '../../components/ThemeUpdater/ThemeUpdater'
import { assetUrls } from '../../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../../utils/config'
import { createAssetFromUrl } from '../../utils/createAssetFromUrl'
import { DebugMenuItems } from '../../utils/migration/DebugMenuItems'
import { LocalMigration } from '../../utils/migration/LocalMigration'
import { multiplayerAssetStore } from '../../utils/multiplayerAssetStore'
import { useSharing } from '../../utils/sharing'
import { useHandleUiEvents } from '../../utils/useHandleUiEvent'
import { useApp } from '../hooks/useAppState'
import { TldrawApp } from '../utils/TldrawApp'

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

	const handleMount = useCallback(
		(editor: Editor) => {
			;(window as any).app = editor
			;(window as any).editor = editor
			editor.registerExternalAssetHandler('url', createAssetFromUrl)
			app.setCurrentEditor(editor)
			editor.timers.setTimeout(() => {
				setReady(true)
			}, 200)

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

	const store = useSync({
		uri: `${MULTIPLAYER_SERVER}/app/file/${fileId}`,
		assets: multiplayerAssetStore,
	})

	return (
		<div className="tldraw__editor">
			<Tldraw
				store={store}
				assetUrls={assetUrls}
				onMount={handleMount}
				overrides={[sharingUiOverrides]}
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
