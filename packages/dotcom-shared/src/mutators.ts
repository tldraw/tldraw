import { CustomMutatorDefs, Transaction } from '@rocicorp/zero'
import { assert } from 'tldraw'
import { MAX_NUMBER_OF_FILES } from './constants'
import {
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaFileStatePartial,
	TlaSchema,
	TlaUser,
	TlaUserPartial,
	immutableColumns,
	schema,
} from './tlaSchema'

function disallowImmutableMutations<
	S extends TlaFilePartial | TlaFileStatePartial | TlaUserPartial,
>(data: S, immutableColumns: Set<keyof S>) {
	for (const immutableColumn of immutableColumns) {
		if (data[immutableColumn] !== undefined) {
			throw new Error(`Cannot modify immutable column ${String(immutableColumn)}`)
		}
	}
}

export type TlaMutators = ReturnType<typeof createMutators>

async function assertNotMaxFiles(tx: Transaction<TlaSchema>, userId: string) {
	if (tx.location === 'client') {
		const count = (await tx.query.file.where('ownerId', userId).where('isDeleted', false).run())
			.length
		if (count >= MAX_NUMBER_OF_FILES) {
			throw new Error('You have reached the maximum number of files')
		}
	} else {
		// On the server, don't fetch all files because we don't need them
		const rows = Array.from(
			await tx.dbTransaction.query(
				`select count(*) from "file" where "ownerId" = $1 and "isDeleted" = false`,
				[userId]
			)
		) as { count: number }[]
		if (rows[0].count >= MAX_NUMBER_OF_FILES) {
			throw new Error('You have reached the maximum number of files')
		}
	}
}

export function createMutators(userId: string) {
	return {
		user: {
			insert: async (tx, user: TlaUser) => {
				assert(userId === user.id, 'Can only create your own user')
				await tx.mutate.user.insert(user)
			},
			update: async (tx, user: TlaUserPartial) => {
				assert(userId === user.id, 'Can only update your own user')
				disallowImmutableMutations(user, immutableColumns.user)
				await tx.mutate.user.update(user)
			},
		},
		file: {
			insert: async (tx, file: TlaFile) => {
				assert(file.ownerId === userId, 'Can only create your own file')
				await assertNotMaxFiles(tx, userId)

				await tx.mutate.file.insert(file)
			},
			insertWithFileState: async (
				tx,
				{ file, fileState }: { file: TlaFile; fileState: TlaFileState }
			) => {
				assert(file.ownerId === userId, 'Can only create your own file')
				await assertNotMaxFiles(tx, userId)

				await tx.mutate.file.upsert(file)
				await tx.mutate.file_state.upsert(fileState)
			},
			deleteOrForget: async (tx, file: TlaFile) => {
				await tx.mutate.file_state.delete({ fileId: file.id, userId })
				if (file?.ownerId === userId) {
					await tx.mutate.file.update({
						id: file.id,
						ownerId: file.ownerId,
						publishedSlug: file.publishedSlug,
						isDeleted: true,
					})
				}
			},
			update: async (tx, _file: TlaFilePartial) => {
				disallowImmutableMutations(_file, immutableColumns.file)
				const file = await tx.query.file.where('id', _file.id).one().run()
				assert(file, 'File not found')
				assert(!file.isDeleted, 'File is deleted')
				assert(file.ownerId === userId, 'Can only update your own file')

				await tx.mutate.file.update({
					..._file,
					id: file.id,
					ownerId: file.ownerId,
					publishedSlug: file.publishedSlug,
				})
			},
		},
		file_state: {
			insert: async (tx, fileState: TlaFileState) => {
				assert(fileState.userId === userId, 'Can only create your own file state')
				if (tx.location === 'server') {
					// the user won't be able to see the file in the client if they are not the owner
					const file = await tx.query.file.where('id', fileState.fileId).one().run()
					assert(file, 'File not found')
					if (file?.ownerId !== userId) {
						assert(file?.shared, 'File is not shared')
					}
				}
				await tx.mutate.file_state.upsert(fileState)
			},
			update: async (tx, fileState: TlaFileStatePartial) => {
				assert(fileState.userId === userId, 'Can only update your own file state')
				disallowImmutableMutations(fileState, immutableColumns.file_state)
				await tx.mutate.file_state.update(fileState)
			},
			delete: async (tx, fileState: { fileId: string; userId: string }) => {
				assert(fileState.userId === userId, 'Can only delete your own file state')
				await tx.mutate.file_state.delete({ fileId: fileState.fileId, userId: fileState.userId })
			},
		},
	} as const satisfies CustomMutatorDefs<typeof schema>
}
