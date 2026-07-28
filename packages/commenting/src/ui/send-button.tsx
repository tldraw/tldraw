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
			<svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
				<path
					d="M7.14645 2.14645C7.34171 1.95118 7.65829 1.95118 7.85355 2.14645L11.8536 6.14645C12.0488 6.34171 12.0488 6.65829 11.8536 6.85355C11.6583 7.04882 11.3417 7.04882 11.1464 6.85355L8 3.70711L8 12.5C8 12.7761 7.77614 13 7.5 13C7.22386 13 7 12.7761 7 12.5L7 3.70711L3.85355 6.85355C3.65829 7.04882 3.34171 7.04882 3.14645 6.85355C2.95118 6.65829 2.95118 6.34171 3.14645 6.14645L7.14645 2.14645Z"
					fill="currentColor"
					fillRule="evenodd"
					clipRule="evenodd"
				/>
			</svg>
		</button>
	)
}
