import {
	RecordId,
	UnknownRecord,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
} from '@tldraw/store'
import { mapObjectMapValues } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { nanoid } from 'nanoid'
import { TLArrowBinding } from '../bindings/TLArrowBinding'
import { TLBaseBinding, createBindingValidator } from '../bindings/TLBaseBinding'
import { SchemaPropsInfo } from '../createTLSchema'
import { TLPropsMigrations } from '../recordsWithProps'

/**
 * The default set of bindings that are available in the editor.
 *
 * @public */
export type TLDefaultBinding = TLArrowBinding

/**
 * A type for a binding that is available in the editor but whose type is
 * unknown—either one of the editor's default bindings or else a custom binding.
 *
 * @public */
export type TLUnknownBinding = TLBaseBinding<string, object>

/**
 * The set of all bindings that are available in the editor, including unknown bindings.
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

/**
 * An ID for a {@link TLBinding}.
 *
 * @public
 */
export type TLBindingId = RecordId<TLUnknownBinding>

/** @public */
export const rootBindingVersions = createMigrationIds('com.tldraw.binding', {} as const)

/** @public */
export const rootBindingMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.binding',
	recordType: 'binding',
	sequence: [],
})

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

/**
 * @public
 */
export function createBindingPropsMigrationSequence(
	migrations: TLPropsMigrations
): TLPropsMigrations {
	return migrations
}

/**
 * @public
 */
export function createBindingPropsMigrationIds<S extends string, T extends Record<string, number>>(
	bindingType: S,
	ids: T
): { [k in keyof T]: `com.tldraw.binding.${S}/${T[k]}` } {
	return mapObjectMapValues(ids, (_k, v) => `com.tldraw.binding.${bindingType}/${v}`) as any
}

/** @internal */
export function createBindingRecordType(bindings: Record<string, SchemaPropsInfo>) {
	return createRecordType<TLBinding>('binding', {
		scope: 'document',
		validator: T.model(
			'binding',
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
