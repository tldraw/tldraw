import {
	Migration,
	MigrationId,
	Migrations,
	RecordId,
	UnknownRecord,
	createMigrationIds,
	createMigrations,
	createRecordMigrations,
	createRecordType,
} from '@tldraw/store'
import { mapObjectMapValues } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { nanoid } from 'nanoid'
import { SchemaShapeInfo } from '../createTLSchema'
import { TLArrowShape } from '../shapes/TLArrowShape'
import { TLBaseShape, createShapeValidator } from '../shapes/TLBaseShape'
import { TLBookmarkShape } from '../shapes/TLBookmarkShape'
import { TLDrawShape } from '../shapes/TLDrawShape'
import { TLEmbedShape } from '../shapes/TLEmbedShape'
import { TLFrameShape } from '../shapes/TLFrameShape'
import { TLGeoShape } from '../shapes/TLGeoShape'
import { TLGroupShape } from '../shapes/TLGroupShape'
import { TLHighlightShape } from '../shapes/TLHighlightShape'
import { TLImageShape } from '../shapes/TLImageShape'
import { TLLineShape } from '../shapes/TLLineShape'
import { TLNoteShape } from '../shapes/TLNoteShape'
import { TLTextShape } from '../shapes/TLTextShape'
import { TLVideoShape } from '../shapes/TLVideoShape'
import { StyleProp } from '../styles/StyleProp'
import { TLPageId } from './TLPage'

/**
 * The default set of shapes that are available in the editor.
 *
 * @public */
export type TLDefaultShape =
	| TLArrowShape
	| TLBookmarkShape
	| TLDrawShape
	| TLEmbedShape
	| TLFrameShape
	| TLGeoShape
	| TLGroupShape
	| TLImageShape
	| TLLineShape
	| TLNoteShape
	| TLTextShape
	| TLVideoShape
	| TLHighlightShape

/**
 * A type for a shape that is available in the editor but whose type is
 * unknown—either one of the editor's default shapes or else a custom shape.
 *
 * @public */
export type TLUnknownShape = TLBaseShape<string, object>

/**
 * The set of all shapes that are available in the editor, including unknown shapes.
 *
 * @public
 */
export type TLShape = TLDefaultShape | TLUnknownShape

/** @public */
export type TLShapePartial<T extends TLShape = TLShape> = T extends T
	? {
			id: TLShapeId
			type: T['type']
			props?: Partial<T['props']>
			meta?: Partial<T['meta']>
		} & Partial<Omit<T, 'type' | 'id' | 'props' | 'meta'>>
	: never

/** @public */
export type TLShapeId = RecordId<TLUnknownShape>

// evil type shit that will get deleted in the next PR
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
	? I
	: never

type Identity<T> = { [K in keyof T]: T[K] }

/** @public */
export type TLShapeProps = Identity<UnionToIntersection<TLDefaultShape['props']>>

/** @public */
export type TLShapeProp = keyof TLShapeProps

/** @public */
export type TLParentId = TLPageId | TLShapeId

/** @internal */
export const rootShapeVersions = createMigrationIds('com.tldraw.shape', {
	AddIsLocked: 1,
	HoistOpacity: 2,
	AddMeta: 3,
} as const)

/** @internal */
export const rootShapeMigrations = createRecordMigrations({
	recordType: 'shape',
	sequence: [
		{
			id: rootShapeVersions.AddIsLocked,
			up: (record: any) => {
				record.isLocked = false
			},
			down: (record: any) => {
				delete record.isLocked
			},
		},
		{
			id: rootShapeVersions.HoistOpacity,
			up: (record: any) => {
				record.opacity = Number(record.props.opacity ?? '1')
			},
			down: (record: any) => {
				const opacity = record.opacity
				delete record.opacity
				record.props.opacity =
					opacity < 0.175
						? '0.1'
						: opacity < 0.375
							? '0.25'
							: opacity < 0.625
								? '0.5'
								: opacity < 0.875
									? '0.75'
									: '1'
			},
		},
		{
			id: rootShapeVersions.AddMeta,
			up: (record: any) => {
				record.meta = {}
			},
			down: (record: any) => {
				delete record.meta
			},
		},
	],
})

/** @public */
export function isShape(record?: UnknownRecord): record is TLShape {
	if (!record) return false
	return record.typeName === 'shape'
}

/** @public */
export function isShapeId(id?: string): id is TLShapeId {
	if (!id) return false
	return id.startsWith('shape:')
}

/** @public */
export function createShapeId(id?: string): TLShapeId {
	return `shape:${id ?? nanoid()}` as TLShapeId
}

/** @internal */
export function getShapePropKeysByStyle(props: Record<string, T.Validatable<any>>) {
	const propKeysByStyle = new Map<StyleProp<unknown>, string>()
	for (const [key, prop] of Object.entries(props)) {
		if (prop instanceof StyleProp) {
			if (propKeysByStyle.has(prop)) {
				throw new Error(
					`Duplicate style prop ${prop.id}. Each style prop can only be used once within a shape.`
				)
			}
			propKeysByStyle.set(prop, key)
		}
	}
	return propKeysByStyle
}

export const NO_DOWN_MIGRATION = 'none' as const
// If a down migration was deployed more than a couple of months ago it should be safe to retire it.
// We only really need them to smooth over the transition between versions, and some folks do keep
// browser tabs open for months without refreshing, but at a certain point that kind of behavior is
// on them. Plus anyway recently chrome has started to actually kill tabs that are open for too long rather
// than just suspending them, so if other browsers follow suit maybe it's less of a concern.
export const RETIRED_DOWN_MIGRATION = 'retired' as const

export type TLShapePropsMigrations = {
	sequence: Array<{
		version: number
		dependsOn?: MigrationId[]
		up: (props: any) => any
		down: typeof NO_DOWN_MIGRATION | typeof RETIRED_DOWN_MIGRATION | ((props: any) => any)
	}>
}

export function createShapePropsMigrations(
	migrations: TLShapePropsMigrations
): TLShapePropsMigrations {
	return migrations
}

export function processShapeMigrations(shapes: Record<string, SchemaShapeInfo>) {
	const result: Migrations[] = []

	for (const [shapeType, { migrations }] of Object.entries(shapes)) {
		const sequenceId = `com.tldraw.shape.${shapeType}`
		if (!migrations) {
			// provide empty migrations sequence to allow for future migrations
			result.push(
				createMigrations({
					sequenceId,
					retroactive: false,
					sequence: [],
				})
			)
		} else if ('sequence' in migrations) {
			result.push(
				createMigrations({
					sequenceId,
					retroactive: false,
					sequence: migrations.sequence.map(
						({ version, up, down }): Migration => ({
							id: `${sequenceId}/${version}`,
							scope: 'record',
							filter: (r) => r.typeName === 'shape' && (r as TLShape).type === shapeType,
							up: (record: any) => {
								const result = up(record.props)
								if (result) {
									record.props = result
								}
							},
							down:
								typeof down === 'function'
									? (record: any) => {
											const result = down(record.props)
											if (result) {
												record.props = result
											}
										}
									: undefined,
						})
					),
				})
			)
		} else {
			// legacy migrations, will be removed in the future
			result.push(
				createMigrations({
					sequenceId,
					retroactive: false,
					sequence: Object.keys(migrations.migrators)
						.map((k) => Number(k))
						.sort((a: number, b: number) => a - b)
						.map(
							(version): Migration => ({
								id: `${sequenceId}/${version}`,
								scope: 'record',
								filter: (r) => r.typeName === 'shape' && (r as TLShape).type === shapeType,
								up: (record: any) => {
									const result = migrations.migrators[version].up(record)
									if (result) {
										return result
									}
								},
								down: (record: any) => {
									const result = migrations.migrators[version].down(record)
									if (result) {
										return result
									}
								},
							})
						),
				})
			)
		}
	}

	return result
}

/** @internal */
export function createShapeRecordType(shapes: Record<string, SchemaShapeInfo>) {
	return createRecordType<TLShape>('shape', {
		scope: 'document',
		validator: T.model(
			'shape',
			T.union(
				'type',
				mapObjectMapValues(shapes, (type, { props, meta }) =>
					createShapeValidator(type, props, meta)
				)
			)
		),
	}).withDefaultProperties(() => ({
		x: 0,
		y: 0,
		rotation: 0,
		isLocked: false,
		opacity: 1,
		meta: {},
	}))
}
