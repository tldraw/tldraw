import { geoShapeMigrations, geoShapeProps } from '@tldraw/tlschema'
import { defineShape } from '../../../config/defineShape'
import { GeoShapeTool } from './GeoShapeTool'
import { GeoShapeUtil } from './GeoShapeUtil'

/** @public */
export const GeoShape = defineShape('geo', {
	util: GeoShapeUtil,
	props: geoShapeProps,
	migrations: geoShapeMigrations,
	tool: GeoShapeTool,
})
