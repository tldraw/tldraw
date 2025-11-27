import { TLShapeId } from 'tldraw'

export interface FairyCanvasLint {
	type: FairyCanvasLintType
	shapeIds: TLShapeId[]
}

export type FairyCanvasLintType = 'growY-on-shape' | 'overlapping-text' | 'friendless-arrow'
