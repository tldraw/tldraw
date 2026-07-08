import './comments.css'

/** @public */
export interface SendButtonProps {
	label: string
	disabled?: boolean
	onClick?(): void
}

/**
 * The pill button that posts a comment.
 * @public
 * @react
 */
export function SendButton({ label, disabled, onClick }: SendButtonProps) {
	return (
		<button className="cmt-send" type="button" disabled={disabled} onClick={onClick}>
			{label}
		</button>
	)
}
