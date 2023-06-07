import { defineShape } from '../../../config/defineShape'
import { GeoShapeTool } from './GeoShapeTool/GeoShapeTool'
import { GeoShapeUtil } from './GeoShapeUtil/GeoShapeUtil'
import { geoShapeMigrations } from './geoShapeMigrations'
import { TLGeoShape } from './geoShapeTypes'
import { geoShapeValidator } from './geoShapeValidator'

/** @public */
export const geoShape = defineShape<TLGeoShape>({
	type: 'geo',
	util: GeoShapeUtil,
	tool: GeoShapeTool,
	migrations: geoShapeMigrations,
	validator: geoShapeValidator,
})
