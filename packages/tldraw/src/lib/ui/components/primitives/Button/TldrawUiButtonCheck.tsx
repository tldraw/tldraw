import { TldrawUiIcon } from '../TldrawUiIcon'

/** @public */
export type TLUiButtonCheckProps = { checked: boolean }

/** @public */
export function TldrawUiButtonCheck({ checked }: TLUiButtonCheckProps) {
	return (
		<TldrawUiIcon icon={checked ? 'check' : 'checkbox-empty'} className="tlui-button__icon" small />
	)
}
