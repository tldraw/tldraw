import { TLShapeInfo, TLStateNodeConstructor } from '@tldraw/editor'
import { GeoShapeTool } from './GeoShapeTool/GeoShapeTool'
import { GeoShapeUtil } from './GeoShapeUtil/GeoShapeUtil'
import { geoShapeMigrations } from './geoShapeMigrations'
import { geoShapeValidator } from './geoShapeValidator'

/** @public */
export const geoShape: TLShapeInfo & { tool: TLStateNodeConstructor } = {
	util: GeoShapeUtil,
	tool: GeoShapeTool,
	migrations: geoShapeMigrations,
	validator: geoShapeValidator,
}
