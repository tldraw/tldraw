import { useAuth } from '@clerk/clerk-react'
import { TlaFileOpenMode } from '@tldraw/dotcom-shared'
import { useSync } from '@tldraw/sync'
import { fileSave } from 'browser-fs-access'
import { useCallback, useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import { useParams } from 'react-router-dom'
import {
	DefaultKeyboardShortcutsDialog,
	DefaultKeyboardShortcutsDialogContent,
	Editor,
	OfflineIndicator,
	TLComponents,
	TLDRAW_FILE_EXTENSION,
	TLSessionStateSnapshot,
	TLStore,
	TLUiOverrides,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	assert,
	createSessionStateSnapshotSignal,
	getFromLocalStorage,
	react,
	serializeTldrawJsonBlob,
	setInLocalStorage,
	sleep,
	throttle,
	tltime,
	useActions,
	useCollaborationStatus,
	useEditor,
	useValue,
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
import { ReadyWrapper, useSetIsReady, useSetLoadingMessage } from '../../hooks/useIsReady'
import { getSnapshotsFromDroppedTldrawFiles } from '../../hooks/useTldrFileDrop'
import { useTldrawUser } from '../../hooks/useUser'
import { defineMessages, useMsg } from '../../utils/i18n'
import { TLA_WAS_LEGACY_CONTENT_MIGRATED, migrateLegacyContent } from '../../utils/temporary-files'
import { SneakyDarkModeSync } from './SneakyDarkModeSync'
import { TlaEditorTopLeftPanel } from './TlaEditorTopLeftPanel'
import { TlaEditorTopRightPanel } from './TlaEditorTopRightPanel'
import styles from './editor.module.css'

const messages = defineMessages({
	file: { defaultMessage: 'File' },
	untitledProject: { defaultMessage: 'Untitled project' },
})

/** @internal */
export const components: TLComponents = {
	ErrorFallback: ({ error }) => {
		throw error
	},
	KeyboardShortcutsDialog: (props) => {
		const actions = useActions()
		return (
			<DefaultKeyboardShortcutsDialog {...props}>
				<TldrawUiMenuGroup label={useMsg(messages.file)} id="file">
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
		const app = useMaybeApp()
		const fileSlug = useParams<{ fileSlug: string }>().fileSlug
		return <TlaEditorTopRightPanel isAnonUser={!app} context={fileSlug ? 'file' : 'scratch'} />
	},
	TopPanel: () => {
		const collaborationStatus = useCollaborationStatus()
		if (collaborationStatus === 'offline') {
			return (
				<div className={styles.offlineIndicatorWrapper}>
					<OfflineIndicator />{' '}
				</div>
			)
		}
		return null
	},
}

interface TlaEditorProps {
	fileSlug: string
	onDocumentChange?(): void
	mode?: TlaFileOpenMode
	duplicateId?: string
	deepLinks?: boolean
}

export function TlaEditor(props: TlaEditorProps) {
	if (props.mode === 'duplicate') {
		assert(props.duplicateId, 'duplicateId is required when mode is duplicate')
	} else {
		assert(!props.duplicateId, 'duplicateId is not allowed when mode is not duplicate')
	}
	// force re-mount when the file slug changes to prevent state from leaking between files
	return (
		<>
			<SetDocumentTitle />
			<ReadyWrapper key={props.fileSlug}>
				<TlaEditorInner {...props} key={props.fileSlug} />
			</ReadyWrapper>
		</>
	)
}

function TlaEditorInner({
	fileSlug,
	onDocumentChange,
	mode,
	deepLinks,
	duplicateId,
}: TlaEditorProps) {
	const handleUiEvent = useHandleUiEvents()
	const app = useMaybeApp()

	const fileId = fileSlug

	const setIsReady = useSetIsReady()
	const setLoadingMessage = useSetLoadingMessage()

	const handleMount = useCallback(
		(editor: Editor) => {
			;(window as any).app = app
			;(window as any).editor = editor
			// Register the editor globally
			globalEditor.set(editor)

			// Register the external asset handler
			editor.registerExternalAssetHandler('url', createAssetFromUrl)

			if (!app) {
				setIsReady()
				return
			}
			const fileState = app.getFileState(fileId)
			if (fileState?.lastSessionState) {
				editor.loadSnapshot({ session: JSON.parse(fileState.lastSessionState.trim() || 'null') })
			}
			const sessionState$ = createSessionStateSnapshotSignal(editor.store)
			const updateSessionState = throttle((state: TLSessionStateSnapshot) => {
				app.onFileSessionStateUpdate(fileId, state)
			}, 1000)
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

			const abortController = new AbortController()
			const wasMigrated = getFromLocalStorage(TLA_WAS_LEGACY_CONTENT_MIGRATED)
			if (app._localLegacyClaimId === fileId && wasMigrated === 'false') {
				setLoadingMessage('uploading')
				// This is a one-time operation.
				// So we need to wait a tick for react strict mode to finish
				// doing its nasty business before we start the migration.
				sleep(50)
					.then(async () => {
						if (!abortController.signal.aborted) {
							if (abortController.signal.aborted) return
							await migrateLegacyContent(editor, abortController.signal)
							if (abortController.signal.aborted) return
							setInLocalStorage(TLA_WAS_LEGACY_CONTENT_MIGRATED, 'true')
							setIsReady()
						}
					})
					.catch((_e) => {
						// show migration error
						// give people link to /local and tell them to
						// create a tldr file and drag it in
					})
			} else {
				setIsReady()
			}

			return () => {
				abortController.abort()
				cleanup()
				updateSessionState.cancel()
			}
		},
		[app, fileId, setIsReady, setLoadingMessage]
	)

	const user = useTldrawUser()

	const store = useSync({
		uri: useCallback(async () => {
			const url = new URL(`${MULTIPLAYER_SERVER}/app/file/${fileSlug}`)
			if (user) {
				url.searchParams.set('accessToken', await user.getToken())
			}
			if (mode) {
				url.searchParams.set('mode', mode)
				if (mode === 'duplicate') {
					assert(duplicateId, 'duplicateId is required when mode is duplicate')
					url.searchParams.set('duplicateId', duplicateId)
				}
			}
			return url.toString()
		}, [fileSlug, user, mode, duplicateId]),
		assets: multiplayerAssetStore,
		userInfo: app?.tlUser.userPreferences,
	})

	// Handle entering and exiting the file, with some protection against rapid enters/exits
	useEffect(() => {
		if (!app) return
		if (store.status !== 'synced-remote') return
		let didEnter = false
		let timer: any

		const fileState = app.getFileState(fileId)

		if (fileState && fileState.firstVisitAt) {
			// If there's a file state already then wait a second before marking it as entered
			timer = tltime.setTimeout(
				'file enter timer',
				() => {
					app.onFileEnter(fileId)
					didEnter = true
				},
				1000
			)
		} else {
			// If there's not a file state yet (i.e. if we're visiting this for the first time) then do an enter
			app.onFileEnter(fileId)
			didEnter = true
		}

		return () => {
			clearTimeout(timer)
			if (didEnter) {
				app.onFileExit(fileId)
			}
		}
	}, [app, fileId, store.status])

	const untitledProject = useMsg(messages.untitledProject)
	const overrides = useMemo<TLUiOverrides>(() => {
		if (!app) return {}

		return {
			actions(editor, actions) {
				actions['save-file-copy'] = {
					id: 'save-file-copy',
					label: 'action.save-copy',
					readonlyOk: true,
					kbd: '$s',
					async onSelect() {
						handleUiEvent('save-project-to-file', { source: '' })
						const documentName =
							((fileSlug ? app?.getFileName(fileSlug, false) : null) ??
								editor?.getDocumentSettings().name) ||
							// rather than displaying the date for the project here, display Untitled project
							untitledProject
						const defaultName =
							saveFileNames.get(editor.store) || `${documentName}${TLDRAW_FILE_EXTENSION}`

						const blobToSave = serializeTldrawJsonBlob(editor)
						let handle
						try {
							handle = await fileSave(blobToSave, {
								fileName: defaultName,
								extensions: [TLDRAW_FILE_EXTENSION],
								description: 'tldraw project',
							})
						} catch {
							// user cancelled
							return
						}

						if (handle) {
							// we deliberately don't store the handle for re-use
							// next time. we always want to save a copy, but to
							// help the user out we'll remember the last name
							// they used
							saveFileNames.set(editor.store, handle.name)
						}
					},
				}

				return actions
			},
		}
	}, [app, fileSlug, handleUiEvent, untitledProject])

	return (
		<div className={styles.editor} data-testid="tla-editor">
			<Tldraw
				className="tla-editor"
				store={store}
				assetUrls={assetUrls}
				user={app?.tlUser}
				onMount={handleMount}
				onUiEvent={handleUiEvent}
				components={components}
				options={{ actionShortcutsLocation: 'toolbar' }}
				deepLinks={deepLinks || undefined}
				overrides={overrides}
			>
				<ThemeUpdater />
				<SneakyDarkModeSync />
				{app && <SneakyTldrawFileDropHandler />}
				<SneakyFileUpdateHandler fileId={fileId} onDocumentChange={onDocumentChange} />
			</Tldraw>
		</div>
	)
}

// function SneakyThemeUpdater() {
// 	const editor = useEditor()
// 	useEffect(() => {
// 		editor.setTheme('dark')
// 	}, [editor])
// }

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
	fileId: string
}) {
	const app = useMaybeApp()
	const editor = useEditor()
	useEffect(() => {
		const onChange = throttle(
			() => {
				if (!app) return
				app.onFileEdit(fileId)
				onDocumentChange?.()
			},
			// This is used to update the lastEditAt time in the database, and to let the local
			// room know that an edit ahs been made.
			// It doesn't need to be super fast or accurate so we can throttle it a lot
			5000
		)
		const unsub = editor.store.listen(onChange, { scope: 'document', source: 'user' })
		return () => {
			unsub()
			onChange.cancel()
		}
	}, [app, onDocumentChange, fileId, editor])

	return null
}

function SetDocumentTitle() {
	const { fileSlug } = useParams<{ fileSlug: string }>()
	const app = useMaybeApp()
	const editor = useValue('editor', () => globalEditor.get(), [])
	const untitledProject = useMsg(messages.untitledProject)
	const title = useValue(
		'title',
		() =>
			((fileSlug ? app?.getFileName(fileSlug, false) : null) ??
				editor?.getDocumentSettings().name) ||
			// rather than displaying the date for the project here, display Untitled project
			untitledProject,
		[app, editor, fileSlug, untitledProject]
	)
	if (!title) return null
	return <Helmet title={title} />
}

// A map of previously saved tldr file names, so we can suggest the same name next time
const saveFileNames = new WeakMap<TLStore, string>()
