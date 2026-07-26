import { withCommentingLicense } from '../canvas/license'
/** @public */
export interface SendButtonProps {
	label: string
	disabled?: boolean
	onClick?(): void
}

/** The button that posts a comment. @public @react */
export const SendButton = withCommentingLicense(function SendButton({
	label,
	disabled,
	onClick,
}: SendButtonProps) {
	return (
		<button className="tlui-cmt-send" type="button" disabled={disabled} onClick={onClick}>
			{label}
		</button>
	)
})
