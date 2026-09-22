import { describe, expect, it } from 'vitest'
import { LOAD_ID_HEADER, LOAD_ID_PARAM, parseLoadId } from './loadId'

describe('parseLoadId', () => {
	it('accepts a url-safe id of the length the client mints', () => {
		expect(parseLoadId('V1StGXR8_Z5jdHi6B-myT')).toBe('V1StGXR8_Z5jdHi6B-myT')
	})
	it('rejects anything that could not have come from the client', () => {
		expect(parseLoadId(undefined)).toBeUndefined()
		expect(parseLoadId(null)).toBeUndefined()
		expect(parseLoadId('')).toBeUndefined()
		expect(parseLoadId('short')).toBeUndefined()
		expect(parseLoadId('x'.repeat(33))).toBeUndefined()
		expect(parseLoadId('has space here!')).toBeUndefined()
		expect(parseLoadId('<script>alert(1)</script>')).toBeUndefined()
	})
	it('names the query param and header the client uses', () => {
		expect(LOAD_ID_PARAM).toBe('loadId')
		expect(LOAD_ID_HEADER).toBe('x-tldraw-load-id')
	})
})
