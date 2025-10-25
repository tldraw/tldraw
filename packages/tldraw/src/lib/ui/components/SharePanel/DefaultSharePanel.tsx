import { PeopleMenu, PeopleMenuProps } from './PeopleMenu'

/** @public */
export interface DefaultSharePanelProps extends PeopleMenuProps {}

/** @public @react */
export function DefaultSharePanel(props: DefaultSharePanelProps) {
	return (
		<div className="tlui-share-zone" draggable={false}>
			<PeopleMenu {...props} />
		</div>
	)
}
