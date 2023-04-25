/** @public */
export type ID<R extends BaseRecord = BaseRecord> = string & { __type__: R }

/**
 * The base record that all records must extend.
 *
 * @public
 */
export interface BaseRecord<TypeName extends string = string> {
	readonly id: ID<this>
	readonly typeName: TypeName
}

export type OmitMeta<R extends BaseRecord> = R extends R ? Omit<R, 'id' | 'typeName'> : R

export function isRecord(record: unknown): record is BaseRecord {
	return typeof record === 'object' && record !== null && 'id' in record && 'typeName' in record
}
