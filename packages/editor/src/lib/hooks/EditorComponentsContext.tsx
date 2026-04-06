import { ComponentType, RefAttributes, createContext, useContext } from 'react'
import type { TLCanvasComponentProps } from '../components/default-components/DefaultCanvas'
import type { TLCursorProps } from '../components/default-components/DefaultCursor'
import type { TLErrorFallbackComponent } from '../components/default-components/DefaultErrorFallback'
import type { TLGridProps } from '../components/default-components/DefaultGrid'
import type { TLSelectionBackgroundProps } from '../components/default-components/DefaultSelectionBackground'
import type { TLShapeErrorFallbackComponent } from '../components/default-components/DefaultShapeErrorFallback'
import type { TLShapeIndicatorProps } from '../components/default-components/DefaultShapeIndicator'
import type { TLShapeIndicatorErrorFallbackComponent } from '../components/default-components/DefaultShapeIndicatorErrorFallback'
import type { TLShapeWrapperProps } from '../components/default-components/DefaultShapeWrapper'

/** @public */
export interface TLEditorComponents {
	Background?: ComponentType | null
	Canvas?: ComponentType<TLCanvasComponentProps> | null
	CollaboratorCursor?: ComponentType<TLCursorProps> | null
	CollaboratorShapeIndicator?: ComponentType<TLShapeIndicatorProps> | null
	Cursor?: ComponentType<TLCursorProps> | null
	Grid?: ComponentType<TLGridProps> | null
	InFrontOfTheCanvas?: ComponentType | null
	LoadingScreen?: ComponentType | null
	OnTheCanvas?: ComponentType | null
	Overlays?: ComponentType | null
	SelectionBackground?: ComponentType<TLSelectionBackgroundProps> | null
	ShapeIndicator?: ComponentType<TLShapeIndicatorProps> | null
	ShapeIndicators?: ComponentType | null
	ShapeWrapper?: ComponentType<TLShapeWrapperProps & RefAttributes<HTMLDivElement>> | null
	Spinner?: ComponentType<React.SVGProps<SVGSVGElement>> | null
	SvgDefs?: ComponentType | null

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
