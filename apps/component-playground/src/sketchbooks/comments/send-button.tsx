import './comments.css'

export interface SendButtonProps {
	label: string
}

/** The pill button that posts a comment. */
export function SendButton({ label }: SendButtonProps) {
	return (
		<button className="cmt-send" type="button">
			{label}
		</button>
	)
}
