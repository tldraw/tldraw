import './comments.css'

export interface SendButtonProps {
	label: string
	disabled?: boolean
}

/** The pill button that posts a comment. */
export function SendButton({ label, disabled }: SendButtonProps) {
	return (
		<button className="cmt-send" type="button" disabled={disabled}>
			{label}
		</button>
	)
}
