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
import { RenderReaction } from '../ui/reaction'
import { ReactionPicker } from '../ui/reaction-picker'
import { Reactions, ReactionSummary } from '../ui/reactions'
import { UNKNOWN_AUTHOR } from './comment-render'
import { getCommentReactions, putCommentRecords, removeCommentRecords } from './comment-store'
import { getCommentingOptions, useCommentingOptions } from './options'
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
		// Fall back to a generic name, never the raw user id, when the id can't be resolved.
		const reactor = { name: resolveName?.(reaction.userId) ?? UNKNOWN_AUTHOR, you: mine }
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
 * Toggle one user's reaction with a given emoji on a comment.
 *
 * Each reaction is its own record keyed by (comment, user, emoji), so this only ever touches that
 * one user's own records — two people reacting at once never conflict. Behaviour depends on the
 * `allowMultipleReactions` option:
 *
 * - **multiple** (default): the emoji toggles independently — add it if absent, remove it if
 *   present, leaving the user's other reactions alone.
 * - **single**: picking a new emoji first removes the user's existing reaction(s) on the comment,
 *   then adds this one (a replace); picking the one they already have removes it.
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
	const { allowMultipleReactions, isAllowedReaction } = getCommentingOptions(editor)
	const targetId = createCommentReactionId(comment.id, userId, emoji)
	const mine = getCommentReactions(editor).filter(
		(reaction) => reaction.commentId === comment.id && reaction.userId === userId
	)
	const removing = mine.some((reaction) => reaction.id === targetId)
	// Only a token the configured palette allows may be added. Removals always go through — if a
	// reaction somehow carries an off-palette token, the user must still be able to clear it.
	if (!removing && !isAllowedReaction(emoji)) return
	commitCommentMutation(editor, () => {
		if (removing) {
			removeCommentRecords(editor, [targetId])
			return
		}
		// Single-select: a new emoji replaces the user's existing reaction(s) on this comment.
		if (!allowMultipleReactions && mine.length > 0) {
			removeCommentRecords(
				editor,
				mine.map((reaction) => reaction.id)
			)
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
 * Adapts the `ReactionContent` component override (if any) into a `renderReaction` function for the
 * presentational reaction components. Returns undefined when no override is set, so they fall back
 * to the default (the token string, drawn by the OS emoji font).
 */
function useReactionRenderer(): RenderReaction | undefined {
	const { components } = useCommentingOptions()
	const ReactionContent = components.ReactionContent
	return useMemo(
		() => (ReactionContent ? (token: string) => <ReactionContent token={token} /> : undefined),
		[ReactionContent]
	)
}

/**
 * The tallied reaction row under one comment. Pair with `CommentReactionPicker`, which is what
 * adds a reaction.
 * @public @react
 */
export function CommentReactions({ comment, currentUserId, resolveName }: CommentReactionsProps) {
	const editor = useEditor()
	const renderReaction = useReactionRenderer()
	const { components } = useCommentingOptions()
	const reactions = useCommentReactions(editor, comment.id)
	const summaries = useMemo(
		() => summarizeReactions(reactions, currentUserId, resolveName),
		[reactions, currentUserId, resolveName]
	)
	// Suppress the hover list while any menu is open (the reaction picker, an overflow menu…) so it
	// doesn't compete with the menu the user is actually working in. Edit mode already hides the
	// pills entirely (the card becomes a composer), so it needs no special case here.
	const anyMenuOpen = useValue('any menu open', () => editor.menus.getOpenMenus().length > 0, [
		editor,
	])
	return (
		<Reactions
			reactions={summaries}
			canReact={currentUserId != null}
			enableHoverList={!anyMenuOpen}
			renderReaction={renderReaction}
			ReactionTooltip={components.ReactionTooltip}
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
	const { components } = useCommentingOptions()
	const renderReaction = useReactionRenderer()
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
			renderReaction={renderReaction}
			palette={components.ReactionPalette}
			menuId={`comment-reactions-${comment.id}`}
			onSelect={(value) => toggleCommentReaction(editor, comment, currentUserId, value)}
		/>
	)
}
