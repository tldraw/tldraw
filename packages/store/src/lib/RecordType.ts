import { Expand, objectMapEntries, structuredClone, uniqueId } from '@tldraw/utils'
import { IdOf, UnknownRecord } from './BaseRecord'
import { StoreValidator } from './Store'

/**
 * Utility type that extracts the record type from a RecordType instance.
 *
 * @example
 * ```ts
 * const Book = createRecordType<BookRecord>('book', { scope: 'document' })
 * type BookFromType = RecordTypeRecord<typeof Book> // BookRecord
 * ```
 *
 * @public
 */
export type RecordTypeRecord<R extends RecordType<any, any>> = ReturnType<R['create']>

/**
 * Defines the scope of the record
 *
 * session: The record belongs to a single instance of the store. It should not be synced, and any persistence logic should 'de-instance-ize' the record before persisting it, and apply the reverse when rehydrating.
 * document: The record is persisted and synced. It is available to all store instances.
 * presence: The record belongs to a single instance of the store. It may be synced to other instances, but other instances should not make changes to it. It should not be persisted.
 *
 * @public
 * */
export type RecordScope = 'session' | 'document' | 'presence'

/**
 * A record type is a type that can be stored in a record store. It is created with
 * `createRecordType`.
 *
 * @public
 */
export class RecordType<
	R extends UnknownRecord,
	RequiredProperties extends keyof Omit<R, 'id' | 'typeName'>,
> {
	/**
	 * Factory function that creates default properties for new records.
	 * @public
	 */
	readonly createDefaultProperties: () => Exclude<Omit<R, 'id' | 'typeName'>, RequiredProperties>

	/**
	 * Validator function used to validate records of this type.
	 * @public
	 */
	readonly validator: StoreValidator<R>

	/**
	 * Optional configuration specifying which record properties are ephemeral.
	 * Ephemeral properties are not included in snapshots or synchronization.
	 * @public
	 */
	readonly ephemeralKeys?: { readonly [K in Exclude<keyof R, 'id' | 'typeName'>]: boolean }

	/**
	 * Set of property names that are marked as ephemeral for efficient lookup.
	 * @public
	 */
	readonly ephemeralKeySet: ReadonlySet<string>

	/**
	 * The scope that determines how records of this type are persisted and synchronized.
	 * @public
	 */
	readonly scope: RecordScope

	/**
	 * Creates a new RecordType instance.
	 *
	 * typeName - The unique type name for records created by this RecordType
	 * config - Configuration object for the RecordType
	 *   - createDefaultProperties - Function that returns default properties for new records
	 *   - validator - Optional validator function for record validation
	 *   - scope - Optional scope determining persistence behavior (defaults to 'document')
	 *   - ephemeralKeys - Optional mapping of property names to ephemeral status
	 * @public
	 */
	constructor(
		/**
		 * The unique type associated with this record.
		 *
		 * @public
		 * @readonly
		 */
		public readonly typeName: R['typeName'],
		config: {
			// eslint-disable-next-line @typescript-eslint/method-signature-style
			readonly createDefaultProperties: () => Exclude<
				Omit<R, 'id' | 'typeName'>,
				RequiredProperties
			>
			readonly validator?: StoreValidator<R>
			readonly scope?: RecordScope
			readonly ephemeralKeys?: { readonly [K in Exclude<keyof R, 'id' | 'typeName'>]: boolean }
		}
	) {
		this.createDefaultProperties = config.createDefaultProperties
		this.validator = config.validator ?? { validate: (r: unknown) => r as R }
		this.scope = config.scope ?? 'document'
		this.ephemeralKeys = config.ephemeralKeys

		const ephemeralKeySet = new Set<string>()
		if (config.ephemeralKeys) {
			for (const [key, isEphemeral] of objectMapEntries(config.ephemeralKeys)) {
				if (isEphemeral) ephemeralKeySet.add(key)
			}
		}
		this.ephemeralKeySet = ephemeralKeySet
	}

	/**
	 * Creates a new record of this type with the given properties.
	 *
	 * Properties are merged with default properties from the RecordType configuration.
	 * If no id is provided, a unique id will be generated automatically.
	 *
	 * @example
	 * ```ts
	 * const book = Book.create({
	 *   title: 'The Great Gatsby',
	 *   author: 'F. Scott Fitzgerald'
	 * })
	 * // Result: { id: 'book:abc123', typeName: 'book', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', inStock: true }
	 * ```
	 *
	 * @param properties - The properties for the new record, including both required and optional fields
	 * @returns The newly created record with generated id and typeName
	 * @public
	 */
	create(
		properties: Expand<Pick<R, RequiredProperties> & Omit<Partial<R>, RequiredProperties>>
	): R {
		const result = {
			...this.createDefaultProperties(),
			id: 'id' in properties ? properties.id : this.createId(),
		} as any

		for (const [k, v] of Object.entries(properties)) {
			if (v !== undefined) {
				result[k] = v
			}
		}

		result.typeName = this.typeName

		return result as R
	}

	/**
	 * Creates a deep copy of an existing record with a new unique id.
	 *
	 * This method performs a deep clone of all properties while generating a fresh id,
	 * making it useful for duplicating records without id conflicts.
	 *
	 * @example
	 * ```ts
	 * const originalBook = Book.create({ title: '1984', author: 'George Orwell' })
	 * const duplicatedBook = Book.clone(originalBook)
	 * // duplicatedBook has same properties but different id
	 * ```
	 *
	 * @param record - The record to clone
	 * @returns A new record with the same properties but a different id
	 * @public
	 */
	clone(record: R): R {
		return { ...structuredClone(record), id: this.createId() }
	}

	/**
	 * Create a new ID for this record type.
	 *
	 * @example
	 *
	 * ```ts
	 * const id = recordType.createId()
	 * ```
	 *
	 * @returns The new ID.
	 * @public
	 */
	createId(customUniquePart?: string): IdOf<R> {
		return (this.typeName + ':' + (customUniquePart ?? uniqueId())) as IdOf<R>
	}

	/**
	 * Extracts the unique identifier part from a full record id.
	 *
	 * Record ids have the format `typeName:uniquePart`. This method returns just the unique part.
	 *
	 * @example
	 * ```ts
	 * const bookId = Book.createId() // 'book:abc123'
	 * const uniquePart = Book.parseId(bookId) // 'abc123'
	 * ```
	 *
	 * @param id - The full record id to parse
	 * @returns The unique identifier portion after the colon
	 * @throws Error if the id is not valid for this record type
	 * @public
	 */
	parseId(id: IdOf<R>): string {
		if (!this.isId(id)) {
			throw new Error(`ID "${id}" is not a valid ID for type "${this.typeName}"`)
		}

		return id.slice(this.typeName.length + 1)
	}

	/**
	 * Type guard that checks whether a record belongs to this RecordType.
	 *
	 * This method performs a runtime check by comparing the record's typeName
	 * against this RecordType's typeName.
	 *
	 * @example
	 * ```ts
	 * if (Book.isInstance(someRecord)) {
	 *   // someRecord is now typed as a book record
	 *   console.log(someRecord.title)
	 * }
	 * ```
	 *
	 * @param record - The record to check, may be undefined
	 * @returns True if the record is an instance of this record type
	 * @public
	 */
	isInstance(record?: UnknownRecord): record is R {
		return record?.typeName === this.typeName
	}

	/**
	 * Type guard that checks whether an id string belongs to this RecordType.
	 *
	 * Validates that the id starts with this RecordType's typeName followed by a colon.
	 * This is more efficient than parsing the full id when you only need to verify the type.
	 *
	 * @example
	 * ```ts
	 * if (Book.isId(someId)) {
	 *   // someId is now typed as IdOf<BookRecord>
	 *   const book = store.get(someId)
	 * }
	 * ```
	 *
	 * @param id - The id string to check, may be undefined
	 * @returns True if the id belongs to this record type
	 * @public
	 */
	isId(id?: string): id is IdOf<R> {
		if (!id) return false
		for (let i = 0; i < this.typeName.length; i++) {
			if (id[i] !== this.typeName[i]) return false
		}

		return id[this.typeName.length] === ':'
	}

	/**
	 * Create a new RecordType that has the same type name as this RecordType and includes the given
	 * default properties.
	 *
	 * @example
	 *
	 * ```ts
	 * const authorType = createRecordType('author', () => ({ living: true }))
	 * const deadAuthorType = authorType.withDefaultProperties({ living: false })
	 * ```
	 *
	 * @param createDefaultProperties - A function that returns the default properties of the new RecordType.
	 * @returns The new RecordType.
	 */
	withDefaultProperties<DefaultProps extends Omit<Partial<R>, 'typeName' | 'id'>>(
		createDefaultProperties: () => DefaultProps
	): RecordType<R, Exclude<RequiredProperties, keyof DefaultProps>> {
		return new RecordType<R, Exclude<RequiredProperties, keyof DefaultProps>>(this.typeName, {
			createDefaultProperties: createDefaultProperties as any,
			validator: this.validator,
			scope: this.scope,
			ephemeralKeys: this.ephemeralKeys,
		})
	}

	/**
	 * Validates a record against this RecordType's validator and returns it with proper typing.
	 *
	 * This method runs the configured validator function and throws an error if validation fails.
	 * If a previous version of the record is provided, it may use optimized validation.
	 *
	 * @example
	 * ```ts
	 * try {
	 *   const validBook = Book.validate(untrustedData)
	 *   // validBook is now properly typed and validated
	 * } catch (error) {
	 *   console.log('Validation failed:', error.message)
	 * }
	 * ```
	 *
	 * @param record - The unknown record data to validate
	 * @param recordBefore - Optional previous version for optimized validation
	 * @returns The validated and properly typed record
	 * @throws Error if validation fails
	 * @public
	 */
	validate(record: unknown, recordBefore?: R): R {
		if (recordBefore && this.validator.validateUsingKnownGoodVersion) {
			return this.validator.validateUsingKnownGoodVersion(recordBefore, record)
		}
		return this.validator.validate(record)
	}
}

/**
 * Creates a new RecordType with the specified configuration.
 *
 * This factory function creates a RecordType that can be used to create, validate, and manage
 * records of a specific type within a store. The resulting RecordType can be extended with
 * default properties using the withDefaultProperties method.
 *
 * @example
 * ```ts
 * interface BookRecord extends BaseRecord<'book', RecordId<BookRecord>> {
 *   title: string
 *   author: string
 *   inStock: boolean
 * }
 *
 * const Book = createRecordType<BookRecord>('book', {
 *   scope: 'document',
 *   validator: bookValidator
 * })
 * ```
 *
 * @param typeName - The unique type name for this record type
 * @param config - Configuration object containing validator, scope, and ephemeral keys
 * @returns A new RecordType instance for creating and managing records
 * @public
 */
export function createRecordType<R extends UnknownRecord>(
	typeName: R['typeName'],
	config: {
		validator?: StoreValidator<R>
		scope: RecordScope
		ephemeralKeys?: { readonly [K in Exclude<keyof R, 'id' | 'typeName'>]: boolean }
	}
): RecordType<R, keyof Omit<R, 'id' | 'typeName'>> {
	return new RecordType<R, keyof Omit<R, 'id' | 'typeName'>>(typeName, {
		createDefaultProperties: () => ({}) as any,
		validator: config.validator,
		scope: config.scope,
		ephemeralKeys: config.ephemeralKeys,
	})
}

/**
 * Assert whether an id correspond to a record type.
 *
 * @example
 *
 * ```ts
 * assertIdType(myId, "shape")
 * ```
 *
 * @param id - The id to check.
 * @param type - The type of the record.
 * @public
 */
export function assertIdType<R extends UnknownRecord>(
	id: string | undefined,
	type: RecordType<R, any>
): asserts id is IdOf<R> {
	if (!id || !type.isId(id)) {
		throw new Error(`string ${JSON.stringify(id)} is not a valid ${type.typeName} id`)
	}
}
