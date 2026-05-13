import { TLAssetStore, TLStoreSnapshot } from '@tldraw/tlschema'
import { annotateError } from '@tldraw/utils'
import classNames from 'classnames'
import { memo, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { version } from '../version'
import { DefaultErrorFallback } from './components/default-components/DefaultErrorFallback'
import { ViewerCanvas } from './components/default-components/ViewerCanvas'
import { OptionalErrorBoundary } from './components/ErrorBoundary'
import { createTLCurrentUser } from './config/createTLCurrentUser'
import { createTLStore } from './config/createTLStore'
import { TLAnyAssetUtilConstructor } from './config/defaultAssets'
import { TLAnyBindingUtilConstructor } from './config/defaultBindings'
import { TLAnyShapeUtilConstructor } from './config/defaultShapes'
import { Editor } from './editor/Editor'
import type { TLEditorComponents } from './hooks/EditorComponentsContext'
import { ContainerProvider, useContainer } from './hooks/useContainer'
import { EditorProvider } from './hooks/useEditor'
import { EditorComponentsProvider, useEditorComponents } from './hooks/useEditorComponents'
import { LicenseProvider } from './license/LicenseProvider'
import { TldrawOptions } from './options'
import { TL_CONTAINER_CLASS, TLOnMountHandler } from './TldrawEditor'

const EMPTY_TOOLS_ARRAY = [] as const

/** @public */
export interface TldrawViewerProps {
	snapshot: TLStoreSnapshot
	shapeUtils: readonly TLAnyShapeUtilConstructor[]
	bindingUtils: readonly TLAnyBindingUtilConstructor[]
	assetUtils: readonly TLAnyAssetUtilConstructor[]
	assets?: TLAssetStore
	components?: TLEditorComponents
	onMount?: TLOnMountHandler
	className?: string
	options?: Partial<TldrawOptions>
	licenseKey?: string
	assetUrls?: { fonts?: { [key: string]: string | undefined } }
}

/**
 * A read-only renderer for a tldraw document. Standalone from {@link TldrawEditor} —
 * no event handlers, no UI, no watermark, no tools, no live theme/camera sync, no
 * focus management. Use it to render many document previews on a single page.
 *
 * @public @react
 */
export const TldrawViewer = memo(function TldrawViewer({
	snapshot,
	shapeUtils,
	bindingUtils,
	assetUtils,
	assets,
	components,
	onMount,
	className,
	options,
	licenseKey,
	assetUrls,
}: TldrawViewerProps) {
	const [container, setContainer] = useState<HTMLElement | null>(null)

	const ErrorFallback =
		components?.ErrorFallback === undefined ? DefaultErrorFallback : components?.ErrorFallback

	const componentsWithViewerCanvas = useMemo<TLEditorComponents>(
		() => ({ Canvas: ViewerCanvas, ...components }),
		[components]
	)

	return (
		<div
			ref={setContainer}
			data-tldraw={version}
			draggable={false}
			className={classNames(`${TL_CONTAINER_CLASS} tl-theme__light`, className)}
			tabIndex={-1}
			role="application"
			aria-label="tldraw preview"
		>
			<OptionalErrorBoundary
				fallback={ErrorFallback}
				onError={(error) => annotateError(error, { tags: { origin: 'react.tldraw-viewer' } })}
			>
				{container && (
					<LicenseProvider licenseKey={licenseKey}>
						<ContainerProvider container={container}>
							<EditorComponentsProvider overrides={componentsWithViewerCanvas}>
								<TldrawViewerInner
									snapshot={snapshot}
									shapeUtils={shapeUtils}
									bindingUtils={bindingUtils}
									assetUtils={assetUtils}
									assets={assets}
									options={options}
									licenseKey={licenseKey}
									onMount={onMount}
									assetUrls={assetUrls}
								/>
							</EditorComponentsProvider>
						</ContainerProvider>
					</LicenseProvider>
				)}
			</OptionalErrorBoundary>
		</div>
	)
})

interface TldrawViewerInnerProps {
	snapshot: TLStoreSnapshot
	shapeUtils: readonly TLAnyShapeUtilConstructor[]
	bindingUtils: readonly TLAnyBindingUtilConstructor[]
	assetUtils: readonly TLAnyAssetUtilConstructor[]
	assets?: TLAssetStore
	options?: Partial<TldrawOptions>
	licenseKey?: string
	onMount?: TLOnMountHandler
	assetUrls?: { fonts?: { [key: string]: string | undefined } }
}

function TldrawViewerInner({
	snapshot,
	shapeUtils,
	bindingUtils,
	assetUtils,
	assets,
	options,
	licenseKey,
	onMount,
	assetUrls,
}: TldrawViewerInnerProps) {
	const container = useContainer()
	const user = useMemo(() => createTLCurrentUser(), [])

	const store = useMemo(
		() => createTLStore({ shapeUtils, bindingUtils, assetUtils, snapshot, assets }),
		[shapeUtils, bindingUtils, assetUtils, snapshot, assets]
	)

	const [editor, setEditor] = useState<Editor | null>(null)

	useLayoutEffect(() => {
		const newEditor = new Editor({
			store,
			shapeUtils,
			bindingUtils,
			assetUtils,
			tools: EMPTY_TOOLS_ARRAY,
			getContainer: () => container,
			user,
			autoFocus: false,
			options,
			licenseKey,
			fontAssetUrls: assetUrls?.fonts,
		})
		newEditor.updateViewportScreenBounds(container)
		setEditor(newEditor)
		return () => {
			newEditor.dispose()
		}
	}, [store, shapeUtils, bindingUtils, assetUtils, container, options, licenseKey, user, assetUrls])

	useLayoutEffect(() => {
		if (!editor) return
		let teardown: (() => void | undefined) | undefined | void
		editor.run(
			() => {
				const storeTeardown = editor.store.props.onMount(editor)
				const userTeardown = onMount?.(editor)
				teardown = () => {
					storeTeardown?.()
					userTeardown?.()
				}
				editor.emit('mount')
			},
			{ history: 'ignore' }
		)
		return () => {
			teardown?.()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editor])

	const [fontsLoaded, setFontsLoaded] = useState(false)
	useEffect(() => {
		setFontsLoaded(false)
		if (!editor) return
		if (editor.options.maxFontsToLoadBeforeRender === 0) {
			setFontsLoaded(true)
			return
		}
		let cancelled = false
		editor.fonts
			.loadRequiredFontsForCurrentPage(editor.options.maxFontsToLoadBeforeRender)
			.finally(() => {
				if (!cancelled) setFontsLoaded(true)
			})
		return () => {
			cancelled = true
		}
	}, [editor])

	const { Canvas } = useEditorComponents()

	if (!editor || !fontsLoaded) return null

	return (
		<EditorProvider editor={editor}>
			{Canvas ? <Canvas key={editor.contextId} /> : null}
		</EditorProvider>
	)
}
