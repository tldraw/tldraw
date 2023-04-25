import { TLUnknownShape } from '@tldraw/tlschema'
import { Migrations, StoreValidator } from '@tldraw/tlstore'
import { App } from '../app/App'
import { TLShapeUtil, TLShapeUtilConstructor } from '../app/shapeutils/TLShapeUtil'

/** @public */
export interface TLShapeDef<
	ShapeType extends TLUnknownShape,
	ShapeUtil extends TLShapeUtil<ShapeType> = TLShapeUtil<ShapeType>
> {
	readonly type: ShapeType['type']
	readonly createShapeUtils: (app: App) => ShapeUtil
	readonly is: (shape: TLUnknownShape) => shape is ShapeType
	readonly validator?: StoreValidator<ShapeType>
	readonly migrations: Migrations
}

/** @public */
export type TLUnknownShapeDef = TLShapeDef<TLUnknownShape, TLShapeUtil<TLUnknownShape>>

/** @public */
export function defineShape<
	ShapeType extends TLUnknownShape,
	ShapeUtil extends TLShapeUtil<ShapeType> = TLShapeUtil<ShapeType>
>({
	type,
	getShapeUtil,
	validator,
	migrations = { currentVersion: 0, firstVersion: 0, migrators: {} },
}: {
	type: ShapeType['type']
	getShapeUtil: () => TLShapeUtilConstructor<ShapeType, ShapeUtil>
	validator?: StoreValidator<ShapeType>
	migrations?: Migrations
}): TLShapeDef<ShapeType, ShapeUtil> {
	if (!validator && process.env.NODE_ENV === 'development') {
		console.warn(
			`No validator provided for shape type ${type}! Validators are highly recommended for use in production.`
		)
	}

	return {
		type,
		createShapeUtils: (app: App) => {
			const ShapeUtil = getShapeUtil()
			return new ShapeUtil(app, type)
		},
		is: (shape: TLUnknownShape): shape is ShapeType => shape.type === type,
		validator,
		migrations,
	}
}
