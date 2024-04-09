import { ReactNode } from 'react'

/** @public */
export type TLUiButtonLabelProps = { children?: ReactNode }

/** @public */
export function TldrawUiButtonLabel({ children }: TLUiButtonLabelProps) {
	return <span className="tlui-button__label">{children}</span>
}
