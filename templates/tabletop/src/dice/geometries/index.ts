import { d100Geometry, d10Geometry } from './d10'
import { d12Geometry } from './d12'
import { d20Geometry } from './d20'
import { d4Geometry } from './d4'
import { d6Geometry } from './d6'
import { d8Geometry } from './d8'
import type { DieGeometry } from './types'

export type { DieGeometry, FaceDefinition } from './types'

export const GEOMETRIES: Record<number, DieGeometry> = {
	4: d4Geometry,
	6: d6Geometry,
	8: d8Geometry,
	10: d10Geometry,
	12: d12Geometry,
	20: d20Geometry,
	100: d100Geometry,
}
