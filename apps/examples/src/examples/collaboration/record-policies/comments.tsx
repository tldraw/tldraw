import {
	CanvasComments,
	CommentAuthor,
	CommentTool,
	CommentingContext,
	commentToolOverrides,
	putCommentRecords,
} from '@tldraw/commenting'
import '@tldraw/commenting/commenting.css'
import {
	commentSchemaRecords,
	createComment,
	createCommentId,
	createCommentThread,
	createCommentThreadId,
	toRichText,
} from 'tldraw'
import { Person, Scenario } from './scenario'

const COLORS: Record<string, string> = { ann: '#EC5E41', ben: '#4465E9', mo: '#0E9F6E' }

// The comment records bring their own policies (tlschema `commentPolicy` and friends), so the
// host adds no rules. `comments:write` comments in your own name; `comments:manage` deletes any
// comment but edits none. The comment UI asks the same policies through `editor.can`.
export const comments: Scenario = {
	id: 'comments',
	title: 'Comments',
	rules:
		'Ann and Ben comment, and change or delete only their own comments. Mo moderates: Mo deletes any comment but cannot edit someone else’s text. Nobody here edits the canvas.',
	tryThis:
		'Open Ann’s thread as Ben: no edit or delete. Open it as Mo: delete, but no edit. Reply and react as anyone.',
	people: [
		{ id: 'ann', name: 'Ann', role: 'commenter', actions: ['comments:write'] },
		{ id: 'ben', name: 'Ben', role: 'commenter', actions: ['comments:write'] },
		{
			id: 'mo',
			name: 'Mo',
			role: 'moderator',
			actions: ['comments:write', 'comments:manage'],
		},
	],
	policies: {},
	records: commentSchemaRecords,
	// Each commenter starts one thread in their own name.
	seed(editor, person) {
		if (person.id === 'mo') return
		const threadId = createCommentThreadId(person.id)
		if (editor.store.get(threadId as any)) return
		const pageId = editor.getCurrentPageId()
		const x = person.id === 'ann' ? 100 : 400
		putCommentRecords(editor, [
			{
				...createCommentThread({
					pageId,
					anchor: { type: 'point', x, y: 120 },
					createdBy: person.id,
				}),
				id: threadId,
			},
			{
				...createComment({
					threadId,
					pageId,
					authorId: person.id,
					body: toRichText(`${person.name}’s first comment.`),
				}),
				id: createCommentId(person.id),
			},
		])
	},
	tldrawProps(person, scenario) {
		const commenting = commentingContext(person, scenario)
		return {
			tools: [
				CommentTool.configure({
					canComment: ({ editor }) => editor.getActor()?.can('comments:write') ?? true,
					// The comment policies define `edit` and `delete` actions for the UI.
					canModifyComment: (ctx) =>
						ctx.editor.can({
							verb: 'action',
							action: ctx.action === 'edit-comment' ? 'edit' : 'delete',
							record: (ctx.action === 'delete-thread' ? ctx.thread : ctx.comment) as any,
						}),
				}),
			],
			overrides: [commentToolOverrides],
			components: { InFrontOfTheCanvas: () => <CanvasComments {...commenting} /> },
			initialState: 'comment',
		}
	},
}

function commentingContext(person: Person, scenario: Scenario): CommentingContext {
	return {
		currentUserId: person.id,
		resolveAuthor: (id): CommentAuthor | undefined => {
			const author = scenario.people.find((p) => p.id === id)
			return author && { name: author.name, color: COLORS[id] }
		},
	}
}
