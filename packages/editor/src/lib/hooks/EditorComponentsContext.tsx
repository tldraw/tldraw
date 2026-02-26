import { ComponentType, RefAttributes, createContext, useContext } from 'react'
import type { TLBrushProps } from '../components/default-components/DefaultBrush'
import type { TLCanvasComponentProps } from '../components/default-components/DefaultCanvas'
import type { TLCollaboratorHintProps } from '../components/default-components/DefaultCollaboratorHint'
import type { TLCursorProps } from '../components/default-components/DefaultCursor'
import type { TLErrorFallbackComponent } from '../components/default-components/DefaultErrorFallback'
import type { TLGridProps } from '../components/default-components/DefaultGrid'
import type { TLHandleProps } from '../components/default-components/DefaultHandle'
import type { TLHandlesProps } from '../components/default-components/DefaultHandles'
import type { TLScribbleProps } from '../components/default-components/DefaultScribble'
import type { TLSelectionBackgroundProps } from '../components/default-components/DefaultSelectionBackground'
import type { TLSelectionForegroundProps } from '../components/default-components/DefaultSelectionForeground'
import type { TLShapeErrorFallbackComponent } from '../components/default-components/DefaultShapeErrorFallback'
import type { TLShapeIndicatorProps } from '../components/default-components/DefaultShapeIndicator'
import type { TLShapeIndicatorErrorFallbackComponent } from '../components/default-components/DefaultShapeIndicatorErrorFallback'
import type { TLShapeWrapperProps } from '../components/default-components/DefaultShapeWrapper'
import type { TLSnapIndicatorProps } from '../components/default-components/DefaultSnapIndictor'

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

export const EditorComponentsContext = createContext<null | Required<TLEditorComponents>>(null)

/** @public */
export function useEditorComponents() {
	const components = useContext(EditorComponentsContext)
	if (!components) {
		throw new Error('useEditorComponents must be used inside of <EditorComponentsProvider />')
	}
	return components
}
