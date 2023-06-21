import { createContext, useContext } from 'react'
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
	DefaultShapeErrorFallback,
	TLShapeErrorFallbackComponent,
} from '../components/DefaultShapeErrorFallback'
import {
	DefaultShapeIndicatorErrorFallback,
	TLShapeIndicatorErrorFallback as TLShapeIndicatorErrorFallbackComponent,
} from '../components/DefaultShapeIndicatorErrorFallback'
import { DefaultSnapLine, TLSnapLineComponent } from '../components/DefaultSnapLine'
import { DefaultSpinner, TLSpinnerComponent } from '../components/DefaultSpinner'
import { DefaultSvgDefs, TLSvgDefsComponent } from '../components/DefaultSvgDefs'
import { ShapeIndicator, TLShapeIndicatorComponent } from '../components/ShapeIndicator'

/** @public */
export interface TLEditorComponents {
	Background: TLBackgroundComponent | null
	SvgDefs: TLSvgDefsComponent | null
	Brush: TLBrushComponent | null
	ZoomBrush: TLBrushComponent | null
	Cursor: TLCursorComponent | null
	CollaboratorBrush: TLBrushComponent | null
	CollaboratorCursor: TLCursorComponent | null
	CollaboratorHint: TLCollaboratorHintComponent | null
	CollaboratorShapeIndicator: TLShapeIndicatorComponent | null
	Grid: TLGridComponent | null
	Scribble: TLScribbleComponent | null
	CollaboratorScribble: TLScribbleComponent | null
	SnapLine: TLSnapLineComponent | null
	Handle: TLHandleComponent | null
	ErrorFallback: TLErrorFallbackComponent
	ShapeErrorFallback: TLShapeErrorFallbackComponent
	ShapeIndicatorErrorFallback: TLShapeIndicatorErrorFallbackComponent
	Spinner: TLSpinnerComponent | null
}

export const EditorComponentsContext = createContext({} as TLEditorComponents)

export type ComponentsContextProviderProps = {
	overrides?: Partial<TLEditorComponents>
	children: any
}

export function EditorComponentsProvider({ overrides, children }: ComponentsContextProviderProps) {
	return (
		<EditorComponentsContext.Provider
			value={{
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
				...overrides,
			}}
		>
			{children}
		</EditorComponentsContext.Provider>
	)
}

/** @public */
export function useEditorComponents() {
	return useContext(EditorComponentsContext)
}
