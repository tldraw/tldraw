import { Store, StoreSnapshot } from '@tldraw/store'
import { TLAsset, TLRecord, TLStore } from '@tldraw/tlschema'
import { annotateError } from '@tldraw/utils'
import React, { memo, useCallback, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { TLEditorAssetUrls, defaultEditorAssetUrls } from './assetUrls'
import { DefaultErrorFallback } from './components/DefaultErrorFallback'
import { OptionalErrorBoundary } from './components/ErrorBoundary'
import { TLShapeInfo } from './config/defineShape'
import { Editor } from './editor/Editor'
import { TLStateNodeConstructor } from './editor/tools/StateNode'
import { ContainerProvider, useContainer } from './hooks/useContainer'
import { useCursor } from './hooks/useCursor'
import { useDarkMode } from './hooks/useDarkMode'
import { EditorContext } from './hooks/useEditor'
import {
	EditorComponentsProvider,
	TLEditorComponents,
	useEditorComponents,
} from './hooks/useEditorComponents'
import { useEvent } from './hooks/useEvent'
import { useForceUpdate } from './hooks/useForceUpdate'
import { useLocalStore } from './hooks/useLocalStore'
import { usePreloadAssets } from './hooks/usePreloadAssets'
import { useSafariFocusOutFix } from './hooks/useSafariFocusOutFix'
import { useZoomCss } from './hooks/useZoomCss'
import { TLStoreWithStatus } from './utils/sync/StoreWithStatus'

/** @public */
export type TldrawEditorProps = {
	children?: any
	/**
	 * An array of shape utils to use in the editor.
	 */
	shapes?: TLShapeInfo<any>[]
	/**
	 * An array of tools to use in the editor.
	 */
	tools?: TLStateNodeConstructor[]
	/**
	 * Urls for where to find fonts and other assets.
	 */
	assetUrls?: TLEditorAssetUrls
	/**
	 * Whether to automatically focus the editor when it mounts.
	 */
	autoFocus?: boolean
	/**
	 * Overrides for the tldraw user interface components.
	 */
	components?: Partial<TLEditorComponents>
	/**
	 * Called when the editor has mounted.
	 *
	 * @example
	 *
	 * ```ts
	 * function TldrawEditor() {
	 * 	return <Editor onMount={(editor) => editor.selectAll()} />
	 * }
	 * ```
	 *
	 * @param editor - The editor instance.
	 */
	onMount?: (editor: Editor) => void
	/**
	 * Called when the editor generates a new asset from a file, such as when an image is dropped into
	 * the canvas.
	 *
	 * @example
	 *
	 * ```ts
	 * const editor = new App({
	 * 	onCreateAssetFromFile: (file) => uploadFileAndCreateAsset(file),
	 * })
	 * ```
	 *
	 * @param file - The file to generate an asset from.
	 * @param id - The id to be assigned to the resulting asset.
	 */
	onCreateAssetFromFile?: (file: File) => Promise<TLAsset>

	/**
	 * Called when a URL is converted to a bookmark. This callback should return the metadata for the
	 * bookmark.
	 *
	 * @example
	 *
	 * ```ts
	 * editor.onCreateBookmarkFromUrl(url, id)
	 * ```
	 *
	 * @param url - The url that was created.
	 * @public
	 */
	onCreateBookmarkFromUrl?: (
		url: string
	) => Promise<{ image: string; title: string; description: string }>
} & (
	| {
			/**
			 * The Store instance to use for keeping the editor's data. This may be prepopulated, e.g. by loading
			 * from a server or database.
			 */
			store: TLStore | TLStoreWithStatus
	  }
	| {
			store?: undefined
			/**
			 * The editor's initial data.
			 */
			initialData?: StoreSnapshot<TLRecord>
			/**
			 * The id under which to sync and persist the editor's data. If none is given tldraw will not sync or persist
			 * the editor's data.
			 */
			persistenceKey?: string
			/**
			 * When tldraw reloads a document from local persistence, it will try to bring back the
			 * editor UI state (e.g. camera position, which shapes are selected). It does this using a sessionId,
			 * which by default is unique per browser tab. If you wish to have more fine-grained
			 * control over this behavior, you can provide your own sessionId.
			 *
			 * If it can't find saved UI state for the given sessionId, it will use the most recently saved
			 * UI state for the given persistenceKey if available.
			 */
			sessionId?: string
			/**
			 * The default initial document name. e.g. 'Untitled Document'
			 */
			defaultName?: string
	  }
)

declare global {
	interface Window {
		tldrawReady: boolean
	}
}

/** @public */
export const TldrawEditor = memo(function TldrawEditor(props: TldrawEditorProps) {
	const [container, setContainer] = React.useState<HTMLDivElement | null>(null)

	const ErrorFallback =
		props.components?.ErrorFallback === undefined
			? DefaultErrorFallback
			: props.components?.ErrorFallback

	const { store, ...rest } = props

	return (
		<div ref={setContainer} draggable={false} className="tl-container tl-theme__light" tabIndex={0}>
			<OptionalErrorBoundary
				fallback={ErrorFallback ? (error) => <ErrorFallback error={error} /> : null}
				onError={(error) => annotateError(error, { tags: { origin: 'react.tldraw-before-app' } })}
			>
				{container && (
					<ContainerProvider container={container}>
						<EditorComponentsProvider overrides={props.components}>
							{store ? (
								store instanceof Store ? (
									// Store is ready to go, whether externally synced or not
									<TldrawEditorWithReadyStore {...rest} store={store} />
								) : (
									// Store is a synced store, so handle syncing stages internally
									<TldrawEditorWithLoadingStore {...rest} store={store} />
								)
							) : (
								// We have no store (it's undefined) so create one and possibly sync it
								<TldrawEditorWithOwnStore {...rest} store={store} />
							)}
						</EditorComponentsProvider>
					</ContainerProvider>
				)}
			</OptionalErrorBoundary>
		</div>
	)
})

function TldrawEditorWithOwnStore(props: TldrawEditorProps & { store: undefined }) {
	const { defaultName, initialData, shapes, persistenceKey, sessionId } = props

	const syncedStore = useLocalStore({
		shapes,
		initialData,
		persistenceKey,
		sessionId,
		defaultName,
	})

	return <TldrawEditorWithLoadingStore {...props} store={syncedStore} />
}

const TldrawEditorWithLoadingStore = memo(function TldrawEditorBeforeLoading({
	store,
	assetUrls,
	...rest
}: TldrawEditorProps & { store: TLStoreWithStatus }) {
	const { done: preloadingComplete, error: preloadingError } = usePreloadAssets(
		assetUrls ?? defaultEditorAssetUrls
	)

	switch (store.status) {
		case 'error': {
			// for error handling, we fall back to the default error boundary.
			// if users want to handle this error differently, they can render
			// their own error screen before the TldrawEditor component
			throw store.error
		}
		case 'loading': {
			return <LoadingScreen>Connecting...</LoadingScreen>
		}
		case 'not-synced': {
			break
		}
		case 'synced-local': {
			break
		}
		case 'synced-remote': {
			break
		}
	}

	if (preloadingError) {
		return <ErrorScreen>Could not load assets. Please refresh the page.</ErrorScreen>
	}

	if (!preloadingComplete) {
		return <LoadingScreen>Loading assets...</LoadingScreen>
	}

	return <TldrawEditorWithReadyStore {...rest} store={store.store} />
})

function TldrawEditorWithReadyStore({
	onMount,
	children,
	onCreateAssetFromFile,
	onCreateBookmarkFromUrl,
	store,
	tools,
	shapes,
	autoFocus,
}: TldrawEditorProps & {
	store: TLStore
}) {
	const { ErrorFallback } = useEditorComponents()
	const container = useContainer()
	const [editor, setEditor] = useState<Editor | null>(null)

	useLayoutEffect(() => {
		const editor = new Editor({
			store,
			shapes,
			tools,
			getContainer: () => container,
		})
		;(window as any).app = editor
		;(window as any).editor = editor
		setEditor(editor)
		return () => {
			editor.dispose()
		}
	}, [container, shapes, tools, store])

	React.useEffect(() => {
		if (!editor) return

		// Overwrite the default onCreateAssetFromFile handler.
		if (onCreateAssetFromFile) {
			editor.onCreateAssetFromFile = onCreateAssetFromFile
		}

		if (onCreateBookmarkFromUrl) {
			editor.onCreateBookmarkFromUrl = onCreateBookmarkFromUrl
		}
	}, [editor, onCreateAssetFromFile, onCreateBookmarkFromUrl])

	React.useLayoutEffect(() => {
		if (editor && autoFocus) editor.focus()
	}, [editor, autoFocus])

	const onMountEvent = useEvent((editor: Editor) => {
		onMount?.(editor)
		editor.emit('mount')
		window.tldrawReady = true
	})

	React.useEffect(() => {
		if (editor) onMountEvent(editor)
	}, [editor, onMountEvent])

	const crashingError = useSyncExternalStore(
		useCallback(
			(onStoreChange) => {
				if (editor) {
					editor.on('crash', onStoreChange)
					return () => editor.off('crash', onStoreChange)
				}
				return () => {
					// noop
				}
			},
			[editor]
		),
		() => editor?.crashingError ?? null
	)

	if (!editor) {
		return null
	}

	return (
		// the top-level tldraw component also renders an error boundary almost
		// identical to this one. the reason we have two is because this one has
		// access to `App`, which means that here we can enrich errors with data
		// from app for reporting, and also still attempt to render the user's
		// document in the event of an error to reassure them that their work is
		// not lost.
		<OptionalErrorBoundary
			fallback={ErrorFallback ? (error) => <ErrorFallback error={error} editor={editor} /> : null}
			onError={(error) =>
				editor.annotateError(error, { origin: 'react.tldraw', willCrashApp: true })
			}
		>
			{crashingError ? (
				<Crash crashingError={crashingError} />
			) : (
				<EditorContext.Provider value={editor}>
					<Layout>{children}</Layout>
				</EditorContext.Provider>
			)}
		</OptionalErrorBoundary>
	)
}

function Layout({ children }: { children: any }) {
	useZoomCss()
	useCursor()
	useDarkMode()
	useSafariFocusOutFix()
	useForceUpdate()

	return children
}

function Crash({ crashingError }: { crashingError: unknown }): null {
	throw crashingError
}

/** @public */
export function LoadingScreen({ children }: { children: any }) {
	const { Spinner } = useEditorComponents()

	return (
		<div className="tl-loading">
			{Spinner ? <Spinner /> : null}
			{children}
		</div>
	)
}

/** @public */
export function ErrorScreen({ children }: { children: any }) {
	return <div className="tl-loading">{children}</div>
}
