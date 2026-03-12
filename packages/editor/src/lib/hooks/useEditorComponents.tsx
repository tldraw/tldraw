import { ReactNode, useMemo } from 'react'
import { DefaultBackground } from '../components/default-components/DefaultBackground'
import { DefaultBrush } from '../components/default-components/DefaultBrush'
import { DefaultCanvas } from '../components/default-components/DefaultCanvas'
import { DefaultCollaboratorHint } from '../components/default-components/DefaultCollaboratorHint'
import { DefaultCursor } from '../components/default-components/DefaultCursor'
import { DefaultErrorFallback } from '../components/default-components/DefaultErrorFallback'
import { DefaultGrid } from '../components/default-components/DefaultGrid'
import { DefaultHandle } from '../components/default-components/DefaultHandle'
import { DefaultHandles } from '../components/default-components/DefaultHandles'
import { DefaultLoadingScreen } from '../components/default-components/DefaultLoadingScreen'
import { DefaultScribble } from '../components/default-components/DefaultScribble'
import { DefaultSelectionForeground } from '../components/default-components/DefaultSelectionForeground'
import { DefaultShapeErrorFallback } from '../components/default-components/DefaultShapeErrorFallback'
import { DefaultShapeIndicator } from '../components/default-components/DefaultShapeIndicator'
import { DefaultShapeIndicatorErrorFallback } from '../components/default-components/DefaultShapeIndicatorErrorFallback'
import { DefaultShapeIndicators } from '../components/default-components/DefaultShapeIndicators'
import { DefaultShapeWrapper } from '../components/default-components/DefaultShapeWrapper'
import { DefaultSnapIndicator } from '../components/default-components/DefaultSnapIndictor'
import { DefaultSpinner } from '../components/default-components/DefaultSpinner'
import { DefaultSvgDefs } from '../components/default-components/DefaultSvgDefs'
import type { TLEditorComponents } from './EditorComponentsContext'
import { EditorComponentsContext } from './EditorComponentsContext'
import { useShallowObjectIdentity } from './useIdentity'

export { useEditorComponents } from './EditorComponentsContext'
export type { TLEditorComponents } from './EditorComponentsContext'

interface ComponentsContextProviderProps {
	overrides?: TLEditorComponents
	children: ReactNode
}

export function EditorComponentsProvider({
	overrides = {},
	children,
}: ComponentsContextProviderProps) {
	const _overrides = useShallowObjectIdentity(overrides)
	const value = useMemo(
		(): Required<TLEditorComponents> => ({
			Background: DefaultBackground,
			Brush: DefaultBrush,
			Canvas: DefaultCanvas,
			CollaboratorBrush: DefaultBrush,
			CollaboratorCursor: DefaultCursor,
			CollaboratorHint: DefaultCollaboratorHint,
			CollaboratorScribble: DefaultScribble,
			CollaboratorShapeIndicator: DefaultShapeIndicator,
			Cursor: DefaultCursor,
			Grid: DefaultGrid,
			Handle: DefaultHandle,
			Handles: DefaultHandles,
			InFrontOfTheCanvas: null,
			LoadingScreen: DefaultLoadingScreen,
			OnTheCanvas: null,
			Overlays: null,
			Scribble: DefaultScribble,
			SelectionBackground: null,
			SelectionForeground: DefaultSelectionForeground,
			ShapeIndicator: DefaultShapeIndicator,
			ShapeIndicators: DefaultShapeIndicators,
			ShapeWrapper: DefaultShapeWrapper,
			SnapIndicator: DefaultSnapIndicator,
			Spinner: DefaultSpinner,
			SvgDefs: DefaultSvgDefs,
			ZoomBrush: DefaultBrush,

			ErrorFallback: DefaultErrorFallback,
			ShapeErrorFallback: DefaultShapeErrorFallback,
			ShapeIndicatorErrorFallback: DefaultShapeIndicatorErrorFallback,

			..._overrides,
		}),
		[_overrides]
	)

	return (
		<EditorComponentsContext.Provider value={value}>{children}</EditorComponentsContext.Provider>
	)
}
