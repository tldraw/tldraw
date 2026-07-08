import { ReactNode } from 'react'
import { Avatar } from './avatar'
import { Byline } from './byline'

/** @public */
export interface CommentListItemProps {
	id: string
	author: string
	/** A short preview of the thread — e.g. the first comment's body. */
	preview: ReactNode
	/** ISO datetime of the thread's first comment. */
	date: string
	resolved?: boolean
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
	/** Shown in place of the list when there are no threads. */
	empty?: ReactNode
	/** Override how each item renders. Defaults to `<CommentListItem>`. */
	renderItem?(item: CommentListItemProps): ReactNode
}

/**
 * A scrollable list of comment threads — each an avatar, byline, and a one-line preview.
 * Presentational: you supply the items (already summarised) and an `onSelect` handler; the canvas
 * `CanvasCommentsSidebar` wires it to the store, but a consumer can build their own list from this.
 * @public
 * @react
 */
export function CommentsList({ items, onSelect, header, empty, renderItem }: CommentsListProps) {
	return (
		<div className="cmt-list">
			{header !== undefined && <div className="cmt-list__header">{header}</div>}
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
			</div>
			{count !== undefined && count > 1 && <span className="cmt-list__item-count">{count}</span>}
		</button>
	)
}
