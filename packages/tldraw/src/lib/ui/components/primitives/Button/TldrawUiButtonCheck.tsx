import { Icon } from '../Icon'

/** @public */
export type TLUiButtonCheckProps = { checked: boolean }

/** @public */
export function TldrawUiButtonCheck({ checked }: TLUiButtonCheckProps) {
	return <Icon icon={checked ? 'check' : 'checkbox-empty'} className="tlui-button__icon" small />
}
