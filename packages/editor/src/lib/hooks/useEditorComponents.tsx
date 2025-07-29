import { ComponentType, ReactNode, RefAttributes, createContext, useContext, useMemo } from 'react'
import { DefaultBackground } from '../components/default-components/DefaultBackground'
import { DefaultBrush, TLBrushProps } from '../components/default-components/DefaultBrush'
import {
	DefaultCanvas,
	TLCanvasComponentProps,
} from '../components/default-components/DefaultCanvas'
import {
	DefaultCollaboratorHint,
	TLCollaboratorHintProps,
} from '../components/default-components/DefaultCollaboratorHint'
import { DefaultCursor, TLCursorProps } from '../components/default-components/DefaultCursor'
import {
	DefaultErrorFallback,
	TLErrorFallbackComponent,
} from '../components/default-components/DefaultErrorFallback'
import { DefaultGrid, TLGridProps } from '../components/default-components/DefaultGrid'
import { DefaultHandle, TLHandleProps } from '../components/default-components/DefaultHandle'
import { DefaultHandles, TLHandlesProps } from '../components/default-components/DefaultHandles'
import { DefaultLoadingScreen } from '../components/default-components/DefaultLoadingScreen'
import { DefaultScribble, TLScribbleProps } from '../components/default-components/DefaultScribble'
import { TLSelectionBackgroundProps } from '../components/default-components/DefaultSelectionBackground'
import {
	DefaultSelectionForeground,
	TLSelectionForegroundProps,
} from '../components/default-components/DefaultSelectionForeground'
import {
	DefaultShapeErrorFallback,
	TLShapeErrorFallbackComponent,
} from '../components/default-components/DefaultShapeErrorFallback'
import {
	DefaultShapeIndicator,
	TLShapeIndicatorProps,
} from '../components/default-components/DefaultShapeIndicator'
import {
	DefaultShapeIndicatorErrorFallback,
	TLShapeIndicatorErrorFallbackComponent,
} from '../components/default-components/DefaultShapeIndicatorErrorFallback'
import { DefaultShapeIndicators } from '../components/default-components/DefaultShapeIndicators'
import {
	DefaultShapeWrapper,
	TLShapeWrapperProps,
} from '../components/default-components/DefaultShapeWrapper'
import {
	DefaultSnapIndicator,
	TLSnapIndicatorProps,
} from '../components/default-components/DefaultSnapIndictor'
import { DefaultSpinner } from '../components/default-components/DefaultSpinner'
import { DefaultSvgDefs } from '../components/default-components/DefaultSvgDefs'
import { useShallowObjectIdentity } from './useIdentity'

/** @public */
export interface TLEditorComponents {
	Background?: ComponentType | null
	Brush?: ComponentType<TLBrushProps> | null
	Canvas?: ComponentType<TLCanvasComponentProps> | null
	CollaboratorBrush?: ComponentType<TLBrushProps> | null
	CollaboratorCursor?: ComponentType<TLCursorProps> | null
	CollaboratorHint?: ComponentType<TLCollaboratorHintProps> | null
	CollaboratorScribble?: ComponentType<TLScribbleProps> | null
	CollaboratorShapeIndicator?: ComponentType<TLShapeIndicatorProps> | null
	Cursor?: ComponentType<TLCursorProps> | null
	Grid?: ComponentType<TLGridProps> | null
	Handle?: ComponentType<TLHandleProps> | null
	Handles?: ComponentType<TLHandlesProps> | null
	InFrontOfTheCanvas?: ComponentType | null
	LoadingScreen?: ComponentType | null
	OnTheCanvas?: ComponentType | null
	Overlays?: ComponentType | null
	Scribble?: ComponentType<TLScribbleProps> | null
	SelectionBackground?: ComponentType<TLSelectionBackgroundProps> | null
	SelectionForeground?: ComponentType<TLSelectionForegroundProps> | null
	ShapeIndicator?: ComponentType<TLShapeIndicatorProps> | null
	ShapeIndicators?: ComponentType | null
	ShapeWrapper?: ComponentType<TLShapeWrapperProps & RefAttributes<HTMLDivElement>> | null
	SnapIndicator?: ComponentType<TLSnapIndicatorProps> | null
	Spinner?: ComponentType<React.SVGProps<SVGSVGElement>> | null
	SvgDefs?: ComponentType | null
	ZoomBrush?: ComponentType<TLBrushProps> | null

	// These will always have defaults
	ErrorFallback?: TLErrorFallbackComponent
	ShapeErrorFallback?: TLShapeErrorFallbackComponent
	ShapeIndicatorErrorFallback?: TLShapeIndicatorErrorFallbackComponent
}

const EditorComponentsContext = createContext<null | Required<TLEditorComponents>>(null)

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

/** @public */
export function useEditorComponents() {
	const components = useContext(EditorComponentsContext)
	if (!components) {
		throw new Error('useEditorComponents must be used inside of <EditorComponentsProvider />')
	}
	return components
}
