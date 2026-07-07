import './comments.css'

export interface CommentPinProps {
	number: number
	resolved: boolean
	/** The pin's thread is open — shows the active/selected indicator state. */
	open?: boolean
}

/** A canvas comment marker: a numbered pin, or a check when resolved. Reflects its own
 * open and resolved state; hover is handled in CSS. */
export function CommentPin({ number, resolved, open }: CommentPinProps) {
	const className = ['cmt-pin', resolved && 'cmt-pin--resolved', open && 'cmt-pin--open']
		.filter(Boolean)
		.join(' ')
	return <div className={className}>{resolved ? '✓' : number}</div>
}
