import { ComponentType, ReactNode, createContext, useContext, useMemo } from 'react'
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
import {
	DefaultSelectionBackground,
	TLSelectionBackgroundProps,
} from '../components/default-components/DefaultSelectionBackground'
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
	DefaultSnapIndicator,
	TLSnapIndicatorProps,
} from '../components/default-components/DefaultSnapIndictor'
import { DefaultSpinner } from '../components/default-components/DefaultSpinner'
import { DefaultSvgDefs } from '../components/default-components/DefaultSvgDefs'
import { useShallowObjectIdentity } from './useIdentity'

/** @public */
export interface TLEditorComponents {
	Background?: ComponentType | null
	SvgDefs?: ComponentType | null
	Brush?: ComponentType | null
	ZoomBrush?: ComponentType | null
	ShapeIndicators?: ComponentType | null
	ShapeIndicator?: ComponentType | null
	Cursor?: ComponentType | null
	Canvas?: ComponentType | null
	CollaboratorBrush?: ComponentType | null
	CollaboratorCursor?: ComponentType | null
	CollaboratorHint?: ComponentType | null
	CollaboratorShapeIndicator?: ComponentType | null
	Grid?: ComponentType | null
	Scribble?: ComponentType | null
	CollaboratorScribble?: ComponentType | null
	SnapIndicator?: ComponentType | null
	Handles?: ComponentType | null
	Handle?: ComponentType | null
	Spinner?: ComponentType | null
	SelectionForeground?: ComponentType | null
	SelectionBackground?: ComponentType | null
	OnTheCanvas?: ComponentType | null
	InFrontOfTheCanvas?: ComponentType | null
	LoadingScreen?: ComponentType | null

	// These will always have defaults
	ErrorFallback?: TLErrorFallbackComponent
	ShapeErrorFallback?: TLShapeErrorFallbackComponent
	ShapeIndicatorErrorFallback?: TLShapeIndicatorErrorFallbackComponent
}

const EditorComponentsContext = createContext<null | Required>(null)

interface ComponentsContextProviderProps {
	overrides?: TLEditorComponents
	children: ReactNode
}

export function EditorComponentsProvider(
	{ overrides = {}, children }: ComponentsContextProviderProps
) {
	const _overrides = useShallowObjectIdentity(overrides)
	const value = useMemo(
		(): Required => ({
			Background: DefaultBackground,
			SvgDefs: DefaultSvgDefs,
			Brush: DefaultBrush,
			ZoomBrush: DefaultBrush,
			CollaboratorBrush: DefaultBrush,
			Cursor: DefaultCursor,
			CollaboratorCursor: DefaultCursor,
			CollaboratorHint: DefaultCollaboratorHint,
			CollaboratorShapeIndicator: DefaultShapeIndicator,
			Grid: DefaultGrid,
			Scribble: DefaultScribble,
			SnapIndicator: DefaultSnapIndicator,
			Handles: DefaultHandles,
			Handle: DefaultHandle,
			CollaboratorScribble: DefaultScribble,
			ErrorFallback: DefaultErrorFallback,
			ShapeErrorFallback: DefaultShapeErrorFallback,
			ShapeIndicatorErrorFallback: DefaultShapeIndicatorErrorFallback,
			Spinner: DefaultSpinner,
			SelectionBackground: DefaultSelectionBackground,
			SelectionForeground: DefaultSelectionForeground,
			ShapeIndicators: DefaultShapeIndicators,
			ShapeIndicator: DefaultShapeIndicator,
			OnTheCanvas: null,
			InFrontOfTheCanvas: null,
			Canvas: DefaultCanvas,
			LoadingScreen: DefaultLoadingScreen,
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
