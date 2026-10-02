import { defineMessages } from '@tldraw/editor'
import { useTranslation } from '../../../hooks/useTranslation/useTranslation'
import { TldrawUiIcon } from '../TldrawUiIcon'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
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
			label={msg(checked ? messages.uiChecked.id : messages.uiUnchecked.id)}
			icon={checked ? 'check' : 'none'}
			className="tlui-button__icon"
			small
		/>
	)
}
