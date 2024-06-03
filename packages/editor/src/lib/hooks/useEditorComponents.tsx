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
import {
	DefaultSnapIndicator,
	TLSnapIndicatorProps,
} from '../components/default-components/DefaultSnapIndictor'
import { DefaultSpinner } from '../components/default-components/DefaultSpinner'
import { DefaultSvgDefs } from '../components/default-components/DefaultSvgDefs'
import { useShallowObjectIdentity } from './useIdentity'

export interface BaseEditorComponents {
	Background: ComponentType
	SvgDefs: ComponentType
	Brush: ComponentType<TLBrushProps>
	ZoomBrush: ComponentType<TLBrushProps>
	ShapeIndicator: ComponentType<TLShapeIndicatorProps>
	Cursor: ComponentType<TLCursorProps>
	Canvas: ComponentType<TLCanvasComponentProps>
	CollaboratorBrush: ComponentType<TLBrushProps>
	CollaboratorCursor: ComponentType<TLCursorProps>
	CollaboratorHint: ComponentType<TLCollaboratorHintProps>
	CollaboratorShapeIndicator: ComponentType<TLShapeIndicatorProps>
	Grid: ComponentType<TLGridProps>
	Scribble: ComponentType<TLScribbleProps>
	CollaboratorScribble: ComponentType<TLScribbleProps>
	SnapIndicator: ComponentType<TLSnapIndicatorProps>
	Handles: ComponentType<TLHandlesProps>
	Handle: ComponentType<TLHandleProps>
	Spinner: ComponentType
	SelectionForeground: ComponentType<TLSelectionForegroundProps>
	SelectionBackground: ComponentType<TLSelectionBackgroundProps>
	OnTheCanvas: ComponentType
	InFrontOfTheCanvas: ComponentType
	LoadingScreen: ComponentType
}

// These will always have defaults
interface ErrorComponents {
	ErrorFallback: TLErrorFallbackComponent
	ShapeErrorFallback: TLShapeErrorFallbackComponent
	ShapeIndicatorErrorFallback: TLShapeIndicatorErrorFallbackComponent
}

/** @public */
export type TLEditorComponents = Partial<
	{
		[K in keyof BaseEditorComponents]: BaseEditorComponents[K] | null
	} & ErrorComponents
>

const EditorComponentsContext = createContext<null | (TLEditorComponents & ErrorComponents)>(null)

interface ComponentsContextProviderProps {
	overrides?: TLEditorComponents
	children: ReactNode
}

export function EditorComponentsProvider({
	overrides = {},
	children,
}: ComponentsContextProviderProps) {
	const _overrides = useShallowObjectIdentity(overrides)
	return (
		<EditorComponentsContext.Provider
			value={useMemo(
				() => ({
					Background: DefaultBackground,
					SvgDefs: DefaultSvgDefs,
					Brush: DefaultBrush,
					ZoomBrush: DefaultBrush,
					ScreenshotBrush: DefaultBrush,
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
					ShapeIndicator: DefaultShapeIndicator,
					OnTheCanvas: null,
					InFrontOfTheCanvas: null,
					Canvas: DefaultCanvas,
					..._overrides,
				}),
				[_overrides]
			)}
		>
			{children}
		</EditorComponentsContext.Provider>
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
