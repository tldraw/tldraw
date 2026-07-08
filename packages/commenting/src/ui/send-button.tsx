import './comments.css'

export interface SendButtonProps {
	label: string
	disabled?: boolean
	onClick?(): void
}

/** The button that posts a comment. */
export function SendButton({ label, disabled, onClick }: SendButtonProps) {
	return (
		<button className="cmt-send" type="button" disabled={disabled} onClick={onClick}>
			{label}
		</button>
	)
}
