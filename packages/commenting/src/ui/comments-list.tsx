import { Avatar, type CommentAuthor } from '@tldraw/mentions'
import { Fragment, MouseEvent, ReactNode } from 'react'
import { useTranslation } from 'tldraw'
import { Byline } from './byline'
import { CheckIcon } from './icons'
import { Reactions, type ReactionSummary } from './reactions'
import { replyCountLabel } from './reply-count'

/** @public */
export interface CommentListItemProps {
	id: string
	author: CommentAuthor
	/** A short preview of the thread — e.g. the first comment's body. */
	preview: ReactNode
	/** ISO datetime of the thread's first comment. */
	date: string
	resolved?: boolean
	/** Name of the page the thread lives on, shown as a small label. Omit to hide. */
	page?: string
	/** Total comments in the thread. */
	count?: number
	/** Whether this thread is the open one. */
	selected?: boolean
	/** Tallied reactions for the row (a thread's, or a single comment's when the row is one
	 *  comment), shown as inert pills under the preview. Omit to hide. */
	reactions?: ReactionSummary[]
	/**
	 * Link target for the item. When set, the row renders as an anchor so browser affordances
	 * (ctrl/cmd-click, middle-click) open it in a new tab; a plain click still calls `onSelect`.
	 */
	href?: string
}

/**
 * What a row is rendered with: the item, plus the list-level wiring it needs to be interactive.
 * A custom row gets the same props the default `<CommentListItem>` does, so it can wrap the
 * default rather than reimplement it.
 *
 * @public
 */
export interface CommentListItemRenderProps extends CommentListItemProps {
	/** Label for a resolved thread's marker on its row. */
	resolvedLabel?: string
	/** Called with the thread id when the row is chosen. */
	onSelect?(id: string): void
}

/** @public */
export interface CommentsListProps {
	items: CommentListItemProps[]
	/** Called with a thread id when an item is chosen. */
	onSelect?(id: string): void
	/** Shown above the list (e.g. "Comments"). Omit for none. */
	header?: ReactNode
	/** Rendered at the right of the header row — e.g. a filter menu. */
	headerAction?: ReactNode
	/** Shown in place of the list when there are no threads. */
	empty?: ReactNode
	/** Label for a resolved thread's marker on its row. Defaults to "Resolved". */
	resolvedLabel?: string
	/**
	 * Override how each item renders. Defaults to `<CommentListItem>`, which is exported — so a
	 * row that only adds something can spread these props into it rather than start over. The list
	 * supplies the key, so a custom row doesn't need one.
	 */
	renderItem?(props: CommentListItemRenderProps): ReactNode
}

/**
 * A scrollable list of comment threads — each an avatar, byline, and a one-line preview.
 * Presentational: you supply the items (already summarised) and an `onSelect` handler; the canvas
 * `CanvasCommentsSidebar` wires it to the store, but a consumer can build their own list from this.
 * @public @react
 */
export function CommentsList({
	items,
	onSelect,
	header,
	headerAction,
	empty,
	resolvedLabel,
	renderItem,
}: CommentsListProps) {
	return (
		<div className="tlui-cmt-list">
			{(header !== undefined || headerAction) && (
				<div className="tlui-cmt-list__header">
					{header !== undefined && <span className="tlui-cmt-list__header-title">{header}</span>}
					{headerAction}
				</div>
			)}
			{items.length === 0 ? (
				<div className="tlui-cmt-list__empty">{empty}</div>
			) : (
				<div className="tlui-cmt-list__items">
					{items.map((item) => {
						const props: CommentListItemRenderProps = { ...item, resolvedLabel, onSelect }
						// A custom row is wrapped rather than keyed directly: it's the consumer's element,
						// and requiring them to remember a key is the kind of thing that only shows up as a
						// console warning in someone else's app.
						return renderItem ? (
							<Fragment key={item.id}>{renderItem(props)}</Fragment>
						) : (
							<CommentListItem key={item.id} {...props} />
						)
					})}
				</div>
			)}
		</div>
	)
}

/** One thread's row in a {@link CommentsList}. @public @react */
export function CommentListItem({
	id,
	author,
	preview,
	date,
	resolved,
	page,
	count,
	selected,
	reactions,
	href,
	resolvedLabel = 'Resolved',
	onSelect,
}: CommentListItemRenderProps) {
	const msg = useTranslation()
	const handleClick = (e: MouseEvent) => {
		if (href && isOpenInNewTabClick(e)) return
		e.preventDefault()
		if (onSelect) onSelect(id)
	}
	const Tag = href ? 'a' : 'button'
	// `count` is the thread's total comments; a reply is every comment after the opening one.
	const replies = count !== undefined ? replyCountLabel(msg, count - 1) : null
	return (
		<Tag
			{...(href ? { href } : { type: 'button' })}
			className={
				selected ? 'tlui-cmt-list__item tlui-cmt-list__item--selected' : 'tlui-cmt-list__item'
			}
			data-resolved={resolved || undefined}
			onClick={handleClick}
		>
			<Avatar author={author} />
			<div className="tlui-cmt-list__item-body">
				<Byline author={author} date={date} />
				<div className="tlui-cmt-list__item-preview">{preview}</div>
				{reactions && <Reactions reactions={reactions} canReact={false} enableHoverList={false} />}
				{(resolved || page !== undefined || replies) && (
					<div className="tlui-cmt-list__item-meta">
						{resolved && (
							<span className="tlui-cmt-list__item-resolved">
								<CheckIcon />
								{resolvedLabel}
							</span>
						)}
						{page !== undefined && <span className="tlui-cmt-list__item-page">{page}</span>}
						{replies && <span className="tlui-cmt-list__item-replies">{replies}</span>}
					</div>
				)}
			</div>
		</Tag>
	)
}

/**
 * Whether a click should be left to the browser's link handling (new tab, new window, or download).
 * @public
 */
export function isOpenInNewTabClick(e: MouseEvent) {
	return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0
}
