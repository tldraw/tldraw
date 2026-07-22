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
import { useCommentingOptions } from './options'
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
 * reacted with (the pills render those highlighted), and `reactors` lists who reacted with it, in
 * reaction order, for the hover list. `resolveName` names each reactor; an id it can't name falls
 * back to the id itself.
 *
 * @public
 */
export function summarizeReactions(
	reactions: TLCommentReaction[],
	currentUserId?: string | null,
	resolveName?: (userId: string) => string | undefined
): ReactionSummary[] {
	const groups = new Map<
		string,
		{ count: number; active: boolean; firstAt: number; reactors: ReactionSummary['reactors'] }
	>()
	for (const reaction of reactions) {
		const mine = currentUserId != null && reaction.userId === currentUserId
		const reactor = { name: resolveName?.(reaction.userId) ?? reaction.userId, you: mine }
		const group = groups.get(reaction.emoji)
		if (group) {
			group.count++
			group.active ||= mine
			group.firstAt = Math.min(group.firstAt, reaction.createdAt)
			group.reactors.push(reactor)
		} else {
			groups.set(reaction.emoji, {
				count: 1,
				active: mine,
				firstAt: reaction.createdAt,
				reactors: [reactor],
			})
		}
	}
	return [...groups]
		.sort(([, a], [, b]) => a.firstAt - b.firstAt)
		.map(([emoji, group]) => ({
			emoji,
			count: group.count,
			active: group.active,
			reactors: group.reactors,
		}))
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
	/** Names a reactor id for the hover list. Ids it can't name fall back to the id. */
	resolveName?(userId: string): string | undefined
}

/**
 * The tallied reaction row under one comment. Pair with `CommentReactionPicker`, which is what
 * adds a reaction. Whether the current user shows up in a pill's hover list is read from the
 * `showSelfInReactionList` commenting option.
 * @public @react
 */
export function CommentReactions({ comment, currentUserId, resolveName }: CommentReactionsProps) {
	const editor = useEditor()
	const { showSelfInReactionList } = useCommentingOptions()
	const reactions = useCommentReactions(editor, comment.id)
	const summaries = useMemo(
		() => summarizeReactions(reactions, currentUserId, resolveName),
		[reactions, currentUserId, resolveName]
	)
	return (
		<Reactions
			reactions={summaries}
			canReact={currentUserId != null}
			showSelf={showSelfInReactionList}
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
