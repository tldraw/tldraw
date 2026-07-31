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
//   updateTable('file').set().where().execute()
//   insertInto(table).values().onConflict().execute()
function makeFakeDb(fileRow: TlaFile | undefined) {
	const updates: Array<{ table: string; values: any }> = []
	const inserts: Array<{ table: string; values: any }> = []
	const db = {
		selectFrom: () => ({
			where: () => ({
				selectAll: () => ({ executeTakeFirst: async () => fileRow }),
			}),
		}),
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
	return { db: db as any, updates, inserts }
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
		const { db, updates, inserts } = makeFakeDb(file)
		expect(await undeleteFile(db, file.id)).toEqual({ result: 'restored', file })
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
		const file = makeFile({ ownerId: undefined, owningGroupId: 'group-1' })
		const { db, inserts } = makeFakeDb(file)
		expect(await undeleteFile(db, file.id)).toEqual({ result: 'restored', file })
		expect(inserts).toEqual([
			{
				table: 'group_file',
				values: {
					fileId: 'file-1',
					groupId: 'group-1',
					createdAt: expect.any(Number),
					updatedAt: expect.any(Number),
				},
			},
		])
	})
})
