import { describe, expect, it } from 'vitest'
import { ROOM_KEY_BLOB_INDEX, withRoomKey } from './analytics'

describe('withRoomKey', () => {
	it('puts the room key in the same column whatever the call site passed', () => {
		const noBlobs = withRoomKey(undefined, 'hash')
		const someBlobs = withRoomKey(['', 'unused', 'instance-id'], 'hash')

		expect(noBlobs[ROOM_KEY_BLOB_INDEX]).toBe('hash')
		expect(someBlobs[ROOM_KEY_BLOB_INDEX]).toBe('hash')
		expect(noBlobs).toHaveLength(someBlobs.length)
	})

	it("leaves the call site's own blobs in the positions they had before", () => {
		expect(withRoomKey(['', 'unused', 'instance-id'], 'hash')).toEqual([
			'',
			'unused',
			'instance-id',
			'',
			'',
			'',
			'',
			'hash',
		])
	})

	it('does not mutate the blobs it was given', () => {
		const blobs = ['a']
		withRoomKey(blobs, 'hash')
		expect(blobs).toEqual(['a'])
	})

	it('lands at blob10 once writeDataPoint has prepended the event and worker names', () => {
		// writeDataPoint prepends two blobs, and SQL columns are 1-based, so a call site's element
		// 0 is blob3. This is the arithmetic the dashboards depend on.
		const blobs = ['name', 'worker-name', ...withRoomKey(undefined, 'hash')]
		expect(blobs.indexOf('hash') + 1).toBe(10)
	})
})
