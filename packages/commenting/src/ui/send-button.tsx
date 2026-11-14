import { TldrawUiIcon } from 'tldraw'

/** @public */
export interface SendButtonProps {
	/** The button's accessible name (e.g. "Send"). Shown as an up-arrow icon, so this is its label. */
	label: string
	disabled?: boolean
	onClick?(): void
}

/** The button that posts a comment — an up arrow. @public @react */
export function SendButton({ label, disabled, onClick }: SendButtonProps) {
	return (
		<button
			className="tlui-cmt-send"
			type="button"
			disabled={disabled}
			onClick={onClick}
			aria-label={label}
			title={label}
		>
			<TldrawUiIcon icon="arrow-up" label="" aria-hidden="true" small />
		</button>
	)
}
