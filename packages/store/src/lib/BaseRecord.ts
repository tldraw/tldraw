/** @public */
export type RecordId<R extends UnknownRecord> = string & { __type__: R }

/** @public */
export type IdOf<R extends UnknownRecord> = R['id']

/**
 * The base record that all records must extend.
 *
 * @public
 */
export interface BaseRecord<TypeName extends string, Id extends RecordId<UnknownRecord>> {
	readonly id: Id
	readonly typeName: TypeName
}

/** @public */
export type UnknownRecord = BaseRecord<string, RecordId<UnknownRecord>>

export function isRecord(record: unknown): record is UnknownRecord {
	return typeof record === 'object' && record !== null && 'id' in record && 'typeName' in record
}
