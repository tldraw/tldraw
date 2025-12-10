import { SimpleShapeId } from '../schema/id-schemas'

export interface FairyCanvasLint {
	type: FairyCanvasLintType
	shapeIds: SimpleShapeId[]
}

export type FairyCanvasLintType = 'growY-on-shape' | 'overlapping-text' | 'friendless-arrow'
