/**
 * A branded string type that represents a unique identifier for a record.
 * The brand ensures type safety by preventing mixing of IDs between different record types.
 *
 * @example
 * ```ts
 * // Define a Book record
 * interface Book extends BaseRecord<'book', RecordId<Book>> {
 *   title: string
 *   author: string
 * }
 *
 * const bookId: RecordId<Book> = 'book:abc123' as RecordId<Book>
 * const authorId: RecordId<Author> = 'author:xyz789' as RecordId<Author>
 *
 * // TypeScript prevents mixing different record ID types
 * // bookId = authorId // Type error!
 * ```
 *
 * @public
 */
export type RecordId<R extends UnknownRecord> = string & { __type__: R }

/**
 * Utility type that extracts the ID type from a record type.
 * This is useful when you need to work with record IDs without having the full record type.
 *
 * @example
 * ```ts
 * interface Book extends BaseRecord<'book', RecordId<Book>> {
 *   title: string
 *   author: string
 * }
 *
 * // Extract the ID type from the Book record
 * type BookId = IdOf<Book> // RecordId<Book>
 *
 * function findBook(id: IdOf<Book>): Book | undefined {
 *   return store.get(id)
 * }
 * ```
 *
 * @public
 */
export type IdOf<R extends UnknownRecord> = R['id']

/**
 * The base record interface that all records in the store must extend.
 * This interface provides the fundamental structure required for all records: a unique ID and a type name.
 * The type parameters ensure type safety and prevent mixing of different record types.
 *
 * @example
 * ```ts
 * // Define a Book record that extends BaseRecord
 * interface Book extends BaseRecord<'book', RecordId<Book>> {
 *   title: string
 *   author: string
 *   publishedYear: number
 * }
 *
 * // Define an Author record
 * interface Author extends BaseRecord<'author', RecordId<Author>> {
 *   name: string
 *   birthYear: number
 * }
 *
 * // Usage with RecordType
 * const Book = createRecordType<Book>('book', { scope: 'document' })
 * const book = Book.create({
 *   title: '1984',
 *   author: 'George Orwell',
 *   publishedYear: 1949
 * })
 * // Results in: { id: 'book:abc123', typeName: 'book', title: '1984', ... }
 * ```
 *
 * @public
 */
export interface BaseRecord<TypeName extends string, Id extends RecordId<UnknownRecord>> {
	readonly id: Id
	readonly typeName: TypeName
}

/**
 * A generic type representing any record that extends BaseRecord.
 * This is useful for type constraints when you need to work with records of unknown types,
 * but still want to ensure they follow the BaseRecord structure.
 *
 * @example
 * ```ts
 * // Function that works with any type of record
 * function logRecord(record: UnknownRecord): void {
 *   console.log(`Record ${record.id} of type ${record.typeName}`)
 * }
 *
 * // Can be used with any record type
 * const book: Book = { id: 'book:123' as RecordId<Book>, typeName: 'book', title: '1984' }
 * const author: Author = { id: 'author:456' as RecordId<Author>, typeName: 'author', name: 'Orwell' }
 *
 * logRecord(book)   // "Record book:123 of type book"
 * logRecord(author) // "Record author:456 of type author"
 * ```
 *
 * @public
 */
export type UnknownRecord = BaseRecord<string, RecordId<UnknownRecord>>

/**
 * Type guard function that checks if an unknown value is a valid record.
 * A valid record must be an object with both `id` and `typeName` properties.
 *
 * @param record - The unknown value to check
 * @returns `true` if the value is a valid UnknownRecord, `false` otherwise
 *
 * @example
 * ```ts
 * const maybeRecord: unknown = { id: 'book:123', typeName: 'book', title: '1984' }
 * const notARecord: unknown = { title: '1984', author: 'Orwell' }
 * const nullValue: unknown = null
 *
 * if (isRecord(maybeRecord)) {
 *   // TypeScript now knows maybeRecord is UnknownRecord
 *   console.log(maybeRecord.id) // 'book:123'
 *   console.log(maybeRecord.typeName) // 'book'
 * }
 *
 * console.log(isRecord(maybeRecord)) // true
 * console.log(isRecord(notARecord))  // false (missing id and typeName)
 * console.log(isRecord(nullValue))   // false
 * ```
 *
 * @public
 */
export function isRecord(record: unknown): record is UnknownRecord {
	return typeof record === 'object' && record !== null && 'id' in record && 'typeName' in record
}
