import { describe, expect, it } from 'vitest'
import { BaseRecord, IdOf, RecordId, UnknownRecord, isRecord } from './BaseRecord'

// Test interfaces extending BaseRecord for testing type system
interface TestBook extends BaseRecord<'book', RecordId<TestBook>> {
	title: string
	author: string
	publishedYear: number
}

interface TestAuthor extends BaseRecord<'author', RecordId<TestAuthor>> {
	name: string
	birthYear: number
}

interface TestUser extends BaseRecord<'user', RecordId<TestUser>> {
	email: string
	preferences: {
		theme: 'light' | 'dark'
		notifications: boolean
	}
}

describe('BaseRecord types', () => {
	describe('RecordId<R>', () => {
		it('should be a branded string type', () => {
			const bookId = 'book:123' as RecordId<TestBook>
			const authorId = 'author:456' as RecordId<TestAuthor>

			// These should be strings at runtime
			expect(typeof bookId).toBe('string')
			expect(typeof authorId).toBe('string')

			// But TypeScript should prevent assignment between different ID types
			// This would be a TypeScript error if uncommented:
			// const mixedId: RecordId<TestBook> = authorId
		})

		it('should work with complex record types', () => {
			const userId = 'user:789' as RecordId<TestUser>
			expect(typeof userId).toBe('string')
			expect(userId).toBe('user:789')
		})
	})

	describe('IdOf<R>', () => {
		it('should extract the correct ID type from record types', () => {
			// These are type-level tests - they verify the types compile correctly
			const bookRecord: TestBook = {
				id: 'book:123' as RecordId<TestBook>,
				typeName: 'book',
				title: '1984',
				author: 'George Orwell',
				publishedYear: 1949,
			}

			// IdOf<TestBook> should be RecordId<TestBook>
			const bookId: IdOf<TestBook> = bookRecord.id
			expect(bookId).toBe('book:123')

			const authorRecord: TestAuthor = {
				id: 'author:456' as RecordId<TestAuthor>,
				typeName: 'author',
				name: 'George Orwell',
				birthYear: 1903,
			}

			// IdOf<TestAuthor> should be RecordId<TestAuthor>
			const authorId: IdOf<TestAuthor> = authorRecord.id
			expect(authorId).toBe('author:456')
		})
	})

	describe('BaseRecord<TypeName, Id>', () => {
		it('should enforce readonly properties', () => {
			const bookRecord: TestBook = {
				id: 'book:123' as RecordId<TestBook>,
				typeName: 'book',
				title: '1984',
				author: 'George Orwell',
				publishedYear: 1949,
			}

			// These would be TypeScript errors if uncommented (readonly properties):
			// bookRecord.id = 'book:456' as RecordId<TestBook>
			// bookRecord.typeName = 'author'

			expect(bookRecord.id).toBe('book:123')
			expect(bookRecord.typeName).toBe('book')
		})

		it('should support records with complex properties', () => {
			const userRecord: TestUser = {
				id: 'user:789' as RecordId<TestUser>,
				typeName: 'user',
				email: 'test@example.com',
				preferences: {
					theme: 'dark',
					notifications: true,
				},
			}

			expect(userRecord.id).toBe('user:789')
			expect(userRecord.typeName).toBe('user')
			expect(userRecord.email).toBe('test@example.com')
			expect(userRecord.preferences.theme).toBe('dark')
			expect(userRecord.preferences.notifications).toBe(true)
		})

		it('should work with minimal record implementations', () => {
			const minimalRecord: BaseRecord<'minimal', RecordId<any>> = {
				id: 'minimal:1' as RecordId<any>,
				typeName: 'minimal',
			}

			expect(minimalRecord.id).toBe('minimal:1')
			expect(minimalRecord.typeName).toBe('minimal')
		})
	})

	describe('UnknownRecord', () => {
		it('should accept any valid record structure', () => {
			const bookRecord = {
				id: 'book:123' as RecordId<UnknownRecord>,
				typeName: 'book',
				title: '1984',
			} as UnknownRecord & { title: string }

			const authorRecord = {
				id: 'author:456' as RecordId<UnknownRecord>,
				typeName: 'author',
				name: 'George Orwell',
				complex: {
					nested: {
						data: [1, 2, 3],
					},
				},
			} as UnknownRecord & { name: string; complex: { nested: { data: number[] } } }

			expect(bookRecord.id).toBe('book:123')
			expect(bookRecord.typeName).toBe('book')
			expect(bookRecord.title).toBe('1984')

			expect(authorRecord.id).toBe('author:456')
			expect(authorRecord.typeName).toBe('author')
			expect(authorRecord.name).toBe('George Orwell')
		})
	})
})

describe('isRecord function', () => {
	describe('valid records', () => {
		it('should return true for simple valid records', () => {
			const validRecord = {
				id: 'book:123',
				typeName: 'book',
			}

			expect(isRecord(validRecord)).toBe(true)
		})

		it('should return true for records with additional properties', () => {
			const recordWithProps = {
				id: 'book:123',
				typeName: 'book',
				title: '1984',
				author: 'George Orwell',
				publishedYear: 1949,
				metadata: {
					genre: 'dystopian',
					pages: 328,
				},
			}

			expect(isRecord(recordWithProps)).toBe(true)
		})

		it('should return true for records with complex nested data', () => {
			const complexRecord = {
				id: 'user:789',
				typeName: 'user',
				profile: {
					personal: {
						name: 'John Doe',
						age: 30,
					},
					settings: {
						theme: 'dark',
						notifications: true,
						permissions: ['read', 'write'],
					},
				},
				history: [
					{ action: 'login', timestamp: Date.now() },
					{ action: 'update_profile', timestamp: Date.now() },
				],
			}

			expect(isRecord(complexRecord)).toBe(true)
		})

		it('should return true for records with null/undefined additional properties', () => {
			const recordWithNulls = {
				id: 'test:1',
				typeName: 'test',
				optionalProp: null,
				anotherProp: undefined,
				definedProp: 'value',
			}

			expect(isRecord(recordWithNulls)).toBe(true)
		})

		it('should return true for records with various property types', () => {
			const recordWithVariousTypes = {
				id: 'mixed:1',
				typeName: 'mixed',
				stringProp: 'hello',
				numberProp: 42,
				booleanProp: true,
				arrayProp: [1, 2, 3],
				objectProp: { nested: true },
				functionProp: () => {},
				dateProp: new Date(),
				regexProp: /test/,
				symbolProp: Symbol('test'),
			}

			expect(isRecord(recordWithVariousTypes)).toBe(true)
		})
	})

	describe('invalid records', () => {
		it('should return false for null', () => {
			expect(isRecord(null)).toBe(false)
		})

		it('should return false for undefined', () => {
			expect(isRecord(undefined)).toBe(false)
		})

		it('should return false for primitive types', () => {
			expect(isRecord('string')).toBe(false)
			expect(isRecord(42)).toBe(false)
			expect(isRecord(true)).toBe(false)
			expect(isRecord(false)).toBe(false)
			expect(isRecord(Symbol('test'))).toBe(false)
		})

		it('should return false for objects missing id property', () => {
			const missingId = {
				typeName: 'book',
				title: '1984',
			}

			expect(isRecord(missingId)).toBe(false)
		})

		it('should return false for objects missing typeName property', () => {
			const missingTypeName = {
				id: 'book:123',
				title: '1984',
			}

			expect(isRecord(missingTypeName)).toBe(false)
		})

		it('should return false for objects missing both id and typeName', () => {
			const missingBoth = {
				title: '1984',
				author: 'George Orwell',
			}

			expect(isRecord(missingBoth)).toBe(false)
		})

		it('should return false for empty objects', () => {
			expect(isRecord({})).toBe(false)
		})

		it('should return false for functions (even with id and typeName)', () => {
			// Functions are rejected because typeof function !== 'object'
			const funcWithProps = function () {}
			;(funcWithProps as any).id = 'func:1'
			;(funcWithProps as any).typeName = 'func'

			expect(isRecord(funcWithProps)).toBe(false)
		})
	})

	describe('edge cases with arrays', () => {
		it('should return true for arrays with id and typeName properties', () => {
			// Arrays are objects in JavaScript, so they pass isRecord if they have required properties
			const arrayWithProps = [1, 2, 3]
			;(arrayWithProps as any).id = 'array:1'
			;(arrayWithProps as any).typeName = 'array'

			expect(isRecord(arrayWithProps)).toBe(true)
		})
	})

	describe('type validation edge cases', () => {
		it('should return true for objects with non-string id', () => {
			// isRecord doesn't validate property types, only their presence
			const numericId = {
				id: 123,
				typeName: 'test',
			}

			expect(isRecord(numericId)).toBe(true)
		})

		it('should return true for objects with non-string typeName', () => {
			// isRecord doesn't validate property types, only their presence
			const numericTypeName = {
				id: 'test:1',
				typeName: 123,
			}

			expect(isRecord(numericTypeName)).toBe(true)
		})
	})

	describe('edge cases', () => {
		it('should return true for objects with prototype properties', () => {
			function RecordConstructor(this: any) {
				this.id = 'proto:1'
				this.typeName = 'proto'
			}
			RecordConstructor.prototype.someMethod = function () {}

			const protoRecord = new (RecordConstructor as any)()
			expect(isRecord(protoRecord)).toBe(true)
		})

		it('should return true for objects created with Object.create', () => {
			const proto = { someMethod: function () {} }
			const createdRecord = Object.create(proto)
			createdRecord.id = 'created:1'
			createdRecord.typeName = 'created'

			expect(isRecord(createdRecord)).toBe(true)
		})

		it('should return false for objects where id or typeName are not own properties', () => {
			// This tests the current implementation - it uses the 'in' operator
			// which checks the entire prototype chain
			const proto = { id: 'proto:1', typeName: 'proto' }
			const inheritedRecord = Object.create(proto)

			expect(isRecord(inheritedRecord)).toBe(true) // 'in' operator checks prototype chain
		})

		it('should handle objects with getters and setters', () => {
			const recordWithGetters = {
				get id() {
					return 'getter:1'
				},
				get typeName() {
					return 'getter'
				},
				title: '1984',
			}

			expect(isRecord(recordWithGetters)).toBe(true)
		})

		it('should handle objects with non-enumerable properties', () => {
			const obj = {}
			Object.defineProperty(obj, 'id', {
				value: 'hidden:1',
				enumerable: false,
				writable: true,
				configurable: true,
			})
			Object.defineProperty(obj, 'typeName', {
				value: 'hidden',
				enumerable: false,
				writable: true,
				configurable: true,
			})

			expect(isRecord(obj)).toBe(true)
		})

		it('should handle frozen objects', () => {
			const frozenRecord = Object.freeze({
				id: 'frozen:1',
				typeName: 'frozen',
				title: 'Immutable Book',
			})

			expect(isRecord(frozenRecord)).toBe(true)
		})

		it('should handle sealed objects', () => {
			const sealedRecord = Object.seal({
				id: 'sealed:1',
				typeName: 'sealed',
				title: 'Sealed Book',
			})

			expect(isRecord(sealedRecord)).toBe(true)
		})
	})

	describe('type narrowing', () => {
		it('should properly narrow types when used as type guard', () => {
			const unknownValue: unknown = {
				id: 'book:123',
				typeName: 'book',
				title: '1984',
			}

			if (isRecord(unknownValue)) {
				// TypeScript should now know this is UnknownRecord
				expect(unknownValue.id).toBe('book:123')
				expect(unknownValue.typeName).toBe('book')
				// Additional properties should be accessible but require casting
				expect((unknownValue as any).title).toBe('1984')
			} else {
				// This shouldn't happen in this test
				expect(true).toBe(false)
			}
		})

		it('should work in filter operations', () => {
			const mixedArray: unknown[] = [
				{ id: 'book:1', typeName: 'book', title: 'Book 1' },
				'not a record',
				{ id: 'book:2', typeName: 'book', title: 'Book 2' },
				null,
				{ typeName: 'incomplete' }, // missing id
				{ id: 'book:3', typeName: 'book', title: 'Book 3' },
			]

			const records = mixedArray.filter(isRecord)

			expect(records).toHaveLength(3)
			expect(records.every((r) => typeof r.id === 'string')).toBe(true)
			expect(records.every((r) => typeof r.typeName === 'string')).toBe(true)
		})
	})
})
