import { TLAsset, TLInstance, TLInstanceId, TLStore, TLUser, TLUserId } from '@tldraw/tlschema'
import { Store } from '@tldraw/tlstore'
import { annotateError } from '@tldraw/utils'
import React, { useCallback, useSyncExternalStore } from 'react'
import { App } from './app/App'
import { EditorAssetUrls, defaultEditorAssetUrls } from './assetUrls'
import { OptionalErrorBoundary } from './components/ErrorBoundary'

import { SyncedStore } from './config/SyncedStore'
import { TldrawEditorConfig } from './config/TldrawEditorConfig'

import { DefaultErrorFallback } from './components/DefaultErrorFallback'
import { AppContext } from './hooks/useApp'
import { ContainerProvider, useContainer } from './hooks/useContainer'
import { useCursor } from './hooks/useCursor'
import { useDarkMode } from './hooks/useDarkMode'
import {
	EditorComponentsProvider,
	TLEditorComponents,
	useEditorComponents,
} from './hooks/useEditorComponents'
import { useEvent } from './hooks/useEvent'
import { useForceUpdate } from './hooks/useForceUpdate'
import { usePreloadAssets } from './hooks/usePreloadAssets'
import { useSafariFocusOutFix } from './hooks/useSafariFocusOutFix'
import { useZoomCss } from './hooks/useZoomCss'

/** @public */
export interface TldrawEditorProps {
	children?: any
	/** Overrides for the tldraw components */
	components?: Partial<TLEditorComponents>
	/** Whether to display the dark mode. */
	isDarkMode?: boolean
	/** A configuration defining major customizations to the app, such as custom shapes and new tools */
	config?: TldrawEditorConfig
	/**
	 * Called when the app has mounted.
	 *
	 * @example
	 *
	 * ```ts
	 * function TldrawEditor() {
	 * 	return <Editor onMount={(app) => app.selectAll()} />
	 * }
	 * ```
	 *
	 * @param app - The app instance.
	 */
	onMount?: (app: App) => void
	/**
	 * Called when the app generates a new asset from a file, such as when an image is dropped into
	 * the canvas.
	 *
	 * @example
	 *
	 * ```ts
	 * const app = new App({
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
	 * app.onCreateBookmarkFromUrl(url, id)
	 * ```
	 *
	 * @param url - The url that was created.
	 * @public
	 */
	onCreateBookmarkFromUrl?: (
		url: string
	) => Promise<{ image: string; title: string; description: string }>

	/**
	 * The Store instance to use for keeping the app's data. This may be prepopulated, e.g. by loading
	 * from a server or database.
	 */
	store?: TLStore | SyncedStore
	/** The id of the current user. If not given, one will be generated. */
	userId?: TLUserId
	/**
	 * The id of the app instance (e.g. a browser tab if the app will have only one tldraw app per
	 * tab). If not given, one will be generated.
	 */
	instanceId?: TLInstanceId
	/** Asset URLs */
	assetUrls?: EditorAssetUrls
	/** Whether to automatically focus the editor when it mounts. */
	autoFocus?: boolean
}

declare global {
	interface Window {
		tldrawReady: boolean
	}
}

/** @public */
export function TldrawEditor(props: TldrawEditorProps) {
	const [container, setContainer] = React.useState<HTMLDivElement | null>(null)
	const { components, ...rest } = props

	const ErrorFallback =
		components?.ErrorFallback === undefined ? DefaultErrorFallback : components?.ErrorFallback

	return (
		<div ref={setContainer} draggable={false} className="tl-container tl-theme__light" tabIndex={0}>
			<OptionalErrorBoundary
				fallback={ErrorFallback ? (error) => <ErrorFallback error={error} /> : null}
				onError={(error) => annotateError(error, { tags: { origin: 'react.tldraw-before-app' } })}
			>
				{container && (
					<ContainerProvider container={container}>
						<EditorComponentsProvider overrides={components}>
							<TldrawEditorBeforeLoading {...rest} />
						</EditorComponentsProvider>
					</ContainerProvider>
				)}
			</OptionalErrorBoundary>
		</div>
	)
}

function TldrawEditorBeforeLoading({
	config = TldrawEditorConfig.default,
	userId,
	instanceId,
	store,
	...props
}: TldrawEditorProps) {
	const { done: preloadingComplete, error: preloadingError } = usePreloadAssets(
		props.assetUrls ?? defaultEditorAssetUrls
	)

	store ??= config.createStore({
		userId: userId ?? TLUser.createId(),
		instanceId: instanceId ?? TLInstance.createId(),
	})

	let loadedStore
	if (!(store instanceof Store)) {
		if (store.error) {
			// for error handling, we fall back to the default error boundary.
			// if users want to handle this error differently, they can render
			// their own error screen before the TldrawEditor component
			throw store.error
		}
		if (!store.store) {
			return <LoadingScreen>Connecting...</LoadingScreen>
		}

		loadedStore = store.store
	} else {
		loadedStore = store
	}

	if (instanceId && loadedStore.props.instanceId !== instanceId) {
		console.error(
			`The store's instanceId (${loadedStore.props.instanceId}) does not match the instanceId prop (${instanceId}). This may cause unexpected behavior.`
		)
	}

	if (userId && loadedStore.props.userId !== userId) {
		console.error(
			`The store's userId (${loadedStore.props.userId}) does not match the userId prop (${userId}). This may cause unexpected behavior.`
		)
	}

	if (preloadingError) {
		return <ErrorScreen>Could not load assets. Please refresh the page.</ErrorScreen>
	}

	if (!preloadingComplete) {
		return <LoadingScreen>Loading assets...</LoadingScreen>
	}

	return <TldrawEditorAfterLoading {...props} store={loadedStore} config={config} />
}

function TldrawEditorAfterLoading({
	onMount,
	config,
	isDarkMode,
	children,
	onCreateAssetFromFile,
	onCreateBookmarkFromUrl,
	store,
	autoFocus,
}: Omit<TldrawEditorProps, 'store' | 'config' | 'instanceId' | 'userId'> & {
	config: TldrawEditorConfig
	store: TLStore
}) {
	const container = useContainer()

	const [app, setApp] = React.useState<App | null>(null)
	const { ErrorFallback } = useEditorComponents()

	React.useLayoutEffect(() => {
		const app = new App({
			store,
			getContainer: () => container,
			config,
		})
		setApp(app)

		if (autoFocus) {
			app.focus()
		}
		;(window as any).app = app
		return () => {
			app.dispose()
			setApp((prevApp) => (prevApp === app ? null : prevApp))
		}
	}, [container, config, store, autoFocus])

	React.useEffect(() => {
		if (app) {
			// Overwrite the default onCreateAssetFromFile handler.
			if (onCreateAssetFromFile) {
				app.onCreateAssetFromFile = onCreateAssetFromFile
			}

			if (onCreateBookmarkFromUrl) {
				app.onCreateBookmarkFromUrl = onCreateBookmarkFromUrl
			}
		}
	}, [app, onCreateAssetFromFile, onCreateBookmarkFromUrl])

	const onMountEvent = useEvent((app: App) => {
		onMount?.(app)
		app.emit('mount')
	})

	React.useEffect(() => {
		if (app) {
			// Set the initial theme state.
			if (isDarkMode !== undefined) {
				app.updateUserDocumentSettings({ isDarkMode })
			}

			// Run onMount
			window.tldrawReady = true
			onMountEvent(app)
		}
	}, [app, onMountEvent, isDarkMode])

	const crashingError = useSyncExternalStore(
		useCallback(
			(onStoreChange) => {
				if (app) {
					app.on('crash', onStoreChange)
					return () => app.off('crash', onStoreChange)
				}
				return () => {
					// noop
				}
			},
			[app]
		),
		() => app?.crashingError ?? null
	)

	if (!app) {
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
			fallback={ErrorFallback ? (error) => <ErrorFallback error={error} app={app} /> : null}
			onError={(error) => app.annotateError(error, { origin: 'react.tldraw', willCrashApp: true })}
		>
			{crashingError ? (
				<Crash crashingError={crashingError} />
			) : (
				<AppContext.Provider value={app}>
					<Layout>{children}</Layout>
				</AppContext.Provider>
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
