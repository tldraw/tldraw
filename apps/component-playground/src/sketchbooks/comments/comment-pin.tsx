import './comments.css'

export interface CommentPinProps {
	number: number
	resolved: boolean
}

/** A canvas comment marker: a numbered pin, or a check when resolved. */
export function CommentPin({ number, resolved }: CommentPinProps) {
	return (
		<div className={resolved ? 'cmt-pin cmt-pin--resolved' : 'cmt-pin'}>
			{resolved ? '✓' : number}
		</div>
	)
}
