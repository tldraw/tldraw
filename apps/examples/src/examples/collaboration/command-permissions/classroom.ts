import { defineCommand, defineCommandSet, type TLCommandActor } from '@tldraw/sync'
import {
	commentCommands,
	createOwnedShapesPolicy,
	createPageReadPolicy,
	getShapeOwner,
	pageCommands,
	TLDRAW_PERMISSIONS as P,
} from '@tldraw/sync-collaboration'
import {
	commentSchemaRecords,
	createTLSchema,
	toRichText,
	type TLRecord,
	type TLShape,
	type TLShapeId,
} from 'tldraw'
import { T } from 'tldraw'

// The room's commands and rules, shared by the server and every client. In a real app this module
// is imported by both the sync server and the browser bundle.

export const schema = createTLSchema({ records: commentSchemaRecords })

// [1] A plugin action. Voting writes another user's shape, which the edit lane would deny, so it
// is a command: the voter is the actor, never an arg, and each vote is one unit.
const voteToggle = defineCommand<TLRecord, { shapeId: string }>({
	name: 'votes.toggle',
	requires: 'votes:cast',
	args: T.object({ shapeId: T.string }),
	run(ctx, { shapeId }) {
		const userId = ctx.actor.userId ?? ctx.deny('sign in to vote')
		const shape = ctx.get<TLShape>(shapeId)
		if (!shape || shape.typeName !== 'shape') return ctx.deny('no such shape')
		const votes = Array.isArray(shape.meta.votes) ? (shape.meta.votes as string[]) : []
		const next = votes.includes(userId) ? votes.filter((v) => v !== userId) : [...votes, userId]
		ctx.update<TLShape>(shape.id, { meta: { ...shape.meta, votes: next } })
		// the inverse puts the vote on the undo stack: undo sends votes.toggle again
		return { name: 'votes.toggle', args: { shapeId } }
	},
})

// [2] An agent tool. The agent's token gives it this one command and nothing else.
const agentAddNote = defineCommand<TLRecord, { id: string; text: string }>({
	name: 'agent.addNote',
	requires: 'agent:notes',
	args: T.object({ id: T.string, text: T.string.check((t) => t.length <= 200) }),
	run(ctx, { id, text }) {
		const shapes = ctx.getAll<TLShape>('shape')
		const area = shapes.find((s) => s.meta.agentArea === true)
		if (!area) return ctx.deny('the teacher has not made an agent area')
		const count = shapes.filter((s) => s.parentId === area.id).length
		ctx.put({
			id: id as TLShapeId,
			typeName: 'shape',
			type: 'note',
			parentId: area.id,
			index: `a${count + 1}` as TLShape['index'],
			x: 10 + (count % 3) * 110,
			y: 20 + (Math.floor(count / 3) % 2) * 110,
			rotation: 0,
			isLocked: false,
			opacity: 1,
			meta: { ownerId: ctx.actor.userId },
			props: {
				color: 'violet',
				richText: toRichText(text),
				size: 'm',
				font: 'draw',
				align: 'middle',
				verticalAlign: 'middle',
				labelColor: 'black',
				growY: 0,
				fontSizeAdjustment: 1,
				url: '',
				scale: 0.5,
				textLastEditedBy: null,
			},
		} as TLShape)
	},
})

export const classroomCommands = defineCommandSet<TLRecord>({
	commands: [...commentCommands, ...pageCommands, voteToggle, agentAddNote],
	// [3] The edit lane: drags, drawing, text. Students edit their own shapes, and may draw inside
	// a frame the teacher assigned to them.
	edit: createOwnedShapesPolicy({
		canUseParent: (actor, parent) =>
			getShapeOwner(parent) === actor.userId || parent.meta.assignee === actor.userId,
	}),
	// [4] The read side. A page with readers set by pages.setReaders is only for them (and for
	// whoever manages pages). Its shapes, bindings, comments, and cursors follow it.
	read: createPageReadPolicy(),
})

// [5] Roles are lists of permissions. The host picks one per session, for example from a share
// link or a class roster, and can change it while the session is open.
export const ROLES = {
	teacher: ['*'],
	student: [P.read, P.edit, P.writeComments, 'votes:cast'],
	mutedStudent: [P.read, P.writeComments, 'votes:cast'],
	commenter: [P.read, P.writeComments],
	noAccess: [],
	agent: [P.read, 'agent:notes'],
} satisfies Record<string, string[]>

export function actor(userId: string, role: keyof typeof ROLES): TLCommandActor {
	return { userId, permissions: ROLES[role] }
}
