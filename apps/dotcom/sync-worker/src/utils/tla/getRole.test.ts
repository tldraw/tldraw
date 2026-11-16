import { describe, expect, it } from 'vitest'
import { createFakeKysely } from '../../test/fakeKysely'
import { getFileRecordWithRole } from './getRole'

describe('getFileRecordWithRole', () => {
	it('resolves the role in the same query, correlated on the owning group', async () => {
		const { db, queries } = createFakeKysely()
		await getFileRecordWithRole(db, 'file1', 'user1')
		expect(queries).toHaveLength(1)
		expect(queries[0].sql).toBe(
			'select "file".*, (select "group_user"."role" from "group_user" where "group_user"."groupId" = "file"."owningGroupId" and "group_user"."userId" = $1) as "role" from "file" where "file"."id" = $2'
		)
		expect(queries[0].parameters).toEqual(['user1', 'file1'])
	})

	it('splits the role off the file row', async () => {
		const { db } = createFakeKysely([[{ id: 'file1', owningGroupId: 'group1', role: 'admin' }]])
		expect(await getFileRecordWithRole(db, 'file1', 'user1')).toEqual({
			file: { id: 'file1', owningGroupId: 'group1' },
			role: 'admin',
		})
	})

	it('returns a null role for non-members', async () => {
		const { db } = createFakeKysely([[{ id: 'file1', owningGroupId: 'group1', role: null }]])
		expect(await getFileRecordWithRole(db, 'file1', 'user1')).toEqual({
			file: { id: 'file1', owningGroupId: 'group1' },
			role: null,
		})
	})

	it('returns null when the file row is missing', async () => {
		const { db } = createFakeKysely()
		expect(await getFileRecordWithRole(db, 'file1', 'user1')).toBeNull()
	})
})
