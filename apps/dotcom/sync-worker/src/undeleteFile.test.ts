import { TlaFile } from '@tldraw/dotcom-shared'
import { describe, expect, it } from 'vitest'
import { undeleteFile } from './undeleteFile'

function makeFile(overrides: Partial<TlaFile> = {}): TlaFile {
	return {
		id: 'file-1',
		name: 'My file',
		ownerId: 'user-1',
		owningGroupId: undefined,
		ownerName: '',
		ownerAvatar: '',
		thumbnail: '',
		shared: true,
		sharedLinkType: 'edit',
		published: false,
		lastPublished: 0,
		publishedSlug: '',
		createdAt: 0,
		updatedAt: 0,
		isEmpty: false,
		isDeleted: true,
		createSource: undefined,
		...overrides,
	} as TlaFile
}

// Stubs the chains undeleteFile uses:
//   selectFrom('file').where().selectAll().executeTakeFirst()
//   selectFrom('group').select().where().executeTakeFirst()
//   selectFrom('group_user').select().where().execute()
//   selectFrom('user').select().where().executeTakeFirst()
//   updateTable('file').set().where().execute()
//   insertInto(table).values().onConflict().execute()
function makeFakeDb(
	fileRow: TlaFile | undefined,
	opts: {
		groupMembers?: Array<{ userId: string }>
		userRow?: { id: string } | undefined
		// Use 'none' to simulate a missing group row; omit for a live (isDeleted: false) group.
		groupRow?: { isDeleted: boolean } | 'none'
	} = {}
) {
	const { groupMembers = [], userRow, groupRow = { isDeleted: false } } = opts
	const resolvedGroupRow = groupRow === 'none' ? undefined : groupRow
	const updates: Array<{ table: string; values: any }> = []
	const inserts: Array<{ table: string; values: any }> = []
	let transactionCount = 0
	const db: any = {
		transaction: () => ({
			execute: async (cb: (tx: any) => Promise<any>) => {
				transactionCount++
				return cb(db)
			},
		}),
		selectFrom: (table: string) => {
			if (table === 'file') {
				return {
					where: () => ({
						selectAll: () => ({ executeTakeFirst: async () => fileRow }),
					}),
				}
			}
			if (table === 'group') {
				return {
					select: () => ({
						where: () => ({ executeTakeFirst: async () => resolvedGroupRow }),
					}),
				}
			}
			if (table === 'group_user') {
				return {
					select: () => ({
						where: () => ({ execute: async () => groupMembers }),
					}),
				}
			}
			if (table === 'user') {
				return {
					select: () => ({
						where: () => ({ executeTakeFirst: async () => userRow }),
					}),
				}
			}
			throw new Error(`unexpected selectFrom('${table}')`)
		},
		updateTable: (table: string) => ({
			set: (values: any) => ({
				where: () => ({
					execute: async () => {
						updates.push({ table, values })
					},
				}),
			}),
		}),
		insertInto: (table: string) => ({
			values: (values: any) => ({
				onConflict: () => ({
					execute: async () => {
						inserts.push({ table, values })
					},
				}),
			}),
		}),
	}
	return { db: db as any, updates, inserts, getTransactionCount: () => transactionCount }
}

describe('undeleteFile', () => {
	it('returns not_found for a missing file and writes nothing', async () => {
		const { db, updates, inserts } = makeFakeDb(undefined)
		expect(await undeleteFile(db, 'nope')).toEqual({ result: 'not_found' })
		expect(updates).toEqual([])
		expect(inserts).toEqual([])
	})

	it('returns not_deleted for a live file and writes nothing', async () => {
		const file = makeFile({ isDeleted: false })
		const { db, updates, inserts } = makeFakeDb(file)
		expect(await undeleteFile(db, file.id)).toEqual({ result: 'not_deleted', file })
		expect(updates).toEqual([])
		expect(inserts).toEqual([])
	})

	it('clears the flag and restores the owner file_state', async () => {
		const file = makeFile()
		const { db, updates, inserts, getTransactionCount } = makeFakeDb(file)
		expect(await undeleteFile(db, file.id)).toEqual({
			result: 'restored',
			file,
			rebootUserIds: ['user-1'],
		})
		expect(getTransactionCount()).toBe(1)
		expect(updates).toEqual([
			{ table: 'file', values: { isDeleted: false, updatedAt: expect.any(Number) } },
		])
		expect(inserts).toEqual([
			{
				table: 'file_state',
				values: {
					userId: 'user-1',
					fileId: 'file-1',
					firstVisitAt: expect.any(Number),
					isFileOwner: true,
				},
			},
		])
	})

	it('restores the group_file link for a group-owned file', async () => {
		const file = makeFile({ ownerId: undefined, owningGroupId: 'group-9' })
		const { db, inserts } = makeFakeDb(file, {
			groupMembers: [{ userId: 'user-1' }, { userId: 'user-2' }],
			userRow: undefined,
			groupRow: { isDeleted: false },
		})
		const result = await undeleteFile(db, file.id)
		expect(result.result).toBe('restored')
		expect(inserts).toEqual([
			{
				table: 'group_file',
				values: {
					fileId: 'file-1',
					groupId: 'group-9',
					createdAt: expect.any(Number),
					updatedAt: expect.any(Number),
				},
			},
		])
	})

	it('returns group_deleted and writes nothing when the owning group is soft-deleted', async () => {
		const file = makeFile({ ownerId: undefined, owningGroupId: 'group-9' })
		const { db, updates, inserts } = makeFakeDb(file, {
			groupRow: { isDeleted: true },
		})
		expect(await undeleteFile(db, file.id)).toEqual({ result: 'group_deleted', file })
		expect(updates).toEqual([])
		expect(inserts).toEqual([])
	})

	it('returns group_deleted and writes nothing when the owning group row is missing', async () => {
		const file = makeFile({ ownerId: undefined, owningGroupId: 'group-9' })
		const { db, updates, inserts } = makeFakeDb(file, {
			groupRow: 'none',
		})
		expect(await undeleteFile(db, file.id)).toEqual({ result: 'group_deleted', file })
		expect(updates).toEqual([])
		expect(inserts).toEqual([])
	})

	describe('rebootUserIds', () => {
		it('is just the owner for a legacy file with no group', async () => {
			const file = makeFile({ ownerId: 'user-1', owningGroupId: undefined })
			const { db } = makeFakeDb(file)
			const result = await undeleteFile(db, file.id)
			expect(result).toMatchObject({ rebootUserIds: ['user-1'] })
		})

		it('includes the owner for a home-workspace file (group id == user id)', async () => {
			const file = makeFile({ ownerId: undefined, owningGroupId: 'user-1' })
			const { db } = makeFakeDb(file, {
				groupMembers: [],
				userRow: { id: 'user-1' },
			})
			const result = await undeleteFile(db, file.id)
			expect(result).toMatchObject({ rebootUserIds: ['user-1'] })
		})

		it('dedupes when the home-workspace owner also has a group_user row', async () => {
			const file = makeFile({ ownerId: undefined, owningGroupId: 'user-1' })
			const { db } = makeFakeDb(file, {
				groupMembers: [{ userId: 'user-1' }],
				userRow: { id: 'user-1' },
			})
			const result = await undeleteFile(db, file.id)
			expect(result).toMatchObject({ rebootUserIds: ['user-1'] })
			if (result.result === 'restored') {
				expect(result.rebootUserIds).toHaveLength(1)
			}
		})

		it('includes all members for a shared workspace and not the group id itself', async () => {
			const file = makeFile({ ownerId: undefined, owningGroupId: 'group-9' })
			const { db } = makeFakeDb(file, {
				groupMembers: [{ userId: 'user-1' }, { userId: 'user-2' }],
				userRow: undefined,
			})
			const result = await undeleteFile(db, file.id)
			expect(result.result).toBe('restored')
			if (result.result === 'restored') {
				expect(result.rebootUserIds.sort()).toEqual(['user-1', 'user-2'])
				expect(result.rebootUserIds).not.toContain('group-9')
			}
		})
	})
})
