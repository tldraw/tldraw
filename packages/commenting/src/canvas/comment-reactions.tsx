import { useMemo } from 'react'
import {
	Editor,
	TLComment,
	TLCommentReaction,
	createCommentReaction,
	createCommentReactionId,
	useEditor,
	useValue,
} from 'tldraw'
import { ReactionPicker } from '../ui/reaction-picker'
import { Reactions, ReactionSummary } from '../ui/reactions'
import { getCommentReactions, putCommentRecords, removeCommentRecords } from './comment-store'
import { commitCommentMutation } from './state'

/**
 * One comment's reactions, oldest first, reactively.
 *
 * @public
 */
export function useCommentReactions(
	editor: Editor,
	commentId: TLComment['id']
): TLCommentReaction[] {
	return useValue(
		'comment reactions',
		() =>
			getCommentReactions(editor)
				.filter((reaction) => reaction.commentId === commentId)
				.sort((a, b) => a.createdAt - b.createdAt),
		[editor, commentId]
	)
}

/**
 * Tally a comment's reactions into an entry per emoji, ordered by when that emoji was first used
 * so the row stays stable as later reactions arrive. `active` marks the emoji the current user
 * reacted with — the pills render those highlighted.
 *
 * @public
 */
export function summarizeReactions(
	reactions: TLCommentReaction[],
	currentUserId?: string | null
): ReactionSummary[] {
	const groups = new Map<string, { count: number; active: boolean; firstAt: number }>()
	for (const reaction of reactions) {
		const mine = currentUserId != null && reaction.userId === currentUserId
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
 * Set or clear one user's reaction to a comment.
 *
 * The record id is derived from the comment and user, so this is always a write to that one user's
 * own record: picking a different emoji overwrites it, and picking the same one again removes it.
 * Nobody else's reaction is touched, which is why two people reacting at once don't conflict.
 *
 * @public
 */
export function toggleCommentReaction(
	editor: Editor,
	comment: TLComment,
	userId: string,
	emoji: string,
	now = Date.now()
): void {
	const id = createCommentReactionId(comment.id, userId)
	const existing = getCommentReactions(editor).find((reaction) => reaction.id === id)
	commitCommentMutation(editor, () => {
		if (existing?.emoji === emoji) {
			removeCommentRecords(editor, [id])
			return
		}
		putCommentRecords(editor, [
			createCommentReaction({
				commentId: comment.id,
				threadId: comment.threadId,
				pageId: comment.pageId,
				userId,
				emoji,
				now,
			}),
		])
	})
}

/** @public */
export interface CommentReactionsProps {
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
export function CommentReactions({ comment, currentUserId }: CommentReactionsProps) {
	const editor = useEditor()
	const reactions = useCommentReactions(editor, comment.id)
	const summaries = useMemo(
		() => summarizeReactions(reactions, currentUserId),
		[reactions, currentUserId]
	)
	return (
		<Reactions
			reactions={summaries}
			canReact={currentUserId != null}
			onToggle={(value) => {
				if (currentUserId == null) return
				toggleCommentReaction(editor, comment, currentUserId, value)
			}}
		/>
	)
}

/** @public */
export interface CommentReactionPickerProps {
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
	comment,
	currentUserId,
	emoji,
}: CommentReactionPickerProps) {
	const editor = useEditor()
	const reactions = useCommentReactions(editor, comment.id)
	const selected = useMemo(
		() =>
			reactions
				.filter((reaction) => currentUserId != null && reaction.userId === currentUserId)
				.map((reaction) => reaction.emoji),
		[reactions, currentUserId]
	)
	if (currentUserId == null) return null
	return (
		<ReactionPicker
			emoji={emoji}
			selected={selected}
			menuId={`comment-reactions-${comment.id}`}
			onSelect={(value) => toggleCommentReaction(editor, comment, currentUserId, value)}
		/>
	)
}
