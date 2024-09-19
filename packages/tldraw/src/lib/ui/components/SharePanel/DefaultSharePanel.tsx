import { PeopleMenu } from './PeopleMenu'

/** @public @react */
export function DefaultSharePanel() {
	return (
		<div className="tlui-share-zone" draggable={false}>
			<PeopleMenu />
		</div>
	)
}
