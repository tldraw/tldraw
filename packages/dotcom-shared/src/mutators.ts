import { CustomMutatorDefs } from '@rocicorp/zero'
import { assert } from 'tldraw'
import {
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaFileStatePartial,
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
				if (file.ownerId !== userId) {
					throw new Error('You are not the owner of this file')
				}

				await tx.mutate.file.insert(file)
			},
			insertWithFileState: async (
				tx,
				{ file, fileState }: { file: TlaFile; fileState: TlaFileState }
			) => {
				if (file.ownerId !== userId) {
					throw new Error('You are not the owner of this file')
				}
				await tx.mutate.file.upsert(file)
				await tx.mutate.file_state.upsert(fileState)
			},
			deleteOrForget: async (tx, file: TlaFile) => {
				tx.mutate.file_state.delete({ fileId: file.id, userId })
				if (file?.ownerId === userId) {
					tx.mutate.file.update({
						id: file.id,
						ownerId: file.ownerId,
						publishedSlug: file.publishedSlug,
						isDeleted: true,
					})
				}
			},
			update: async (tx, file: TlaFilePartial) => {
				disallowImmutableMutations(file, immutableColumns.file)
				if (file.isDeleted) {
					throw new Error('Cannot update deleted files')
				}
				const fileQ = await tx.query.file.where('id', file.id).one().run()
				if (!fileQ) {
					throw new Error('File not found')
				}
				if (file.ownerId !== userId) {
					throw new Error('You are not the owner of this file')
				}

				await tx.mutate.file.update({
					ownerId: fileQ.ownerId,
					publishedSlug: fileQ.publishedSlug,
					...file,
				})
			},
		},
		file_state: {
			insert: async (tx, fileState: TlaFileState) => {
				assert(fileState.userId === userId, 'Can only create your own file state')
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
