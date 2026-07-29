import { type CommentAuthor, type MentionMember } from '@tldraw/mentions'
import { createContext, type ReactNode, useContext, useMemo } from 'react'
import { type TLComment, type TLCommentId } from 'tldraw'

/**
 * The live, host-supplied half of commenting: who the viewer is, how author ids become names, read
 * status, and the mention roster. (The static half is {@link CommentingOptions}, configured once on
 * the tool.)
 *
 * Every commenting surface reads the same set, so a host that mounts more than one — `CanvasComments`
 * and `CanvasCommentsSidebar`, say — supplies it once through {@link CommentingProvider} instead of
 * threading the same props through each. A surface's own props still win over the provider, for the
 * cases where one surface differs: a session that may read comments but not write them can pass
 * `currentUserId={null}` to the overlay while the provider keeps the real id for the sidebar's
 * "only your threads" filter.
 *
 * @public
 */
export interface CommentingContext {
	/** The signed-in user's id, or null for a read-only viewer. Only a signed-in user composes. */
	currentUserId: string | null
	/** Map an author id to their display info, or `undefined` when the id can't be resolved. */
	resolveAuthor(id: string): CommentAuthor | undefined
	/** Called after any comment (a new thread's first comment, or a reply) is posted. */
	onPostComment?(comment: TLComment): void
	/** Whether a comment is unread for the current user (return true for unread). */
	isCommentUnread?(commentId: TLCommentId): boolean
	/**
	 * Called for each unread comment shown to the user in an open thread popover, so hosts can
	 * record a read receipt. Needs `isCommentUnread` to know what's unread.
	 */
	onCommentRead?(commentId: TLCommentId): void
	/** Resolve the members matching an `@`-query in the composers (sync or async). */
	getMentionSuggestions?(query: string): MentionMember[] | Promise<MentionMember[]>
	/** Override a mention-picker row's content. */
	renderMentionSuggestion?(member: MentionMember): ReactNode
}

/** No host wiring at all: a read-only viewer whose author ids resolve to nothing (bylines fall back
 *  to the unknown-author default). What a surface mounted outside a provider, with no props of its
 *  own, gets. */
const DEFAULT_COMMENTING_CONTEXT: CommentingContext = {
	currentUserId: null,
	resolveAuthor: () => undefined,
}

const commentingContext = createContext<CommentingContext>(DEFAULT_COMMENTING_CONTEXT)

/** @public */
export interface CommentingProviderProps extends Partial<CommentingContext> {
	children: ReactNode
}

/**
 * Supplies the {@link CommentingContext} to every commenting surface beneath it, so hosts wire the
 * viewer up once rather than per surface. Providers nest: an inner one inherits the fields it
 * doesn't set.
 *
 * @example
 * ```tsx
 * <CommentingProvider currentUserId={userId} resolveAuthor={resolveAuthor}>
 * 	<CanvasComments />
 * 	<CanvasCommentsSidebar />
 * </CommentingProvider>
 * ```
 *
 * @public @react
 */
export function CommentingProvider({ children, ...identity }: CommentingProviderProps) {
	const value = useCommentingContext(identity)
	return <commentingContext.Provider value={value}>{children}</commentingContext.Provider>
}

/**
 * The {@link CommentingContext} in force: `overrides` where given, the enclosing
 * {@link CommentingProvider} where not, and read-only defaults where neither. Useful when building
 * a commenting surface of your own out of the parts.
 *
 * A field left `undefined` inherits; `currentUserId: null` is a value, not an omission, so a
 * surface can turn composing off without disturbing what the rest of the app sees.
 *
 * @public
 */
export function useCommentingContext(
	overrides: Partial<CommentingContext> = {}
): CommentingContext {
	const inherited = useContext(commentingContext)
	const {
		currentUserId,
		resolveAuthor,
		onPostComment,
		isCommentUnread,
		onCommentRead,
		getMentionSuggestions,
		renderMentionSuggestion,
	} = overrides
	return useMemo(
		() =>
			mergeCommentingContext(inherited, {
				currentUserId,
				resolveAuthor,
				onPostComment,
				isCommentUnread,
				onCommentRead,
				getMentionSuggestions,
				renderMentionSuggestion,
			}),
		// Field by field, so an inline `{...}` prop object doesn't rebuild the context every render.
		[
			inherited,
			currentUserId,
			resolveAuthor,
			onPostComment,
			isCommentUnread,
			onCommentRead,
			getMentionSuggestions,
			renderMentionSuggestion,
		]
	)
}

/**
 * Lay `overrides` over `inherited`. A field left `undefined` inherits — including `currentUserId`,
 * where `null` has to stay distinguishable from unset: null is a read-only viewer (an answer), while
 * undefined is "ask the provider" (no answer).
 */
export function mergeCommentingContext(
	inherited: CommentingContext,
	overrides: Partial<CommentingContext>
): CommentingContext {
	return {
		currentUserId:
			overrides.currentUserId !== undefined ? overrides.currentUserId : inherited.currentUserId,
		resolveAuthor: overrides.resolveAuthor ?? inherited.resolveAuthor,
		onPostComment: overrides.onPostComment ?? inherited.onPostComment,
		isCommentUnread: overrides.isCommentUnread ?? inherited.isCommentUnread,
		onCommentRead: overrides.onCommentRead ?? inherited.onCommentRead,
		getMentionSuggestions: overrides.getMentionSuggestions ?? inherited.getMentionSuggestions,
		renderMentionSuggestion: overrides.renderMentionSuggestion ?? inherited.renderMentionSuggestion,
	}
}
