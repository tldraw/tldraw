import './comments.css'

export interface EmptyStateProps {
	message: string
}

/** The empty state shown when a thread has no comments yet. */
export function EmptyState({ message }: EmptyStateProps) {
	return (
		<div className="cmt-empty">
			<div className="cmt-empty__icon" aria-hidden="true">
				💬
			</div>
			<p className="cmt-empty__message">{message}</p>
		</div>
	)
}
