import { TLUiIconType } from '../../../icon-types'
import { TldrawUiIcon } from '../TldrawUiIcon'

/** @public */
export interface TLUiButtonIconProps {
	icon: TLUiIconType
	small?: boolean
	invertIcon?: boolean
}

/** @public @react */
export function TldrawUiButtonIcon({ icon, small, invertIcon }: TLUiButtonIconProps) {
	return (
		<TldrawUiIcon className="tlui-button__icon" icon={icon} small={small} invertIcon={invertIcon} />
	)
}
