import { CustomMutatorDefs } from '@rocicorp/zero'
import {
	TlaFile,
	TlaFilePartial,
	TlaFileState,
	TlaFileStatePartial,
	TlaUser,
	TlaUserPartial,
	schema,
} from './tlaSchema'

export function createMutators() {
	return {
		bloopyBlahBlah: {
			blah: async (tx, { name }: { name: string }) => {
				console.log('bloopyBlahBlah', name)
				return
			},
		},
		user: {
			insert: async (tx, user: TlaUser) => {
				await tx.mutate.user.insert(user)
			},
			update: async (tx, user: TlaUserPartial) => {
				await tx.mutate.user.update(user)
			},
		},
		file: {
			insert: async (tx, file: TlaFile) => {
				await tx.mutate.file.insert(file)
			},
			update: async (tx, file: TlaFilePartial) => {
				const fileQ = await tx.query.file.where('id', file.id).one().run()
				if (!fileQ) {
					return
					throw new Error('File not found')
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
				await tx.mutate.file_state.insert(fileState)
			},
			update: async (tx, fileState: TlaFileStatePartial) => {
				await tx.mutate.file_state.update(fileState)
			},
			delete: async (tx, { fileId, userId }: { fileId: string; userId: string }) => {
				await tx.mutate.file_state.delete({ fileId, userId })
			},
		},
	} as const satisfies CustomMutatorDefs<typeof schema>
}
