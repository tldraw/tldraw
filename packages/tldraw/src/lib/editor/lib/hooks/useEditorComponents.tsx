import { createContext, useContext, useMemo } from 'react'
import { ShapeIndicator, TLShapeIndicatorComponent } from '../components/ShapeIndicator'
import {
	DefaultBackground,
	TLBackgroundComponent,
} from '../components/default-components/DefaultBackground'
import { DefaultBrush, TLBrushComponent } from '../components/default-components/DefaultBrush'
import {
	DefaultCollaboratorHint,
	TLCollaboratorHintComponent,
} from '../components/default-components/DefaultCollaboratorHint'
import { DefaultCursor, TLCursorComponent } from '../components/default-components/DefaultCursor'
import {
	DefaultErrorFallback,
	TLErrorFallbackComponent,
} from '../components/default-components/DefaultErrorFallback'
import { DefaultGrid, TLGridComponent } from '../components/default-components/DefaultGrid'
import { DefaultHandle, TLHandleComponent } from '../components/default-components/DefaultHandle'
import { DefaultHandles, TLHandlesComponent } from '../components/default-components/DefaultHandles'
import {
	DefaultHoveredShapeIndicator,
	TLHoveredShapeIndicatorComponent,
} from '../components/default-components/DefaultHoveredShapeIndicator'
import {
	DefaultScribble,
	TLScribbleComponent,
} from '../components/default-components/DefaultScribble'
import {
	DefaultSelectionBackground,
	TLSelectionBackgroundComponent,
} from '../components/default-components/DefaultSelectionBackground'
import {
	DefaultSelectionForeground,
	TLSelectionForegroundComponent,
} from '../components/default-components/DefaultSelectionForeground'
import {
	DefaultShapeErrorFallback,
	TLShapeErrorFallbackComponent,
} from '../components/default-components/DefaultShapeErrorFallback'
import {
	DefaultShapeIndicatorErrorFallback,
	TLShapeIndicatorErrorFallbackComponent,
} from '../components/default-components/DefaultShapeIndicatorErrorFallback'
import {
	DefaultSnapLine,
	TLSnapLineComponent,
} from '../components/default-components/DefaultSnapLine'
import { DefaultSpinner, TLSpinnerComponent } from '../components/default-components/DefaultSpinner'
import { DefaultSvgDefs, TLSvgDefsComponent } from '../components/default-components/DefaultSvgDefs'

interface BaseEditorComponents {
	Background: TLBackgroundComponent
	SvgDefs: TLSvgDefsComponent
	Brush: TLBrushComponent
	ZoomBrush: TLBrushComponent
	Cursor: TLCursorComponent
	CollaboratorBrush: TLBrushComponent
	CollaboratorCursor: TLCursorComponent
	CollaboratorHint: TLCollaboratorHintComponent
	CollaboratorShapeIndicator: TLShapeIndicatorComponent
	Grid: TLGridComponent
	Scribble: TLScribbleComponent
	CollaboratorScribble: TLScribbleComponent
	SnapLine: TLSnapLineComponent
	Handles: TLHandlesComponent
	Handle: TLHandleComponent
	Spinner: TLSpinnerComponent
	SelectionForeground: TLSelectionForegroundComponent
	SelectionBackground: TLSelectionBackgroundComponent
	HoveredShapeIndicator: TLHoveredShapeIndicatorComponent
}

/** @public */
export type TLEditorComponents = {
	[K in keyof BaseEditorComponents]: BaseEditorComponents[K] | null
} & {
	ErrorFallback: TLErrorFallbackComponent
	ShapeErrorFallback: TLShapeErrorFallbackComponent
	ShapeIndicatorErrorFallback: TLShapeIndicatorErrorFallbackComponent
}

const EditorComponentsContext = createContext({} as TLEditorComponents)

type ComponentsContextProviderProps = {
	overrides?: Partial<TLEditorComponents>
	children: any
}

export function EditorComponentsProvider({ overrides, children }: ComponentsContextProviderProps) {
	return (
		<EditorComponentsContext.Provider
			value={useMemo(
				() => ({
					Background: DefaultBackground,
					SvgDefs: DefaultSvgDefs,
					Brush: DefaultBrush,
					ZoomBrush: DefaultBrush,
					CollaboratorBrush: DefaultBrush,
					Cursor: DefaultCursor,
					CollaboratorCursor: DefaultCursor,
					CollaboratorHint: DefaultCollaboratorHint,
					CollaboratorShapeIndicator: ShapeIndicator,
					Grid: DefaultGrid,
					Scribble: DefaultScribble,
					SnapLine: DefaultSnapLine,
					Handles: DefaultHandles,
					Handle: DefaultHandle,
					CollaboratorScribble: DefaultScribble,
					ErrorFallback: DefaultErrorFallback,
					ShapeErrorFallback: DefaultShapeErrorFallback,
					ShapeIndicatorErrorFallback: DefaultShapeIndicatorErrorFallback,
					Spinner: DefaultSpinner,
					SelectionBackground: DefaultSelectionBackground,
					SelectionForeground: DefaultSelectionForeground,
					HoveredShapeIndicator: DefaultHoveredShapeIndicator,
					...overrides,
				}),
				[overrides]
			)}
		>
			{children}
		</EditorComponentsContext.Provider>
	)
}

/** @public */
export function useEditorComponents() {
	return useContext(EditorComponentsContext)
}
