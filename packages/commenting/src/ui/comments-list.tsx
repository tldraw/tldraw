import { Avatar, type CommentAuthor } from '@tldraw/mentions'
import { ReactNode } from 'react'
import { Byline } from './byline'

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
	/** Override how each item renders. Defaults to `<CommentListItem>`. */
	renderItem?(item: CommentListItemProps): ReactNode
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
					{items.map((item) =>
						renderItem ? (
							renderItem(item)
						) : (
							<CommentListItem
								key={item.id}
								{...item}
								resolvedLabel={resolvedLabel}
								onSelect={onSelect}
							/>
						)
					)}
				</div>
			)}
		</div>
	)
}

function CommentListItem({
	id,
	author,
	preview,
	date,
	resolved,
	page,
	count,
	selected,
	resolvedLabel = 'Resolved',
	onSelect,
}: CommentListItemProps & { resolvedLabel?: string; onSelect?(id: string): void }) {
	const handleClick = () => {
		if (onSelect) onSelect(id)
	}
	return (
		<button
			type="button"
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
				{(resolved || page !== undefined) && (
					<div className="tlui-cmt-list__item-meta">
						{resolved && (
							<span className="tlui-cmt-list__item-resolved">
								<CheckIcon />
								{resolvedLabel}
							</span>
						)}
						{page !== undefined && <span className="tlui-cmt-list__item-page">{page}</span>}
					</div>
				)}
			</div>
			{count !== undefined && count > 1 && (
				<span className="tlui-cmt-list__item-count">{count}</span>
			)}
		</button>
	)
}

function CheckIcon() {
	return (
		<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
			<path
				d="M2.5 6.2 4.7 8.4 9.5 3.6"
				stroke="currentColor"
				strokeWidth="1.5"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	)
}
