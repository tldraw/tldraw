import { useMemo } from 'react'
import { Editor, TLComment, TLCommentReactions, TLCommentThread, useEditor } from 'tldraw'
import { ReactionPicker } from '../ui/reaction-picker'
import { Reactions, ReactionSummary } from '../ui/reactions'
import { putCommentRecords } from './comment-store'
import { commitCommentMutation } from './state'

/**
 * Tally one comment's reactions into an entry per emoji, ordered by when that emoji was first used
 * so the row stays stable as later reactions arrive. `active` marks the emoji the current user
 * reacted with — the pills render those highlighted.
 *
 * Reads the thread's map rather than the comment: see `TLCommentReactions` for why reactions live
 * on the thread. A comment with no entry (nobody has reacted, or the key is stale) tallies to
 * nothing.
 *
 * @public
 */
export function summarizeReactions(
	reactions: TLCommentReactions | null,
	commentId: string,
	currentUserId?: string | null
): ReactionSummary[] {
	const forComment = reactions?.[commentId]
	if (!forComment) return []
	const groups = new Map<string, { count: number; active: boolean; firstAt: number }>()
	for (const [userId, reaction] of Object.entries(forComment)) {
		const mine = currentUserId != null && userId === currentUserId
		const group = groups.get(reaction.emoji)
		if (group) {
			group.count++
			group.active ||= mine
			group.firstAt = Math.min(group.firstAt, reaction.createdAt)
		} else {
			groups.set(reaction.emoji, { count: 1, active: mine, firstAt: reaction.createdAt })
		}
	}
	return [...groups]
		.sort(([, a], [, b]) => a.firstAt - b.firstAt)
		.map(([emoji, group]) => ({ emoji, count: group.count, active: group.active }))
}

/**
 * The thread reaction map that results from one user picking `emoji` on one comment.
 *
 * A user holds at most one reaction per comment — that's the shape, not a rule enforced here — so
 * picking a different emoji replaces theirs, and picking the one they already have clears it.
 * Only that user's key is touched, which is what the sync server's authorizer requires and what
 * lets concurrent reactions from different people merge.
 *
 * Empty objects are pruned as they empty out, down to null for the whole map, so "nobody has
 * reacted" stays a single state rather than a litter of empty containers.
 */
export function nextThreadReactions(
	reactions: TLCommentReactions | null,
	commentId: string,
	userId: string,
	emoji: string,
	now: number
): TLCommentReactions | null {
	const forComment = { ...(reactions?.[commentId] ?? {}) }
	if (forComment[userId]?.emoji === emoji) {
		delete forComment[userId]
	} else {
		forComment[userId] = { emoji, createdAt: now }
	}
	const next = { ...(reactions ?? {}) }
	if (Object.keys(forComment).length > 0) {
		next[commentId] = forComment
	} else {
		delete next[commentId]
	}
	return Object.keys(next).length > 0 ? next : null
}

/**
 * Set or clear one user's reaction to a comment, writing the updated **thread** record.
 *
 * @public
 */
export function toggleCommentReaction(
	editor: Editor,
	thread: TLCommentThread,
	commentId: string,
	userId: string,
	emoji: string,
	now = Date.now()
): void {
	const reactions = nextThreadReactions(thread.reactions, commentId, userId, emoji, now)
	commitCommentMutation(editor, () => {
		putCommentRecords(editor, [{ ...thread, reactions }])
	})
}

/** @public */
export interface CommentReactionsProps {
	thread: TLCommentThread
	comment: TLComment
	/** The reacting user. Null/omitted gives a read-only row (signed out): counts show, but the
	 *  pills don't toggle. */
	currentUserId?: string | null
}

/**
 * The tallied reaction row under one comment. Pair with `CommentReactionPicker`, which is what
 * adds a reaction.
 * @public @react
 */
export function CommentReactions({ thread, comment, currentUserId }: CommentReactionsProps) {
	const editor = useEditor()
	const reactions = useMemo(
		() => summarizeReactions(thread.reactions, comment.id, currentUserId),
		[thread.reactions, comment.id, currentUserId]
	)
	return (
		<Reactions
			reactions={reactions}
			canReact={currentUserId != null}
			onToggle={(value) => {
				if (currentUserId == null) return
				toggleCommentReaction(editor, thread, comment.id, currentUserId, value)
			}}
		/>
	)
}

/** @public */
export interface CommentReactionPickerProps {
	thread: TLCommentThread
	comment: TLComment
	/** The reacting user. Null/omitted renders nothing — there's nobody to react as. */
	currentUserId?: string | null
	/** The emoji the picker offers. Defaults to `DEFAULT_REACTION_EMOJI`. */
	emoji?: string[]
}

/**
 * The add-reaction button for one comment. Belongs with the comment card's hover actions (under
 * the ⋯ button) rather than in the reaction row, so opening it doesn't chase the row as reactions
 * are added.
 * @public @react
 */
export function CommentReactionPicker({
	thread,
	comment,
	currentUserId,
	emoji,
}: CommentReactionPickerProps) {
	const editor = useEditor()
	const mine = currentUserId != null ? thread.reactions?.[comment.id]?.[currentUserId] : undefined
	const selected = useMemo(() => (mine ? [mine.emoji] : []), [mine])
	if (currentUserId == null) return null
	return (
		<ReactionPicker
			emoji={emoji}
			selected={selected}
			// keyed by comment id so each picker opens independently of its thread siblings
			menuId={`comment-reactions-${comment.id}`}
			onSelect={(value) => toggleCommentReaction(editor, thread, comment.id, currentUserId, value)}
		/>
	)
}
