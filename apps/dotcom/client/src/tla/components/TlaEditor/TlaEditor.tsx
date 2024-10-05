import { TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	DefaultDebugMenu,
	DefaultDebugMenuContent,
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	Editor,
	TLComponents,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useActions,
	useEditor,
	useReactor,
} from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { assetUrls } from '../../../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../../../utils/config'
import { createAssetFromUrl } from '../../../utils/createAssetFromUrl'
import { globalEditor } from '../../../utils/globalEditor'
import { DebugMenuItems } from '../../../utils/migration/DebugMenuItems'
import { LocalMigration } from '../../../utils/migration/LocalMigration'
import { multiplayerAssetStore } from '../../../utils/multiplayerAssetStore'
import { useSharing } from '../../../utils/sharing'
import { SAVE_FILE_COPY_ACTION } from '../../../utils/useFileSystem'
import { useHandleUiEvents } from '../../../utils/useHandleUiEvent'
import { useApp, useMaybeApp } from '../../hooks/useAppState'
import { handleDroppedTldrawFiles } from '../../hooks/useTldrFileDrop'
import { useTldrawUser } from '../../hooks/useUser'
import { TldrawApp } from '../../utils/TldrawApp'
import { TlaEditorTopLeftPanel } from './TlaEditorTopLeftPanel'
import { TlaEditorTopRightPanel } from './TlaEditorTopRightPanel'
import styles from './editor.module.css'

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
	KeyboardShortcutsDialog: (props) => {
		const actions = useActions()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuGroup label="shortcuts-dialog.file" id="file">
					<TldrawUiMenuItem {...actions[SAVE_FILE_COPY_ACTION]} />
				</TldrawUiMenuGroup>
				<DefaultKeyboardShortcutsDialogContent />
			</DefaultKeyboardShortcutsDialog>
		)
	},
	MenuPanel: () => {
		return <TlaEditorTopLeftPanel />
	},
	SharePanel: () => {
		return <TlaEditorTopRightPanel />
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
}

export function TlaEditor({
	fileSlug,
	onDocumentChange,
	temporary,
}: {
	fileSlug: string
	onDocumentChange?(): void
	temporary?: boolean
}) {
	const handleUiEvent = useHandleUiEvents()
	const app = useMaybeApp()

	const [ready, setReady] = useState(false)
	const fileId = TldrawAppFileRecordType.createId(fileSlug)

	const rPrevFileId = useRef(fileId)
	useEffect(() => {
		if (rPrevFileId.current !== fileId) {
			setReady(false)
			rPrevFileId.current = fileId
		}
	}, [fileId])

	const sharingUiOverrides = useSharing()

	const handleMount = useCallback(
		(editor: Editor) => {
			;(window as any).app = editor
			;(window as any).editor = editor
			globalEditor.set(editor)
			editor.registerExternalAssetHandler('url', createAssetFromUrl)
			app?.setCurrentEditor(editor)
			editor.timers.setTimeout(() => {
				setReady(true)
			}, 200)

			const fileStartTime = Date.now()

			editor.store.listen(
				() => {
					// Update the user's edited session date for this file
					if (app) {
						const sessionState = app.getSessionState()
						if (!sessionState.auth) throw Error('Auth not found')
						const user = app.getUser(sessionState.auth.userId)
						if (!user) throw Error('User not found')
						app.onFileEdit(user.id, fileId, sessionState.createdAt, fileStartTime)
					}

					onDocumentChange?.()
				},
				{ scope: 'document', source: 'user' }
			)
		},
		[app, onDocumentChange, fileId]
	)

	useEffect(() => {
		if (!app) return
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

	const user = useTldrawUser()

	const store = useSync({
		uri: useCallback(async () => {
			const url = new URL(`${MULTIPLAYER_SERVER}/app/file/${fileSlug}`)
			if (user) {
				url.searchParams.set('accessToken', await user.getToken())
			}
			if (temporary) {
				url.searchParams.set('temporary', 'true')
			}
			return url.toString()
		}, [user, fileSlug, temporary]),
		assets: multiplayerAssetStore,
	})

	return (
		<div className={styles.editor}>
			<Tldraw
				store={store}
				assetUrls={assetUrls}
				onMount={handleMount}
				overrides={[sharingUiOverrides]}
				onUiEvent={handleUiEvent}
				components={components}
				options={{
					actionShortcutsLocation: 'toolbar',
				}}
			>
				<LocalMigration />
				<ThemeUpdater />
				{/* <CursorChatBubble /> */}
				<SneakyDarkModeSync />
				<SneakyTldrawFileDropHandler />
			</Tldraw>
			{ready ? null : <div key={fileId + 'overlay'} className={styles.overlay} />}
		</div>
	)
}

function SneakyDarkModeSync() {
	const app = useMaybeApp()
	const editor = useEditor()

	useReactor(
		'dark mode sync',
		() => {
			if (!app) return
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

function SneakyTldrawFileDropHandler() {
	const editor = useEditor()
	const app = useApp()
	useEffect(() => {
		const defaultOnDrop = editor.externalContentHandlers['files']
		editor.registerExternalContentHandler('files', async (content) => {
			const { files } = content
			const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))
			if (tldrawFiles.length > 0) {
				const snapshots = await handleDroppedTldrawFiles(editor, tldrawFiles)
				if (!snapshots.length) return
				await app.createFilesFromTldrFiles(snapshots)
			} else {
				defaultOnDrop?.(content)
			}
		})
	}, [editor, app])
	return null
}
