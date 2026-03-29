import { useTldrawUiComponents } from '../../context/components'

/** @public @react */
export function DefaultSharePanel() {
	const { PeopleMenu } = useTldrawUiComponents()

	if (!PeopleMenu) return null

	return (
		<div className="tlui-share-zone" draggable={false}>
			<PeopleMenu />
		</div>
	)
}
