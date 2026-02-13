import { TldrawUiIcon, TLUiIconJsx } from '../TldrawUiIcon'

/** @public */
export interface TLUiButtonIconProps {
	icon: string | TLUiIconJsx
	small?: boolean
	invertIcon?: boolean
}

/** @public @react */
export function TldrawUiButtonIcon({ icon, small, invertIcon }: TLUiButtonIconProps) {
	return (
		<TldrawUiIcon
			aria-hidden="true"
			label=""
			className="tlui-button__icon"
			icon={icon}
			small={small}
			invertIcon={invertIcon}
		/>
	)
}
