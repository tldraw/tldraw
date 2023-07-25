import { SerializedStore, Store } from '@tldraw/store'
import { TLRecord, TLStore } from '@tldraw/tlschema'
import { Required, annotateError } from '@tldraw/utils'
import React, {
	memo,
	useCallback,
	useLayoutEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from 'react'

import classNames from 'classnames'
import { Canvas } from './components/Canvas'
import { OptionalErrorBoundary } from './components/ErrorBoundary'
import { DefaultErrorFallback } from './components/default-components/DefaultErrorFallback'
import { TLUser, createTLUser } from './config/createTLUser'
import { TLAnyShapeUtilConstructor } from './config/defaultShapes'
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
import { useSafariFocusOutFix } from './hooks/useSafariFocusOutFix'
import { useZoomCss } from './hooks/useZoomCss'
import { TLStoreWithStatus } from './utils/sync/StoreWithStatus'

/**
 * Props for the {@link @tldraw/tldraw#Tldraw} and {@link TldrawEditor} components.
 *
 * @public
 **/
export type TldrawEditorProps = TldrawEditorBaseProps &
	(
		| {
				store: TLStore | TLStoreWithStatus
		  }
		| {
				store?: undefined
				initialData?: SerializedStore<TLRecord>
				persistenceKey?: string
				sessionId?: string
				defaultName?: string
		  }
	)

/**
 * Base props for the {@link @tldraw/tldraw#Tldraw} and {@link TldrawEditor} components.
 *
 * @public
 */
export interface TldrawEditorBaseProps {
	/**
	 * The component's children.
	 */
	children?: any

	/**
	 * An array of shape utils to use in the editor.
	 */
	shapeUtils?: readonly TLAnyShapeUtilConstructor[]

	/**
	 * An array of tools to add to the editor's state chart.
	 */
	tools?: readonly TLStateNodeConstructor[]

	/**
	 * Whether to automatically focus the editor when it mounts.
	 */
	autoFocus?: boolean

	/**
	 * Overrides for the editor's components, such as handles, collaborator cursors, etc.
	 */
	components?: Partial<TLEditorComponents>

	/**
	 * Called when the editor has mounted.
	 */
	onMount?: TLOnMountHandler

	/**
	 * The editor's initial state (usually the id of the first active tool).
	 */
	initialState?: string

	/**
	 * A classname to pass to the editor's container.
	 */
	className?: string
}

/**
 * Called when the editor has mounted.
 * @example
 * ```ts
 * <Tldraw onMount={(editor) => editor.selectAll()} />
 * ```
 * @param editor - The editor instance.
 *
 * @public
 */
export type TLOnMountHandler = (editor: Editor) => (() => void) | undefined | void

declare global {
	interface Window {
		tldrawReady: boolean
	}
}

const EMPTY_SHAPE_UTILS_ARRAY = [] as const
const EMPTY_TOOLS_ARRAY = [] as const

/** @public */
export const TldrawEditor = memo(function TldrawEditor({
	store,
	components,
	className,
	...rest
}: TldrawEditorProps) {
	const [container, rContainer] = React.useState<HTMLDivElement | null>(null)
	const user = useMemo(() => createTLUser(), [])

	const ErrorFallback =
		components?.ErrorFallback === undefined ? DefaultErrorFallback : components?.ErrorFallback

	// apply defaults. if you're using the bare @tldraw/editor package, we
	// default these to the "tldraw zero" configuration. We have different
	// defaults applied in @tldraw/tldraw.
	const withDefaults = {
		...rest,
		shapeUtils: rest.shapeUtils ?? EMPTY_SHAPE_UTILS_ARRAY,
		tools: rest.tools ?? EMPTY_TOOLS_ARRAY,
	}

	return (
		<div
			ref={rContainer}
			draggable={false}
			className={classNames('tl-container tl-theme__light', className)}
			tabIndex={0}
		>
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
	props: Required<TldrawEditorProps & { store: undefined; user: TLUser }, 'shapeUtils' | 'tools'>
) {
	const { defaultName, initialData, shapeUtils, persistenceKey, sessionId, user } = props

	const syncedStore = useLocalStore({
		shapeUtils,
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
}: Required<
	TldrawEditorProps & { store: TLStoreWithStatus; user: TLUser },
	'shapeUtils' | 'tools'
>) {
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
	shapeUtils,
	autoFocus,
	user,
	initialState,
}: Required<
	TldrawEditorProps & {
		store: TLStore
		user: TLUser
	},
	'shapeUtils' | 'tools'
>) {
	const { ErrorFallback } = useEditorComponents()
	const container = useContainer()
	const [editor, setEditor] = useState<Editor | null>(null)

	useLayoutEffect(() => {
		const editor = new Editor({
			store,
			shapeUtils,
			tools,
			getContainer: () => container,
			user,
			initialState,
		})
		;(window as any).app = editor
		;(window as any).editor = editor
		setEditor(editor)

		return () => {
			editor.dispose()
		}
	}, [container, shapeUtils, tools, store, user, initialState])

	React.useLayoutEffect(() => {
		if (editor && autoFocus) {
			editor.focus()
		}
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
			fallback={ErrorFallback as any}
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

	return children ?? <Canvas />
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
