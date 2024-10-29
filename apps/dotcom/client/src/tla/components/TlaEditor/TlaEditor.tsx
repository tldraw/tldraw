import { useAuth } from '@clerk/clerk-react'
import { TldrawAppFileId, TldrawAppFileRecordType } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	DefaultStylePanel,
	Editor,
	OfflineIndicator,
	PeopleMenu,
	TLComponents,
	TLSessionStateSnapshot,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	createSessionStateSnapshotSignal,
	react,
	throttle,
	useActions,
	useCollaborationStatus,
	useEditor,
} from 'tldraw'
import { ThemeUpdater } from '../../../components/ThemeUpdater/ThemeUpdater'
import { assetUrls } from '../../../utils/assetUrls'
import { MULTIPLAYER_SERVER } from '../../../utils/config'
import { createAssetFromUrl } from '../../../utils/createAssetFromUrl'
import { globalEditor } from '../../../utils/globalEditor'
import { multiplayerAssetStore } from '../../../utils/multiplayerAssetStore'
import { SAVE_FILE_COPY_ACTION } from '../../../utils/useFileSystem'
import { useHandleUiEvents } from '../../../utils/useHandleUiEvent'
import { useMaybeApp } from '../../hooks/useAppState'
import { ReadyWrapper, useSetIsReady } from '../../hooks/useIsReady'
import { getSnapshotsFromDroppedTldrawFiles } from '../../hooks/useTldrFileDrop'
import { useTldrawUser } from '../../hooks/useUser'
import { SneakyDarkModeSync } from './SneakyDarkModeSync'
import { TlaEditorTopLeftPanel } from './TlaEditorTopLeftPanel'
import { TlaEditorTopRightPanel } from './TlaEditorTopRightPanel'
import styles from './editor.module.css'

/** @internal */
export const components: TLComponents = {
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
		const app = useMaybeApp()
		return <TlaEditorTopLeftPanel isAnonUser={!app} />
	},
	SharePanel: () => {
		return <TlaEditorTopRightPanel />
	},
	TopPanel: () => {
		const collaborationStatus = useCollaborationStatus()
		if (collaborationStatus === 'offline') return null
		return <OfflineIndicator />
	},
}

const anonComponents = {
	...components,
	SharePanel: null,
	StylePanel: () => {
		// When on a temporary file, we don't want to show the people menu or file share menu, just the regular style panel
		const { fileSlug } = useParams()
		if (!fileSlug) return <DefaultStylePanel />

		// ...but when an anonymous user is on a shared file, we do want to show the people menu next to the style panel
		return (
			<div className={styles.anonStylePanel}>
				<PeopleMenu />
				<DefaultStylePanel />
			</div>
		)
	},
}

interface TlaEditorProps {
	fileSlug: string
	onDocumentChange?(): void
	isCreateMode?: boolean
	deepLinks?: boolean
}
export function TlaEditor(props: TlaEditorProps) {
	// force re-mount when the file slug changes to prevent state from leaking between files
	return (
		<ReadyWrapper key={props.fileSlug}>
			<TlaEditorInner {...props} key={props.fileSlug} />
		</ReadyWrapper>
	)
}

function TlaEditorInner({ fileSlug, onDocumentChange, isCreateMode, deepLinks }: TlaEditorProps) {
	const handleUiEvent = useHandleUiEvents()
	const app = useMaybeApp()

	const fileId = TldrawAppFileRecordType.createId(fileSlug)

	const setIsReady = useSetIsReady()

	const handleMount = useCallback(
		(editor: Editor) => {
			;(window as any).app = app
			;(window as any).editor = editor
			// Register the editor globally
			globalEditor.set(editor)
			setIsReady()

			// Register the external asset handler
			editor.registerExternalAssetHandler('url', createAssetFromUrl)

			if (!app) return
			const fileState = app.getFileState(fileId)
			if (fileState?.lastSessionState) {
				editor.loadSnapshot({ session: fileState.lastSessionState })
			}
			const sessionState$ = createSessionStateSnapshotSignal(editor.store)
			const updateSessionState = throttle((state: TLSessionStateSnapshot) => {
				app.onFileSessionStateUpdate(fileId, state)
			}, 500)
			// don't want to update if they only open the file and didn't look around
			let firstTime = true
			const cleanup = react('update session state', () => {
				const state = sessionState$.get()
				if (!state) return
				if (firstTime) {
					firstTime = false
					return
				}
				updateSessionState(state)
			})
			return () => {
				cleanup()
				updateSessionState.cancel()
			}
		},
		[app, fileId, setIsReady]
	)

	const user = useTldrawUser()

	const store = useSync({
		uri: useCallback(async () => {
			const url = new URL(`${MULTIPLAYER_SERVER}/app/file/${fileSlug}`)
			if (user) {
				url.searchParams.set('accessToken', await user.getToken())
			}
			if (isCreateMode) {
				url.searchParams.set('isCreateMode', 'true')
			}
			return url.toString()
		}, [user, fileSlug, isCreateMode]),
		assets: multiplayerAssetStore,
		userInfo: app?.tlUser.userPreferences,
	})

	// Handle entering and exiting the file
	useEffect(() => {
		if (!app) return
		if (store.status !== 'synced-remote') return

		app.onFileEnter(fileId)
		return () => {
			app.onFileExit(fileId)
		}
	}, [app, fileId, store.status])

	return (
		<div className={styles.editor} data-testid="tla-editor">
			<Tldraw
				store={store}
				assetUrls={assetUrls}
				user={app?.tlUser}
				onMount={handleMount}
				onUiEvent={handleUiEvent}
				components={!app ? anonComponents : components}
				options={{ actionShortcutsLocation: 'toolbar' }}
				deepLinks={deepLinks || undefined}
			>
				<ThemeUpdater />
				{/* <CursorChatBubble /> */}
				<SneakyDarkModeSync />
				{app && <SneakyTldrawFileDropHandler />}
				<SneakyFileUpdateHandler fileId={fileId} onDocumentChange={onDocumentChange} />
			</Tldraw>
		</div>
	)
}

function SneakyTldrawFileDropHandler() {
	const editor = useEditor()
	const app = useMaybeApp()
	const auth = useAuth()
	useEffect(() => {
		if (!auth) return
		if (!app) return
		const defaultOnDrop = editor.externalContentHandlers['files']
		editor.registerExternalContentHandler('files', async (content) => {
			const { files } = content
			const tldrawFiles = files.filter((file) => file.name.endsWith('.tldr'))
			if (tldrawFiles.length > 0) {
				const snapshots = await getSnapshotsFromDroppedTldrawFiles(editor, tldrawFiles)
				if (!snapshots.length) return
				const token = await auth.getToken()
				if (!token) return
				await app.createFilesFromTldrFiles(snapshots, token)
			} else {
				defaultOnDrop?.(content)
			}
		})
	}, [editor, app, auth])
	return null
}

function SneakyFileUpdateHandler({
	onDocumentChange,
	fileId,
}: {
	onDocumentChange?(): void
	fileId: TldrawAppFileId
}) {
	const app = useMaybeApp()
	const editor = useEditor()
	useEffect(() => {
		return editor.store.listen(
			() => {
				if (!app) return
				app.onFileEdit(fileId)
				onDocumentChange?.()
			},
			{ scope: 'document', source: 'user' }
		)
	}, [app, onDocumentChange, fileId, editor])

	return null
}
