import { useTranslation } from '../../../hooks/useTranslation/useTranslation'
import { TldrawUiIcon } from '../TldrawUiIcon'

/** @public */
export interface TLUiButtonCheckProps {
	checked: boolean
}

/** @public @react */
export function TldrawUiButtonCheck({ checked }: TLUiButtonCheckProps) {
	const msg = useTranslation()
	return (
		<TldrawUiIcon
			label={msg(checked ? 'ui.checked' : 'ui.unchecked')}
			icon={checked ? 'check' : 'none'}
			className="tlui-button__icon"
			small
		/>
	)
}
