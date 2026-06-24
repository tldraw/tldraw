import { BaseRecord, RecordId, createRecordType } from '@tldraw/store'
import { vi } from 'vitest'
import { ValueOpType, type ObjectDiff } from './diff'
import { applyAndDiffRecord, diffAndValidateRecord, validateRecord } from './recordDiff'
import { TLSyncError, TLSyncErrorCloseEventReason } from './TLSyncClient'

interface TestRecord extends BaseRecord<'test', RecordId<TestRecord>> {
	value: number
	text: string
}

function setup() {
	const validate = vi.fn((record: unknown): TestRecord => {
		const r = record as TestRecord
		if (r.value < 0) {
			throw new Error('value must not be negative')
		}
		return r
	})
	const recordType = createRecordType<TestRecord>('test', {
		validator: { validate },
		scope: 'document',
	})
	const record = (value: number, text = 'hello'): TestRecord => ({
		id: 'test:a' as TestRecord['id'],
		typeName: 'test',
		value,
		text,
	})
	return { validate, recordType, record }
}

describe('diffAndValidateRecord (RV1, RV2)', () => {
	it('[RV1] returns undefined when the records produce no diff', () => {
		const { recordType, record } = setup()
		expect(diffAndValidateRecord(record(1), record(1), recordType)).toBeUndefined()
	})

	it('[RV1] does not call the validator when there is no diff', () => {
		const { validate, recordType, record } = setup()
		const prev = record(1)

		diffAndValidateRecord(prev, prev, recordType)
		diffAndValidateRecord(prev, record(1), recordType)

		expect(validate).not.toHaveBeenCalled()
	})

	it('[RV2] validates the new state when there is a diff', () => {
		const { validate, recordType, record } = setup()
		const next = record(2)

		const diff = diffAndValidateRecord(record(1), next, recordType)

		expect(diff).toEqual({ value: [ValueOpType.Put, 2] })
		expect(validate).toHaveBeenCalledTimes(1)
		expect(validate).toHaveBeenCalledWith(next)
	})

	it('[RV2] rethrows a validator throw as TLSyncError with reason INVALID_RECORD', () => {
		const { recordType, record } = setup()

		let error: unknown
		try {
			diffAndValidateRecord(record(1), record(-1), recordType)
		} catch (e) {
			error = e
		}

		expect(error).toBeInstanceOf(TLSyncError)
		expect((error as TLSyncError).reason).toBe(TLSyncErrorCloseEventReason.INVALID_RECORD)
		expect((error as TLSyncError).message).toBe('value must not be negative')
	})
})

describe('applyAndDiffRecord (RV3)', () => {
	it('[RV3] returns undefined when the patch applies to a reference-identical result', () => {
		const { validate, recordType, record } = setup()
		const prev = record(1)
		// a put of the current value has no effect (AD2), so applyObjectDiff
		// returns the same reference
		const patch: ObjectDiff = { value: [ValueOpType.Put, 1] }

		expect(applyAndDiffRecord(prev, patch, recordType)).toBeUndefined()
		expect(validate).not.toHaveBeenCalled()
	})

	it('[RV3] returns the recomputed effective diff and the new state', () => {
		const { recordType, record } = setup()
		const prev = record(1)
		const patch: ObjectDiff = { value: [ValueOpType.Put, 2] }

		const result = applyAndDiffRecord(prev, patch, recordType)

		expect(result).toBeDefined()
		const [actualDiff, newState] = result!
		expect(actualDiff).toEqual({ value: [ValueOpType.Put, 2] })
		expect(newState).toEqual(record(2))
		// the input is not mutated (AD1)
		expect(prev).toEqual(record(1))
	})

	it('[RV3] drops no-op ops from the returned diff, keeping only the real change', () => {
		const { recordType, record } = setup()
		const prev = record(1, 'hello')
		// the text put is a no-op (same value); the value put is a real change
		const patch: ObjectDiff = {
			text: [ValueOpType.Put, 'hello'],
			value: [ValueOpType.Put, 5],
		}

		const result = applyAndDiffRecord(prev, patch, recordType)

		expect(result).toBeDefined()
		const [actualDiff, newState] = result!
		expect(actualDiff).toEqual({ value: [ValueOpType.Put, 5] })
		expect(newState).toEqual(record(5, 'hello'))
	})

	it('[RV3] [RV2] validates the patched state and wraps validator throws', () => {
		const { recordType, record } = setup()
		const patch: ObjectDiff = { value: [ValueOpType.Put, -10] }

		let error: unknown
		try {
			applyAndDiffRecord(record(1), patch, recordType)
		} catch (e) {
			error = e
		}

		expect(error).toBeInstanceOf(TLSyncError)
		expect((error as TLSyncError).reason).toBe(TLSyncErrorCloseEventReason.INVALID_RECORD)
	})
})

describe('validateRecord (RV4)', () => {
	it('[RV4] returns normally for a valid record', () => {
		const { validate, recordType, record } = setup()
		const state = record(1)

		expect(() => validateRecord(state, recordType)).not.toThrow()
		expect(validate).toHaveBeenCalledWith(state)
	})

	it('[RV4] wraps a validator throw as TLSyncError with reason INVALID_RECORD', () => {
		const { recordType, record } = setup()

		let error: unknown
		try {
			validateRecord(record(-1), recordType)
		} catch (e) {
			error = e
		}

		expect(error).toBeInstanceOf(TLSyncError)
		expect((error as TLSyncError).reason).toBe(TLSyncErrorCloseEventReason.INVALID_RECORD)
		expect((error as TLSyncError).message).toBe('value must not be negative')
	})
})
