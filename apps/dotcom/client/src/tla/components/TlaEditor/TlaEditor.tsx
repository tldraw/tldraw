import { useSyncDemo } from '@tldraw/sync'
import { useCallback, useLayoutEffect, useState } from 'react'
import {
	DefaultDebugMenu,
	DefaultDebugMenuContent,
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultMainMenu,
	DefaultQuickActions,
	DefaultQuickActionsContent,
	Editor,
	OfflineIndicator,
	TLComponents,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useActions,
	useCollaborationStatus,
} from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { createAssetFromUrl } from '../../../utils/createAssetFromUrl'
import { globalEditor } from '../../../utils/globalEditor'
import { DebugMenuItems } from '../../../utils/migration/DebugMenuItems'
import { SAVE_FILE_COPY_ACTION } from '../../../utils/useFileSystem'
import { useHandleUiEvents } from '../../../utils/useHandleUiEvent'
import { assetUrls } from '../../providers/TlaProvider'
import { TlaEditorTopLeftPanel } from './TlaEditorTopLeftPanel'
import { TlaEditorTopRightPanel } from './TlaEditorTopRightPanel'
import styles from './editor.module.css'

const components: TLComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
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
	TopPanel: () => {
		const collaborationStatus = useCollaborationStatus()
		if (collaborationStatus === 'offline') return null
		return <OfflineIndicator />
	},
	QuickActions: () => {
		return (
			<DefaultQuickActions>
				<DefaultMainMenu />
				<DefaultQuickActionsContent />
			</DefaultQuickActions>
		)
	},
}

export function TlaEditor({
	fileSlug,
	// onDocumentChange,
	// isCreateMode,
}: {
	fileSlug: string
	onDocumentChange?(): void
	isCreateMode?: boolean
}) {
	const handleUiEvent = useHandleUiEvents()
	// const app = useMaybeApp()

	const [ready, setReady] = useState(false)

	// const fileId = TldrawAppFileRecordType.createId(fileSlug)

	useLayoutEffect(() => {
		setReady(false)
		// Set the editor to ready after a short delay
		const timeout = setTimeout(() => setReady(true), 200)
		return () => {
			clearTimeout(timeout)
		}
	}, [fileSlug])

	const handleMount = useCallback((editor: Editor) => {
		;(window as any).app = editor
		;(window as any).editor = editor
		// Register the editor globally
		globalEditor.set(editor)

		// Register the external asset handler
		editor.registerExternalAssetHandler('url', createAssetFromUrl)
	}, [])

	// Handle entering and exiting the file
	// useEffect(() => {
	// 	if (!app) return

	// 	const { auth } = app.getSessionState()
	// 	if (!auth) throw Error('Auth not found')

	// 	const user = app.getUser(auth.userId)
	// 	if (!user) throw Error('User not found')

	// 	let cancelled = false
	// 	let didEnter = false

	// 	// Only mark as entered after one second
	// 	const timeout = tltime.setTimeout(
	// 		'app',
	// 		() => {
	// 			if (cancelled) return
	// 			didEnter = true
	// 			// app.onFileEnter(auth.userId, fileId)
	// 		},
	// 		1000
	// 	)

	// 	return () => {
	// 		cancelled = true
	// 		clearTimeout(timeout)

	// 		if (didEnter) {
	// 			// app.onFileExit(auth.userId, fileId)
	// 		}
	// 	}
	// }, [app, fileId])

	// const user = useTldrawUser()

	// const user = useUser()

	const store = useSyncDemo({
		roomId: fileSlug + '1',
	})

	return (
		<div className={styles.editor}>
			<Tldraw
				store={store}
				assetUrls={assetUrls}
				onMount={handleMount}
				onUiEvent={handleUiEvent}
				components={components}
				options={{ actionShortcutsLocation: 'toolbar' }}
			>
				<ThemeUpdater />
				{/* <CursorChatBubble /> */}
				{/* <SneakyDarkModeSync />
				<SneakyTldrawFileDropHandler />
				<SneakyFileUpdateHandler fileId={fileId} onDocumentChange={onDocumentChange} /> */}
			</Tldraw>
			{ready ? null : <div key={fileSlug + 'overlay'} className={styles.overlay} />}
		</div>
	)
}

// function SneakyDarkModeSync() {
// 	// const app = useMaybeApp()
// 	const editor = useEditor()

// 	// useReactor(
// 	// 	'dark mode sync',
// 	// 	() => {
// 	// 		if (!app) return
// 	// 		const appIsDark =
// 	// 			app.store.unsafeGetWithoutCapture(TldrawApp.SessionStateId)!.theme === 'dark'
// 	// 		const editorIsDark = editor.user.getIsDarkMode()

// 	// 		if (appIsDark && !editorIsDark) {
// 	// 			app.setSessionState({ ...app.getSessionState(), theme: 'light' })
// 	// 		} else if (!appIsDark && editorIsDark) {
// 	// 			app.setSessionState({ ...app.getSessionState(), theme: 'dark' })
// 	// 		}
// 	// 	},
// 	// 	[app, editor]
// 	// )

// 	return null
// }

// function SneakyTldrawFileDropHandler() {
// 	const editor = useEditor()
// 	// const app = useMaybeApp()
// 	// useEffect(() => {
// 	// 	if (!app) return
// 	// 	const defaultOnDrop = editor.externalContentHandlers['files']
// 	// 	editor.registerExternalContentHandler('files', async (content) => {
// 	// 		const { files } = content
// 	// 		const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))
// 	// 		if (tldrawFiles.length > 0) {
// 	// 			const snapshots = await getSnapshotsFromDroppedTldrawFiles(editor, tldrawFiles)
// 	// 			if (!snapshots.length) return
// 	// 			await app.createFilesFromTldrFiles(snapshots)
// 	// 		} else {
// 	// 			defaultOnDrop?.(content)
// 	// 		}
// 	// 	})
// 	// }, [editor, app])
// 	return null
// }

// function SneakyFileUpdateHandler({
// 	onDocumentChange,
// 	fileId,
// }: {
// 	onDocumentChange?(): void
// 	fileId: TldrawAppFileId
// }) {
// 	const editor = useEditor()
// 	// useEffect(() => {
// 	// 	const fileStartTime = Date.now()
// 	// 	return editor.store.listen(
// 	// 		() => {
// 	// 			if (!app) return
// 	// 			const sessionState = app.getSessionState()
// 	// 			if (!sessionState.auth) throw Error('Auth not found')
// 	// 			const user = app.getUser(sessionState.auth.userId)
// 	// 			if (!user) throw Error('User not found')
// 	// 			app.onFileEdit(user.id, fileId, sessionState.createdAt, fileStartTime)
// 	// 			onDocumentChange?.()
// 	// 		},
// 	// 		{ scope: 'document', source: 'user' }
// 	// 	)
// 	// }, [app, onDocumentChange, fileId, editor])

// 	return null
// }
