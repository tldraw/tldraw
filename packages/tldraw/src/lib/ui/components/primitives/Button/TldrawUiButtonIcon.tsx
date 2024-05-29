import { TldrawUiIcon } from '../TldrawUiIcon'

/** @public */
export interface TLUiButtonIconProps {
	icon: string
	small?: boolean
	invertIcon?: boolean
}

/** @public */
export function TldrawUiButtonIcon({ icon, small, invertIcon }: TLUiButtonIconProps) {
	return (
		<TldrawUiIcon className="tlui-button__icon" icon={icon} small={small} invertIcon={invertIcon} />
	)
}
