import { RecordType, UnknownRecord } from '@tldraw/store'
import { ObjectDiff, applyObjectDiff, diffRecord } from './diff'
import { TLSyncError, TLSyncErrorCloseEventReason } from './TLSyncClient'

/**
 * Validate a record and compute the diff between two states.
 * Returns null if the states are identical.
 *
 * @param prevState - The previous record state
 * @param newState - The new record state
 * @param recordType - The record type definition for validation
 * @param legacyAppendMode - If true, string append operations will be converted to Put operations
 * @returns Result containing the diff and new state, or null if no changes, or validation error
 *
 * @internal
 */
export function diffAndValidateRecord<R extends UnknownRecord>(
	prevState: R,
	newState: R,
	recordType: RecordType<R, any>,
	legacyAppendMode = false
) {
	const diff = diffRecord(prevState, newState, legacyAppendMode)
	if (!diff) return
	try {
		recordType.validate(newState)
	} catch (error: any) {
		throw new TLSyncError(error.message, TLSyncErrorCloseEventReason.INVALID_RECORD)
	}
	return diff
}

/**
 * Apply a diff to a record state, validate the result, and compute the final diff.
 * Returns null if the diff produces no changes.
 *
 * @param prevState - The previous record state
 * @param diff - The object diff to apply
 * @param recordType - The record type definition for validation
 * @param legacyAppendMode - If true, string append operations will be converted to Put operations
 * @returns Result containing the final diff and new state, or null if no changes, or validation error
 *
 * @internal
 */
export function applyAndDiffRecord<R extends UnknownRecord>(
	prevState: R,
	diff: ObjectDiff,
	recordType: RecordType<R, any>,
	legacyAppendMode = false
): [ObjectDiff, R] | undefined {
	const newState = applyObjectDiff(prevState, diff)
	if (newState === prevState) return
	const actualDiff = diffAndValidateRecord(prevState, newState, recordType, legacyAppendMode)
	if (!actualDiff) return
	return [actualDiff, newState]
}

/**
 * Validate a record without computing a diff. Used when creating new records.
 *
 * @param state - The record state to validate
 * @param recordType - The record type definition for validation
 * @returns Result indicating success or validation error
 *
 * @internal
 */
export function validateRecord<R extends UnknownRecord>(state: R, recordType: RecordType<R, any>) {
	try {
		recordType.validate(state)
	} catch (error: any) {
		throw new TLSyncError(error.message, TLSyncErrorCloseEventReason.INVALID_RECORD)
	}
}
