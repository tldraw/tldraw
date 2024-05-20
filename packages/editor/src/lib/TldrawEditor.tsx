import { MigrationSequence, SerializedStore, Store, StoreSnapshot } from '@tldraw/store'
import { TLRecord, TLStore } from '@tldraw/tlschema'
import { Expand, Required, annotateError } from '@tldraw/utils'
import React, {
	ReactNode,
	memo,
	useCallback,
	useLayoutEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from 'react'

import classNames from 'classnames'
import { OptionalErrorBoundary } from './components/ErrorBoundary'
import { DefaultErrorFallback } from './components/default-components/DefaultErrorFallback'
import { TLUser, createTLUser } from './config/createTLUser'
import { TLAnyBindingUtilConstructor } from './config/defaultBindings'
import { TLAnyShapeUtilConstructor } from './config/defaultShapes'
import { Editor } from './editor/Editor'
import { TLStateNodeConstructor } from './editor/tools/StateNode'
import { TLCameraOptions } from './editor/types/misc-types'
import { ContainerProvider, useContainer } from './hooks/useContainer'
import { useCursor } from './hooks/useCursor'
import { useDarkMode } from './hooks/useDarkMode'
import { EditorContext, useEditor } from './hooks/useEditor'
import {
	EditorComponentsProvider,
	TLEditorComponents,
	useEditorComponents,
} from './hooks/useEditorComponents'
import { useEvent } from './hooks/useEvent'
import { useForceUpdate } from './hooks/useForceUpdate'
import { useLocalStore } from './hooks/useLocalStore'
import { useZoomCss } from './hooks/useZoomCss'
import { stopEventPropagation } from './utils/dom'
import { TLStoreWithStatus } from './utils/sync/StoreWithStatus'

/**
 * Props for the {@link tldraw#Tldraw} and {@link TldrawEditor} components.
 *
 * @public
 **/
export type TldrawEditorProps = Expand<
	TldrawEditorBaseProps &
		(
			| {
					store: TLStore | TLStoreWithStatus
			  }
			| {
					store?: undefined
					migrations?: readonly MigrationSequence[]
					snapshot?: StoreSnapshot<TLRecord>
					initialData?: SerializedStore<TLRecord>
					persistenceKey?: string
					sessionId?: string
					defaultName?: string
			  }
		)
>

/**
 * Base props for the {@link tldraw#Tldraw} and {@link TldrawEditor} components.
 *
 * @public
 */
export interface TldrawEditorBaseProps {
	/**
	 * The component's children.
	 */
	children?: ReactNode

	/**
	 * An array of shape utils to use in the editor.
	 */
	shapeUtils?: readonly TLAnyShapeUtilConstructor[]

	/**
	 * An array of binding utils to use in the editor.
	 */
	bindingUtils?: readonly TLAnyBindingUtilConstructor[]

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
	components?: TLEditorComponents

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

	/**
	 * The user interacting with the editor.
	 */
	user?: TLUser

	/**
	 * Whether to infer dark mode from the user's OS. Defaults to false.
	 */
	inferDarkMode?: boolean

	/**
	 * Camera options for the editor.
	 */
	cameraOptions?: Partial<TLCameraOptions>
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
export type TLOnMountHandler = (editor: Editor) => (() => void | undefined) | undefined | void

declare global {
	interface Window {
		tldrawReady: boolean
	}
}

const EMPTY_SHAPE_UTILS_ARRAY = [] as const
const EMPTY_BINDING_UTILS_ARRAY = [] as const
const EMPTY_TOOLS_ARRAY = [] as const

/** @public */
export const TldrawEditor = memo(function TldrawEditor({
	store,
	components,
	className,
	user: _user,
	...rest
}: TldrawEditorProps) {
	const [container, setContainer] = React.useState<HTMLDivElement | null>(null)
	const user = useMemo(() => _user ?? createTLUser(), [_user])

	const ErrorFallback =
		components?.ErrorFallback === undefined ? DefaultErrorFallback : components?.ErrorFallback

	// apply defaults. if you're using the bare @tldraw/editor package, we
	// default these to the "tldraw zero" configuration. We have different
	// defaults applied in tldraw.
	const withDefaults = {
		...rest,
		shapeUtils: rest.shapeUtils ?? EMPTY_SHAPE_UTILS_ARRAY,
		bindingUtils: rest.bindingUtils ?? EMPTY_BINDING_UTILS_ARRAY,
		tools: rest.tools ?? EMPTY_TOOLS_ARRAY,
		components,
	}

	return (
		<div
			ref={setContainer}
			draggable={false}
			className={classNames('tl-container tl-theme__light', className)}
			onPointerDown={stopEventPropagation}
			tabIndex={-1}
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
	props: Required<
		TldrawEditorProps & { store: undefined; user: TLUser },
		'shapeUtils' | 'bindingUtils' | 'tools'
	>
) {
	const {
		defaultName,
		snapshot,
		initialData,
		shapeUtils,
		bindingUtils,
		persistenceKey,
		sessionId,
		user,
	} = props

	const syncedStore = useLocalStore({
		shapeUtils,
		bindingUtils,
		initialData,
		persistenceKey,
		sessionId,
		defaultName,
		snapshot,
	})

	return <TldrawEditorWithLoadingStore {...props} store={syncedStore} user={user} />
}

const TldrawEditorWithLoadingStore = memo(function TldrawEditorBeforeLoading({
	store,
	user,
	...rest
}: Required<
	TldrawEditorProps & { store: TLStoreWithStatus; user: TLUser },
	'shapeUtils' | 'bindingUtils' | 'tools'
>) {
	const container = useContainer()

	useLayoutEffect(() => {
		if (user.userPreferences.get().isDarkMode) {
			container.classList.remove('tl-theme__light')
			container.classList.add('tl-theme__dark')
		}
	}, [container, user])

	const { LoadingScreen } = useEditorComponents()

	switch (store.status) {
		case 'error': {
			// for error handling, we fall back to the default error boundary.
			// if users want to handle this error differently, they can render
			// their own error screen before the TldrawEditor component
			throw store.error
		}
		case 'loading': {
			return LoadingScreen ? <LoadingScreen /> : null
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
	bindingUtils,
	user,
	initialState,
	autoFocus = true,
	inferDarkMode,
	cameraOptions,
}: Required<
	TldrawEditorProps & {
		store: TLStore
		user: TLUser
	},
	'shapeUtils' | 'bindingUtils' | 'tools'
>) {
	const { ErrorFallback } = useEditorComponents()
	const container = useContainer()
	const [editor, setEditor] = useState<Editor | null>(null)
	const [initialAutoFocus] = useState(autoFocus)

	useLayoutEffect(() => {
		const editor = new Editor({
			store,
			shapeUtils,
			bindingUtils,
			tools,
			getContainer: () => container,
			user,
			initialState,
			autoFocus: initialAutoFocus,
			inferDarkMode,
			cameraOptions,
		})
		setEditor(editor)

		return () => {
			editor.dispose()
		}
	}, [
		container,
		shapeUtils,
		bindingUtils,
		tools,
		store,
		user,
		initialState,
		initialAutoFocus,
		inferDarkMode,
		cameraOptions,
	])

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
		() => editor?.getCrashingError() ?? null
	)

	const { Canvas } = useEditorComponents()

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
					<Layout onMount={onMount}>{children ?? (Canvas ? <Canvas /> : null)}</Layout>
				</EditorContext.Provider>
			)}
		</OptionalErrorBoundary>
	)
}

function Layout({ children, onMount }: { children: ReactNode; onMount?: TLOnMountHandler }) {
	useZoomCss()
	useCursor()
	useDarkMode()
	useForceUpdate()
	useOnMount(onMount)

	return <>{children}</>
}

function Crash({ crashingError }: { crashingError: unknown }): null {
	throw crashingError
}

/** @public */
export function LoadingScreen({ children }: { children: ReactNode }) {
	return <div className="tl-loading">{children}</div>
}

/** @public */
export function ErrorScreen({ children }: { children: ReactNode }) {
	return <div className="tl-loading">{children}</div>
}

function useOnMount(onMount?: TLOnMountHandler) {
	const editor = useEditor()

	const onMountEvent = useEvent((editor: Editor) => {
		let teardown: (() => void) | void = undefined
		editor.history.ignore(() => {
			teardown = onMount?.(editor)
			editor.emit('mount')
		})
		window.tldrawReady = true
		return teardown
	})

	React.useLayoutEffect(() => {
		if (editor) return onMountEvent?.(editor)
	}, [editor, onMountEvent])
}
