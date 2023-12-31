import { createRecordType, defineMigrations, RecordId, UnknownRecord } from '@tldraw/store'
import { mapObjectMapValues } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { nanoid } from 'nanoid'
import { SchemaBindingInfo } from '../createTLSchema'
import { createBindingValidator, TLBaseBinding } from '../TLBaseBinding'
import { TLArrowBinding } from '../bindings/TLArrowBinding'


/**
 * The default set of shapes that are available in the editor.
 *
 * @public */
export type TLDefaultBinding = TLArrowBinding

/**
 * A type for a shape that is available in the editor but whose type is
 * unknown—either one of the editor's default shapes or else a custom shape.
 *
 * @public */
export type TLUnknownBinding = TLBaseBinding<string, object>

/**
 * The set of all shapes that are available in the editor, including unknown shapes.
 *
 * @public
 */
export type TLBinding = TLDefaultBinding | TLUnknownBinding

/** @public */
export type TLBindingPartial<T extends TLBinding = TLBinding> = T extends T
	? {
			id: TLBindingId
			type: T['type']
			props?: Partial<T['props']>
			meta?: Partial<T['meta']>
	  } & Partial<Omit<T, 'type' | 'id' | 'props' | 'meta'>>
	: never

/** @public */
export type TLBindingId = RecordId<TLUnknownBinding>

// evil type shit that will get deleted in the next PR
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
	? I
	: never

type Identity<T> = { [K in keyof T]: T[K] }

/** @public */
export type TLBindingProps = Identity<UnionToIntersection<TLDefaultBinding['props']>>

/** @public */
export type TLBindingProp = keyof TLBindingProps

/** @internal */
export const rootBindingVersions = {} as const

/** @internal */
export const rootBindingMigrations = defineMigrations({})

/** @public */
export function isBinding(record?: UnknownRecord): record is TLBinding {
	if (!record) return false
	return record.typeName === 'binding'
}

/** @public */
export function isBindingId(id?: string): id is TLBindingId {
	if (!id) return false
	return id.startsWith('binding:')
}

/** @public */
export function createBindingId(id?: string): TLBindingId {
	return `binding:${id ?? nanoid()}` as TLBindingId
}

/** @internal */
export function createBindingRecordType(bindings: Record<string, SchemaBindingInfo>) {
	return createRecordType<TLBinding>('binding', {
		migrations: defineMigrations({
			currentVersion: rootBindingMigrations.currentVersion,
			firstVersion: rootBindingMigrations.firstVersion,
			migrators: rootBindingMigrations.migrators,
			subTypeKey: 'type',
			subTypeMigrations: mapObjectMapValues(
				bindings,
				(_, v) => v.migrations ?? defineMigrations({})
			),
		}),
		scope: 'document',
		validator: T.model(
			'type',
			T.union(
				'type',
				mapObjectMapValues(bindings, (type, { props, meta }) =>
					createBindingValidator(type, props, meta)
				)
			)
		),
	}).withDefaultProperties(() => ({
		meta: {},
	}))
}
