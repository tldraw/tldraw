/** @public */
export type TLUiButtonLabelProps = { children?: any }

/** @public */
export function TldrawUiButtonLabel({ children }: TLUiButtonLabelProps) {
	return <span className="tlui-button__label">{children}</span>
}
