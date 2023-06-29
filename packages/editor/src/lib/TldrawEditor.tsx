import { SerializedStore, Store } from '@tldraw/store'
import { TLRecord, TLStore } from '@tldraw/tlschema'
import { RecursivePartial, Required, annotateError } from '@tldraw/utils'
import React, {
	memo,
	useCallback,
	useLayoutEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from 'react'
import { TLEditorAssetUrls, useDefaultEditorAssetsWithOverrides } from './assetUrls'
import { DefaultErrorFallback } from './components/DefaultErrorFallback'
import { OptionalErrorBoundary } from './components/ErrorBoundary'
import { TLUser, createTLUser } from './config/createTLUser'
import { AnyTLShapeInfo } from './config/defineShape'
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
	/** An array of shape utils to use in the editor. */
	shapes?: readonly AnyTLShapeInfo[]
	/** An array of tools to use in the editor. */
	tools?: readonly TLStateNodeConstructor[]
	/** Urls for where to find fonts and other assets. */
	assetUrls?: RecursivePartial<TLEditorAssetUrls>
	/** Whether to automatically focus the editor when it mounts. */
	autoFocus?: boolean
	/** Overrides for the tldraw user interface components. */
	components?: Partial<TLEditorComponents>
	/**
	 * Called when the editor has mounted.
	 * @example
	 * ```ts
	 * function TldrawEditor() {
	 * 	return <Editor onMount={(editor) => editor.selectAll()} />
	 * }
	 * ```
	 * @param editor - The editor instance.
	 */
	onMount?: (editor: Editor) => (() => void) | undefined | void
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
			initialData?: SerializedStore<TLRecord>
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

const EMPTY_SHAPES_ARRAY = [] as const
const EMPTY_TOOLS_ARRAY = [] as const

/** @public */
export const TldrawEditor = memo(function TldrawEditor({
	store,
	components,
	...rest
}: TldrawEditorProps) {
	const [container, setContainer] = React.useState<HTMLDivElement | null>(null)
	const user = useMemo(() => createTLUser(), [])

	const ErrorFallback =
		components?.ErrorFallback === undefined ? DefaultErrorFallback : components?.ErrorFallback

	// apply defaults. if you're using the bare @tldraw/editor package, we
	// default these to the "tldraw zero" configuration. We have different
	// defaults applied in @tldraw/tldraw.
	const withDefaults = {
		...rest,
		shapes: rest.shapes ?? EMPTY_SHAPES_ARRAY,
		tools: rest.tools ?? EMPTY_TOOLS_ARRAY,
	}

	return (
		<div ref={setContainer} draggable={false} className="tl-container tl-theme__light" tabIndex={0}>
			<OptionalErrorBoundary
				fallback={ErrorFallback}
				onError={(error) => annotateError(error, { tags: { origin: 'react.tldraw-before-app' } })}
			>
				{container && (
					<ContainerProvider container={container}>
						<EditorComponentsProvider overrides={components}>
							{store ? (
								store instanceof Store ? (
									// Store is ready to go, whether externally synced or not
									<TldrawEditorWithReadyStore {...withDefaults} store={store} user={user} />
								) : (
									// Store is a synced store, so handle syncing stages internally
									<TldrawEditorWithLoadingStore {...withDefaults} store={store} user={user} />
								)
							) : (
								// We have no store (it's undefined) so create one and possibly sync it
								<TldrawEditorWithOwnStore {...withDefaults} store={store} user={user} />
							)}
						</EditorComponentsProvider>
					</ContainerProvider>
				)}
			</OptionalErrorBoundary>
		</div>
	)
})

function TldrawEditorWithOwnStore(
	props: Required<TldrawEditorProps & { store: undefined; user: TLUser }, 'shapes' | 'tools'>
) {
	const { defaultName, initialData, shapes, persistenceKey, sessionId, user } = props

	const syncedStore = useLocalStore({
		shapes,
		initialData,
		persistenceKey,
		sessionId,
		defaultName,
	})

	return <TldrawEditorWithLoadingStore {...props} store={syncedStore} user={user} />
}

const TldrawEditorWithLoadingStore = memo(function TldrawEditorBeforeLoading({
	store,
	user,
	...rest
}: Required<TldrawEditorProps & { store: TLStoreWithStatus; user: TLUser }, 'shapes' | 'tools'>) {
	const container = useContainer()

	useLayoutEffect(() => {
		if (user.userPreferences.value.isDarkMode) {
			container.classList.remove('tl-theme__light')
			container.classList.add('tl-theme__dark')
		}
	}, [container, user.userPreferences.value.isDarkMode])

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

	return <TldrawEditorWithReadyStore {...rest} store={store.store} user={user} />
})

function TldrawEditorWithReadyStore({
	onMount,
	children,
	store,
	tools,
	shapes,
	autoFocus,
	user,
	assetUrls,
}: Required<
	TldrawEditorProps & {
		store: TLStore
		user: TLUser
	},
	'shapes' | 'tools'
>) {
	const { ErrorFallback } = useEditorComponents()
	const container = useContainer()
	const [editor, setEditor] = useState<Editor | null>(null)

	useLayoutEffect(() => {
		const editor = new Editor({
			store,
			shapes,
			tools,
			getContainer: () => container,
			user,
		})
		;(window as any).app = editor
		;(window as any).editor = editor
		setEditor(editor)

		return () => {
			editor.dispose()
		}
	}, [container, shapes, tools, store, user])

	React.useLayoutEffect(() => {
		if (editor && autoFocus) editor.focus()
	}, [editor, autoFocus])

	const onMountEvent = useEvent((editor: Editor) => {
		const teardown = onMount?.(editor)
		editor.emit('mount')
		window.tldrawReady = true
		return teardown
	})

	React.useLayoutEffect(() => {
		if (editor) return onMountEvent?.(editor)
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

	const assets = useDefaultEditorAssetsWithOverrides(assetUrls)
	const { done: preloadingComplete, error: preloadingError } = usePreloadAssets(assets)

	if (preloadingError) {
		return <ErrorScreen>Could not load assets. Please refresh the page.</ErrorScreen>
	}

	if (!preloadingComplete) {
		return <LoadingScreen>Loading assets...</LoadingScreen>
	}

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
			fallback={ErrorFallback}
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
