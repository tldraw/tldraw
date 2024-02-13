import { DefaultHelperButtonsContent } from './DefaultHelperButtonsContent'

/** @public */
export type TLUiHelperButtonsProps = {
	children?: any
}

/** @public */
export function DefaultHelperButtons({ children }: TLUiHelperButtonsProps) {
	const content = children ?? <DefaultHelperButtonsContent />
	return <div className="tlui-helper-buttons">{content}</div>
}
