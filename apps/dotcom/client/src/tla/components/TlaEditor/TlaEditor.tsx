import { tx } from '@instantdb/core'
import { useSyncDemo } from '@tldraw/sync'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
	tltime,
	useActions,
	useCollaborationStatus,
	useEditor,
	useReactor,
} from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { createAssetFromUrl } from '../../../utils/createAssetFromUrl'
import { globalEditor } from '../../../utils/globalEditor'
import { DebugMenuItems } from '../../../utils/migration/DebugMenuItems'
import { SAVE_FILE_COPY_ACTION } from '../../../utils/useFileSystem'
import { useHandleUiEvents } from '../../../utils/useHandleUiEvent'
import { useDbUser } from '../../hooks/db-hooks'
import { getSnapshotsFromDroppedTldrawFiles } from '../../hooks/useTldrFileDrop'
import {
	getLocalSessionStateUnsafe,
	updateLocalSessionState,
} from '../../providers/SessionProvider'
import { assetUrls } from '../../providers/TlaProvider'
import { db } from '../../utils/db'
import { TldrawAppFile } from '../../utils/db-schema'
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
	onDocumentChange,
	// isCreateMode,
}: {
	fileSlug: string
	onDocumentChange?(): void
	isCreateMode?: boolean
}) {
	const handleUiEvent = useHandleUiEvents()

	const [ready, setReady] = useState(false)

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

	const user = useDbUser()

	const rDidEnter = useRef(false)

	const userId = user?.id

	// Handle entering and exiting the file
	useEffect(() => {
		if (!userId) return
		if (!rDidEnter.current) return

		let cancelled = false

		db.queryOnce({
			users: {
				$: {
					where: {
						id: userId,
					},
				},
			},
		}).then((d) => {
			const user = d.data?.users[0]
			if (!user) return

			// Only mark as entered after one second
			const timeout = tltime.setTimeout(
				'app',
				() => {
					if (cancelled) return
					rDidEnter.current = true

					db.transact([
						tx.users[user.id].merge({
							presence: {
								fileIds: Array.from(new Set([...user.presence.fileIds, fileSlug])),
							},
						}),
					])
				},
				1000
			)

			return () => {
				cancelled = true
				clearTimeout(timeout)
				if (rDidEnter.current) {
					db.transact([
						tx.users[user.id].merge({
							presence: {
								fileIds: user.presence.fileIds.filter((id) => id !== fileSlug),
							},
						}),
					])
				}
			}
		})
	}, [fileSlug, userId])

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
				<SneakyDarkModeSync />
				<SneakyTldrawFileDropHandler />
				<SneakyFileUpdateHandler fileId={fileSlug} onDocumentChange={onDocumentChange} />
			</Tldraw>
			{ready ? null : <div key={fileSlug + 'overlay'} className={styles.overlay} />}
		</div>
	)
}

function SneakyDarkModeSync() {
	const editor = useEditor()

	useReactor(
		'dark mode sync',
		() => {
			const appIsDark = getLocalSessionStateUnsafe().theme === 'dark'
			const editorIsDark = editor.user.getIsDarkMode()

			if (appIsDark && !editorIsDark) {
				updateLocalSessionState(() => ({ theme: 'light' }))
			} else if (!appIsDark && editorIsDark) {
				updateLocalSessionState(() => ({ theme: 'dark' }))
			}
		},
		[editor]
	)

	return null
}

function SneakyTldrawFileDropHandler() {
	const editor = useEditor()
	useEffect(() => {
		const defaultOnDrop = editor.externalContentHandlers['files']
		editor.registerExternalContentHandler('files', async (content) => {
			const { files } = content
			const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))
			if (tldrawFiles.length > 0) {
				const snapshots = await getSnapshotsFromDroppedTldrawFiles(editor, tldrawFiles)
				if (!snapshots.length) return
				// await app.createFilesFromTldrFiles(snapshots)
			} else {
				defaultOnDrop?.(content)
			}
		})
	}, [editor])
	return null
}

function SneakyFileUpdateHandler({
	onDocumentChange,
	fileId,
}: {
	onDocumentChange?(): void
	fileId: TldrawAppFile['id']
}) {
	const editor = useEditor()
	useEffect(() => {
		// const fileStartTime = Date.now()
		return editor.store.listen(
			() => {
				// app.onFileEdit(user.id, fileId, sessionState.createdAt, fileStartTime)
				onDocumentChange?.()
			},
			{ scope: 'document', source: 'user' }
		)
	}, [onDocumentChange, fileId, editor])

	return null
}
