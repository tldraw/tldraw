import z from 'zod'

export const NoteToSelfActionSchema = z
	.object({
		_type: z.literal('note-to-self'),
		note: z.string(),
		intent: z.string(),
	})
	.meta({
		title: 'Note To Self',
		description: 'The fairy leaves a note for itself to remember something next time.',
	})

export type NoteToSelfAction = z.infer<typeof NoteToSelfActionSchema>
