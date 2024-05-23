import { TldrawUiIcon } from '../TldrawUiIcon'

/** @public */
export interface TLUiButtonCheckProps {
	checked: boolean
}

/** @public */
export function TldrawUiButtonCheck({ checked }: TLUiButtonCheckProps) {
	return <TldrawUiIcon icon={checked ? 'check' : 'none'} className="tlui-button__icon" small />
}
