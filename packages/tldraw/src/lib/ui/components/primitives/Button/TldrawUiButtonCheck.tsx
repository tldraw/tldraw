import { defineMessages } from '@tldraw/editor'
import { useTranslation } from '../../../hooks/useTranslation/useTranslation'
import { TldrawUiIcon } from '../TldrawUiIcon'

const messages = defineMessages({
	uiChecked: { id: 'ui.checked', defaultMessage: 'Checked' },
	uiUnchecked: { id: 'ui.unchecked', defaultMessage: 'Unchecked' },
})

/** @public */
export interface TLUiButtonCheckProps {
	checked: boolean
}

/** @public @react */
export function TldrawUiButtonCheck({ checked }: TLUiButtonCheckProps) {
	const msg = useTranslation()
	return (
		<TldrawUiIcon
			data-checked={!!checked}
			label={msg(checked ? messages.uiChecked : messages.uiUnchecked)}
			icon={checked ? 'check' : 'none'}
			className="tlui-button__icon"
			small
		/>
	)
}
