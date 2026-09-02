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
//   updateTable('file').set().where().execute()
//   insertInto(table).values().onConflict().execute()
function makeFakeDb(
	fileRow: TlaFile | undefined,
	opts: {
		// Use 'none' to simulate a missing group row; omit for a live (isDeleted: false) group.
		groupRow?: { isDeleted: boolean } | 'none'
	} = {}
) {
	const { groupRow = { isDeleted: false } } = opts
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

	it('bumps lastPublished when restoring a published file, to trigger a republish', async () => {
		const file = makeFile({ published: true, lastPublished: 123 })
		const { db, updates } = makeFakeDb(file)
		await undeleteFile(db, file.id)
		expect(updates).toEqual([
			{
				table: 'file',
				values: {
					isDeleted: false,
					updatedAt: expect.any(Number),
					lastPublished: expect.any(Number),
				},
			},
		])
		expect(updates[0].values.lastPublished).not.toBe(123)
	})

	it('restores the group_file link for a group-owned file', async () => {
		const file = makeFile({ ownerId: undefined, owningGroupId: 'group-9' })
		const { db, inserts } = makeFakeDb(file, { groupRow: { isDeleted: false } })
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
})
