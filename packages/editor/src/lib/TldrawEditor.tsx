import { TLAsset, TLInstanceId, TLStore } from '@tldraw/tlschema'
import { Store } from '@tldraw/tlstore'
import { annotateError } from '@tldraw/utils'
import React, { memo, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { App } from './app/App'
import { EditorAssetUrls, defaultEditorAssetUrls } from './assetUrls'
import { OptionalErrorBoundary } from './components/ErrorBoundary'

import { SyncedStore } from './config/SyncedStore'

import { StateNodeConstructor, TLShapeUtilConstructor, createTldrawEditorStore } from '..'
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
	/**
	 * An array of shape utils to use in the editor.
	 */
	shapes: TLShapeUtilConstructor<any>[]
	/**
	 * An array of tools to use in the editor.
	 */
	tools: StateNodeConstructor[]
	/** Overrides for the tldraw components */
	components?: Partial<TLEditorComponents>
	/**
	 * Called when the editor has mounted.
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
	 * Called when the editor generates a new asset from a file, such as when an image is dropped into
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
	 * The Store instance to use for keeping the editor's data. This may be prepopulated, e.g. by loading
	 * from a server or database.
	 */
	store?: TLStore | SyncedStore
	/**
	 * The id of the editor instance (e.g. a browser tab if the editor will have only one tldraw app per
	 * tab). If not given, one will be generated.
	 */
	instanceId?: TLInstanceId
	/** Asset URLs */
	assetUrls?: EditorAssetUrls
	/** Whether to automatically focus the editor when it mounts. */
	autoFocus?: boolean
	children?: any
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

const TldrawEditorBeforeLoading = memo(function TldrawEditorBeforeLoading({
	instanceId,
	store,
	...props
}: TldrawEditorProps) {
	const { done: preloadingComplete, error: preloadingError } = usePreloadAssets(
		props.assetUrls ?? defaultEditorAssetUrls
	)

	const _store = useMemo(() => store ?? createTldrawEditorStore(), [store])

	let loadedStore: TLStore | SyncedStore

	if (!(_store instanceof Store)) {
		if (_store.error) {
			// for error handling, we fall back to the default error boundary.
			// if users want to handle this error differently, they can render
			// their own error screen before the TldrawEditor component
			throw _store.error
		}
		if (!_store.store) {
			return <LoadingScreen>Connecting...</LoadingScreen>
		}

		loadedStore = _store.store
	} else {
		loadedStore = _store
	}

	if (instanceId && loadedStore.props.instanceId !== instanceId) {
		console.error(
			`The store's instanceId (${loadedStore.props.instanceId}) does not match the instanceId prop (${instanceId}). This may cause unexpected behavior.`
		)
	}

	if (preloadingError) {
		return <ErrorScreen>Could not load assets. Please refresh the page.</ErrorScreen>
	}

	if (!preloadingComplete) {
		return <LoadingScreen>Loading assets...</LoadingScreen>
	}

	return <TldrawEditorAfterLoading {...props} store={loadedStore} />
})

function TldrawEditorAfterLoading({
	onMount,
	children,
	onCreateAssetFromFile,
	onCreateBookmarkFromUrl,
	store,
	tools,
	shapes,
	autoFocus,
}: Omit<TldrawEditorProps, 'instanceId'> & {
	store: TLStore
}) {
	const { ErrorFallback } = useEditorComponents()
	const container = useContainer()
	const [app, setApp] = useState<App | null>(null)

	useEffect(() => {
		const app = new App({
			store: store ?? createTldrawEditorStore(),
			shapes,
			tools,
			getContainer: () => container,
		})
		;(window as any).app = app
		setApp(app)
		return () => {
			app.dispose()
		}
	}, [container, shapes, tools, store])

	const onMountEvent = useEvent((app: App) => {
		onMount?.(app)
		app.emit('mount')
		window.tldrawReady = true
	})

	React.useEffect(() => {
		if (!app) return

		// Overwrite the default onCreateAssetFromFile handler.
		if (onCreateAssetFromFile) {
			app.onCreateAssetFromFile = onCreateAssetFromFile
		}

		if (onCreateBookmarkFromUrl) {
			app.onCreateBookmarkFromUrl = onCreateBookmarkFromUrl
		}
	}, [app, onCreateAssetFromFile, onCreateBookmarkFromUrl])

	React.useLayoutEffect(() => {
		if (!app) return

		if (autoFocus) {
			app.focus()
		}
	}, [app, autoFocus])

	React.useEffect(() => {
		if (!app) return

		onMountEvent(app)
	}, [app, onMountEvent])

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
