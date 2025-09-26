import { BaseRecord, RecordId } from './BaseRecord'
import { createRecordType } from './RecordType'
import { Store } from './Store'
import { StoreSchema } from './StoreSchema'

interface TestRecord extends BaseRecord<'test', RecordId<TestRecord>> {
	name: string
	value: number
}

const TestRecord = createRecordType<TestRecord>('test', {
	validator: {
		validate: (record) => record as TestRecord,
	},
	scope: 'document',
}).withDefaultProperties(() => ({
	name: '',
	value: 0,
}))

describe('StoreSideEffects', () => {
	let store: Store<TestRecord>

	beforeEach(() => {
		const schema = StoreSchema.create<TestRecord>({ test: TestRecord })
		store = new Store({ schema, props: {} })
	})

	describe('beforeCreate handlers', () => {
		it('calls beforeCreate handlers and allows transformation', () => {
			let handlerCalled = false
			store.sideEffects.registerBeforeCreateHandler('test', (record, source) => {
				handlerCalled = true
				expect(source).toBe('user')
				return { ...record, name: 'transformed' }
			})

			const record = TestRecord.create({ name: 'original', value: 42 })
			store.put([record])

			expect(handlerCalled).toBe(true)
			expect(store.get(record.id)!.name).toBe('transformed')
		})

		it('chains multiple beforeCreate handlers', () => {
			store.sideEffects.registerBeforeCreateHandler('test', (record) => ({
				...record,
				value: record.value + 10,
			}))
			store.sideEffects.registerBeforeCreateHandler('test', (record) => ({
				...record,
				value: record.value * 2,
			}))

			const record = TestRecord.create({ name: 'test', value: 5 })
			store.put([record])

			// First handler: 5 + 10 = 15, Second handler: 15 * 2 = 30
			expect(store.get(record.id)!.value).toBe(30)
		})
	})

	describe('afterCreate handlers', () => {
		it('calls afterCreate handlers after record creation', () => {
			let handlerCalled = false
			let capturedRecord: TestRecord | null = null
			store.sideEffects.registerAfterCreateHandler('test', (record, source) => {
				handlerCalled = true
				capturedRecord = record
				expect(source).toBe('user')
			})

			const record = TestRecord.create({ name: 'test', value: 42 })
			store.put([record])

			expect(handlerCalled).toBe(true)
			expect(capturedRecord).toEqual(record)
		})
	})

	describe('beforeChange handlers', () => {
		it('allows transformation of changes', () => {
			const record = TestRecord.create({ name: 'test', value: 42 })
			store.put([record])

			store.sideEffects.registerBeforeChangeHandler('test', (prev, next) => ({
				...next,
				name: next.name + '_transformed',
			}))

			store.update(record.id, (r) => ({ ...r, name: 'updated' }))

			expect(store.get(record.id)!.name).toBe('updated_transformed')
		})

		it('can prevent changes by returning previous record', () => {
			const record = TestRecord.create({ name: 'test', value: 42 })
			store.put([record])

			store.sideEffects.registerBeforeChangeHandler('test', (prev, next) => {
				if (next.value > 100) return prev
				return next
			})

			store.update(record.id, (r) => ({ ...r, value: 200 }))

			expect(store.get(record.id)!.value).toBe(42) // unchanged
		})
	})

	describe('afterChange handlers', () => {
		it('calls afterChange handlers with previous and current records', () => {
			const record = TestRecord.create({ name: 'test', value: 42 })
			store.put([record])

			let handlerCalled = false
			let capturedPrev: TestRecord | null = null
			let capturedNext: TestRecord | null = null

			store.sideEffects.registerAfterChangeHandler('test', (prev, next, source) => {
				handlerCalled = true
				capturedPrev = prev
				capturedNext = next
				expect(source).toBe('user')
			})

			store.update(record.id, (r) => ({ ...r, value: 100 }))

			expect(handlerCalled).toBe(true)
			expect(capturedPrev!.value).toBe(42)
			expect(capturedNext!.value).toBe(100)
		})
	})

	describe('beforeDelete handlers', () => {
		it('can prevent deletion by returning false', () => {
			const record = TestRecord.create({ name: 'protected', value: 42 })
			store.put([record])

			store.sideEffects.registerBeforeDeleteHandler('test', (record) => {
				if (record.name === 'protected') return false
				return
			})

			store.remove([record.id])

			expect(store.get(record.id)).toBeDefined() // still exists
		})

		it('allows deletion when handler returns void', () => {
			const record = TestRecord.create({ name: 'deletable', value: 42 })
			store.put([record])

			let handlerCalled = false
			store.sideEffects.registerBeforeDeleteHandler('test', (_record) => {
				handlerCalled = true
				return // void return allows deletion
			})

			store.remove([record.id])

			expect(handlerCalled).toBe(true)
			expect(store.get(record.id)).toBeUndefined()
		})
	})

	describe('afterDelete handlers', () => {
		it('calls afterDelete handlers with deleted record', () => {
			const record = TestRecord.create({ name: 'test', value: 42 })
			store.put([record])

			let handlerCalled = false
			let capturedRecord: TestRecord | null = null

			store.sideEffects.registerAfterDeleteHandler('test', (record, source) => {
				handlerCalled = true
				capturedRecord = record
				expect(source).toBe('user')
			})

			store.remove([record.id])

			expect(handlerCalled).toBe(true)
			expect(capturedRecord).toEqual(record)
		})
	})

	describe('operationComplete handlers', () => {
		it('calls handler after operation completes', () => {
			let handlerCalled = false
			let capturedSource: 'user' | 'remote' | null = null

			store.sideEffects.registerOperationCompleteHandler((source) => {
				handlerCalled = true
				capturedSource = source
			})

			const record = TestRecord.create({ name: 'test', value: 42 })
			store.put([record])

			expect(handlerCalled).toBe(true)
			expect(capturedSource).toBe('user')
		})
	})

	describe('handler cleanup', () => {
		it('removes handlers when cleanup function is called', () => {
			let handlerCalled = false
			const cleanup = store.sideEffects.registerBeforeCreateHandler('test', (record) => {
				handlerCalled = true
				return { ...record, name: 'transformed' }
			})

			cleanup()

			const record = TestRecord.create({ name: 'original', value: 42 })
			store.put([record])

			expect(handlerCalled).toBe(false)
			expect(store.get(record.id)!.name).toBe('original')
		})
	})

	describe('source parameter handling', () => {
		it('passes correct source to handlers for remote changes', () => {
			let capturedSource: 'user' | 'remote' | null = null

			store.sideEffects.registerAfterCreateHandler('test', (_, source) => {
				capturedSource = source
			})

			const record = TestRecord.create({ name: 'test', value: 42 })
			store.mergeRemoteChanges(() => {
				store.put([record])
			})

			expect(capturedSource).toBe('remote')
		})
	})
})
