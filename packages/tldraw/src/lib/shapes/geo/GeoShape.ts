import { defineShape, geoShapeMigrations, geoShapeProps } from '@tldraw/editor'
import { GeoShapeTool } from './GeoShapeTool'
import { GeoShapeUtil } from './GeoShapeUtil'

/** @public */
export const GeoShape = defineShape('geo', {
	util: GeoShapeUtil,
	props: geoShapeProps,
	migrations: geoShapeMigrations,
	tool: GeoShapeTool,
})
