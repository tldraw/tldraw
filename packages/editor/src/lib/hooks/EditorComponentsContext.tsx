import { ComponentType, RefAttributes, createContext, useContext } from 'react'
import type { TLBrushProps } from '../components/default-components/DefaultBrush'
import type { TLCanvasComponentProps } from '../components/default-components/DefaultCanvas'
import type { TLCollaboratorHintProps } from '../components/default-components/DefaultCollaboratorHint'
import type { TLCursorProps } from '../components/default-components/DefaultCursor'
import type { TLErrorFallbackComponent } from '../components/default-components/DefaultErrorFallback'
import type { TLGridProps } from '../components/default-components/DefaultGrid'
import type { TLScribbleProps } from '../components/default-components/DefaultScribble'
import type { TLSelectionBackgroundProps } from '../components/default-components/DefaultSelectionBackground'
import type { TLShapeErrorFallbackComponent } from '../components/default-components/DefaultShapeErrorFallback'
import type { TLShapeWrapperProps } from '../components/default-components/DefaultShapeWrapper'

/** @public */
export interface TLEditorComponents {
	Background?: ComponentType | null
	Canvas?: ComponentType<TLCanvasComponentProps> | null
	CollaboratorBrush?: ComponentType<TLBrushProps> | null
	CollaboratorCursor?: ComponentType<TLCursorProps> | null
	CollaboratorHint?: ComponentType<TLCollaboratorHintProps> | null
	CollaboratorScribble?: ComponentType<TLScribbleProps> | null
	Cursor?: ComponentType<TLCursorProps> | null
	Grid?: ComponentType<TLGridProps> | null
	InFrontOfTheCanvas?: ComponentType | null
	LoadingScreen?: ComponentType | null
	OnTheCanvas?: ComponentType | null
	Overlays?: ComponentType | null
	SelectionBackground?: ComponentType<TLSelectionBackgroundProps> | null
	ShapeWrapper?: ComponentType<TLShapeWrapperProps & RefAttributes<HTMLDivElement>> | null
	Spinner?: ComponentType<React.SVGProps<SVGSVGElement>> | null
	SvgDefs?: ComponentType | null

	// These will always have defaults
	ErrorFallback?: TLErrorFallbackComponent
	ShapeErrorFallback?: TLShapeErrorFallbackComponent
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
