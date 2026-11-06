import {
	AccessTypeRule,
	BaseRecord,
	CustomRecordInfo,
	Editor,
	RecordId,
	T,
	TLRecord,
	TLShapeId,
	createCustomRecordId,
} from 'tldraw'

// A plugin's own record type. The plugin adds a type rule and a verb to the model; nothing in the
// editor or the server knows about votes.

export interface TLVote extends BaseRecord<'vote', RecordId<TLVote>> {
	shapeId: TLShapeId
	userId: string
}

export const voteSchemaRecords: Record<string, CustomRecordInfo> = {
	vote: {
		scope: 'document',
		validator: T.object({
			id: T.string,
			typeName: T.literal('vote'),
			shapeId: T.string,
			userId: T.string,
		}),
	},
}

/** Votes hang under the shape they are on, and their owner is the voter. */
export const voteAccessType: AccessTypeRule<TLVote> = {
	parent: (vote) => vote.shapeId,
	verbs: { create: 'vote', update: 'vote:edit', delete: 'vote:edit' },
	owner: {
		get: (vote) => vote.userId || null,
		set: (vote, ownerId) => ({ ...vote, userId: ownerId ?? '' }),
	},
}

export function vote(shapeId: TLShapeId, userId: string): TLRecord {
	return {
		id: createCustomRecordId('vote', `${userId}-${shapeId}`),
		typeName: 'vote',
		shapeId,
		userId,
	} as unknown as TLRecord
}

export function voteSummary(editor: Editor): string {
	const votes = editor.store
		.allRecords()
		.filter((r) => r.typeName === ('vote' as string)) as unknown as TLVote[]
	const byShape = new Map<string, string[]>()
	for (const v of votes) byShape.set(v.shapeId, [...(byShape.get(v.shapeId) ?? []), v.userId])
	const parts = editor.getCurrentPageShapes().map((shape) => {
		const voters = byShape.get(shape.id) ?? []
		const may = editor.access.can('vote', shape.id) ? '' : ' (may not vote)'
		return `${shape.id.replace('shape:', '')}: ${voters.length}${voters.length ? ` (${voters.join(', ')})` : ''}${may}`
	})
	return `votes: ${parts.join(' · ')}`
}
