/* eslint-disable tldraw/jsx-no-literals */
import { ReactNode } from 'react'
import { Avatar } from './avatar'
import { Byline } from './byline'
import './comments.css'

export interface CommentListItemProps {
	id: string
	author: string
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
	/** Override how each item renders. Defaults to `<CommentListItem>`. */
	renderItem?(item: CommentListItemProps): ReactNode
}

/**
 * A scrollable list of comment threads — each an avatar, byline, and a one-line preview.
 * Presentational: you supply the items (already summarised) and an `onSelect` handler; the canvas
 * `CanvasCommentsSidebar` wires it to the store, but a consumer can build their own list from this.
 */
export function CommentsList({
	items,
	onSelect,
	header,
	headerAction,
	empty,
	renderItem,
}: CommentsListProps) {
	return (
		<div className="cmt-list">
			{(header !== undefined || headerAction) && (
				<div className="cmt-list__header">
					{header !== undefined && <span className="cmt-list__header-title">{header}</span>}
					{headerAction}
				</div>
			)}
			{items.length === 0 ? (
				<div className="cmt-list__empty">{empty}</div>
			) : (
				<div className="cmt-list__items">
					{items.map((item) =>
						renderItem ? (
							renderItem(item)
						) : (
							<CommentListItem key={item.id} {...item} onSelect={onSelect} />
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
	onSelect,
}: CommentListItemProps & { onSelect?(id: string): void }) {
	const handleClick = () => {
		if (onSelect) onSelect(id)
	}
	return (
		<button
			type="button"
			className={selected ? 'cmt-list__item cmt-list__item--selected' : 'cmt-list__item'}
			data-resolved={resolved || undefined}
			onClick={handleClick}
		>
			<Avatar name={author} />
			<div className="cmt-list__item-body">
				<Byline author={author} date={date} />
				<div className="cmt-list__item-preview">{preview}</div>
				{(resolved || page !== undefined) && (
					<div className="cmt-list__item-meta">
						{resolved && (
							<span className="cmt-list__item-resolved">
								<CheckIcon />
								Resolved
							</span>
						)}
						{page !== undefined && <span className="cmt-list__item-page">{page}</span>}
					</div>
				)}
			</div>
			{count !== undefined && count > 1 && <span className="cmt-list__item-count">{count}</span>}
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
