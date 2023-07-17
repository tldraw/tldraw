import { createContext, useContext, useMemo } from 'react'
import { DefaultBackground, TLBackgroundComponent } from '../components/DefaultBackground'
import { DefaultBrush, TLBrushComponent } from '../components/DefaultBrush'
import {
	DefaultCollaboratorHint,
	TLCollaboratorHintComponent,
} from '../components/DefaultCollaboratorHint'
import { DefaultCursor, TLCursorComponent } from '../components/DefaultCursor'
import { DefaultErrorFallback, TLErrorFallbackComponent } from '../components/DefaultErrorFallback'
import { DefaultGrid, TLGridComponent } from '../components/DefaultGrid'
import { DefaultHandle, TLHandleComponent } from '../components/DefaultHandle'
import { DefaultScribble, TLScribbleComponent } from '../components/DefaultScribble'
import {
	DefaultSelectionBackground,
	TLSelectionBackgroundComponent,
} from '../components/DefaultSelectionBackground'
import {
	DefaultSelectionForeground,
	TLSelectionForegroundComponent,
} from '../components/DefaultSelectionForeground'
import {
	DefaultShapeErrorFallback,
	TLShapeErrorFallbackComponent,
} from '../components/DefaultShapeErrorFallback'
import {
	DefaultShapeIndicatorErrorFallback,
	TLShapeIndicatorErrorFallbackComponent,
} from '../components/DefaultShapeIndicatorErrorFallback'
import { DefaultSnapLine, TLSnapLineComponent } from '../components/DefaultSnapLine'
import { DefaultSpinner, TLSpinnerComponent } from '../components/DefaultSpinner'
import { DefaultSvgDefs, TLSvgDefsComponent } from '../components/DefaultSvgDefs'
import { ShapeIndicator, TLShapeIndicatorComponent } from '../components/ShapeIndicator'

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
	Handle: TLHandleComponent
	Spinner: TLSpinnerComponent
	SelectionForeground: TLSelectionForegroundComponent
	SelectionBackground: TLSelectionBackgroundComponent
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
					Handle: DefaultHandle,
					CollaboratorScribble: DefaultScribble,
					ErrorFallback: DefaultErrorFallback,
					ShapeErrorFallback: DefaultShapeErrorFallback,
					ShapeIndicatorErrorFallback: DefaultShapeIndicatorErrorFallback,
					Spinner: DefaultSpinner,
					SelectionBackground: DefaultSelectionBackground,
					SelectionForeground: DefaultSelectionForeground,
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
