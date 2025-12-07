export interface FairyCanvasLint {
	type: FairyCanvasLintType
	shapeIds: string[]
}

export type FairyCanvasLintType = 'growY-on-shape' | 'overlapping-text' | 'friendless-arrow'
