import { setDefaultEditorPlugins } from '@tldraw/core'
import { registerTldrawLibraryVersion } from '@tldraw/utils'
import { createDefaultPlugins as _createDefaultPlugins } from './lib/react/defaultPlugins'

// eslint-disable-next-line tldraw/no-export-star
export * from '@tldraw/core'
// eslint-disable-next-line tldraw/no-export-star
export * from '@tldraw/state'
// eslint-disable-next-line tldraw/no-export-star
export * from '@tldraw/state-react'
// eslint-disable-next-line tldraw/no-export-star
export * from '@tldraw/store'
// eslint-disable-next-line tldraw/no-export-star
export * from '@tldraw/tlschema'
// eslint-disable-next-line tldraw/no-export-star
export * from '@tldraw/utils'
// eslint-disable-next-line tldraw/no-export-star
export * from '@tldraw/validate'

export { DefaultBackground } from './lib/components/default-components/DefaultBackground'
export { createDefaultPlugins, registerDefaultPlugins } from './lib/react/defaultPlugins'
export { reactRenderingPlugins, reactSvgExportPlugin } from './lib/react/reactRenderingPlugins'
export { groupShapeViewPlugin } from './lib/react/groupShapeView'
export {
	DefaultCanvas,
	type TLCanvasComponentProps,
} from './lib/components/default-components/DefaultCanvas'
export {
	DefaultCursor,
	type TLCursorProps,
} from './lib/components/default-components/DefaultCursor'
export {
	DefaultErrorFallback,
	type TLErrorFallbackComponent,
	type TLErrorFallbackProps,
} from './lib/components/default-components/DefaultErrorFallback'
export { DefaultGrid, type TLGridProps } from './lib/components/default-components/DefaultGrid'
export { type TLShapeErrorFallbackComponent } from './lib/components/default-components/DefaultShapeErrorFallback'
export {
	DefaultShapeWrapper,
	type TLShapeWrapperProps,
} from './lib/components/default-components/DefaultShapeWrapper'
export {
	DefaultSpinner,
	type TLSpinnerProps,
} from './lib/components/default-components/DefaultSpinner'
export { DefaultSvgDefs } from './lib/components/default-components/DefaultSvgDefs'
export {
	EditorPortal,
	useEditorPortalHost,
	type EditorPortalProps,
} from './lib/components/EditorPortal'
export {
	ErrorBoundary,
	OptionalErrorBoundary,
	type TLErrorBoundaryProps,
} from './lib/components/ErrorBoundary'
export { HTMLContainer, type HTMLContainerProps } from './lib/components/HTMLContainer'
export { MenuClickCapture } from './lib/components/MenuClickCapture'
export { SVGContainer, type SVGContainerProps } from './lib/components/SVGContainer'
export { useTldrawCurrentUser } from './lib/hooks/useTldrawCurrentUser'
export { useDelaySvgExport, useSvgExportContext } from './lib/exports/SvgExportContextProvider'
export {
	ContainerProvider,
	useContainer,
	useContainerIfExists,
	type ContainerProviderProps,
} from './lib/hooks/useContainer'
export { useColorMode } from './lib/hooks/useColorMode'
export { getCursor } from './lib/hooks/useCursor'
export {
	EditorContext,
	EditorProvider,
	useEditor,
	useMaybeEditor,
	type EditorProviderProps,
} from './lib/hooks/useEditor'
export { useEditorComponents } from './lib/hooks/useEditorComponents'
export type { TLEditorComponents } from './lib/hooks/useEditorComponents'
export { useEvent, useReactiveEvent } from './lib/hooks/useEvent'
export { useGlobalMenuIsOpen } from './lib/hooks/useGlobalMenuIsOpen'
export { useShallowArrayIdentity, useShallowObjectIdentity } from './lib/hooks/useIdentity'
export { useIsCropping } from './lib/hooks/useIsCropping'
export { useIsEditing } from './lib/hooks/useIsEditing'
export { useLocalStore } from './lib/hooks/useLocalStore'
export { usePassThroughWheelEvents } from './lib/hooks/usePassThroughWheelEvents'
export { usePeerIds } from './lib/hooks/usePeerIds'
export { usePresence } from './lib/hooks/usePresence'
export { useRefState } from './lib/hooks/useRefState'
export {
	sanitizeId,
	suffixSafeId,
	useSharedSafeId,
	useUniqueSafeId,
	type SafeId,
} from './lib/hooks/useSafeId'
export { useTransform } from './lib/hooks/useTransform'
export { isCursorInViewport } from './lib/utils/collaborators'
export { useTLSchemaFromUtils, useTLStore } from './lib/hooks/useTLStore'
// oxlint-disable-next-line typescript/no-deprecated
export { useViewportHeight } from './lib/hooks/useViewportHeight'
export {
	LICENSE_TIMEOUT,
	useLicenseContext,
	useMaybeLicenseManager,
} from './lib/license/LicenseProvider'
export { useLicenseFeatureFlag } from './lib/license/useLicenseManagerState'
export {
	EditorI18nFallbackContext,
	ErrorScreen,
	LoadingScreen,
	type LoadingScreenProps,
	TldrawEditor,
	type TldrawEditorBaseProps,
	type TldrawEditorProps,
	type TldrawEditorStoreProps,
	type TldrawEditorWithoutStoreProps,
	type TldrawEditorWithStoreProps,
	type TLOnMountHandler,
	useOnMount,
} from './lib/TldrawEditor'
export { EditorAtom } from './lib/utils/EditorAtom'
export { getPointerInfo } from './lib/utils/getPointerInfo'
export { getSvgPathFromPoints } from './lib/utils/getSvgPathFromPoints'
export { normalizeWheel } from './lib/utils/normalizeWheel'
export {
	hardResetEditor,
	openWindow,
	refreshPage,
	runtime,
	setRuntimeOverrides,
} from './lib/utils/runtime'
export { hardReset } from './lib/utils/sync/hardReset'
export { LocalIndexedDb, Table, type StoreName } from './lib/utils/sync/LocalIndexedDb'
export { type TLStoreWithStatus } from './lib/utils/sync/StoreWithStatus'
export { uniq } from './lib/utils/uniq'

// `new Editor()` without `plugins` keeps the behavior it had before plugins.
setDefaultEditorPlugins(_createDefaultPlugins)

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
